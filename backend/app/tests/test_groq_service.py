import base64
import json
from types import SimpleNamespace

import httpx
import openai
import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.core.protocols import AccessibilityAIProtocol
from app.schemas.accessibility import AuditReport, ChartVisionResult
from app.services.accessibility_prompts import AUDITOR_PROMPT, CHART_PROMPT
from app.services.groq_service import GroqService


class FakeCompletions:
    def __init__(self, contents: list[str]):
        self.contents = list(contents)
        self.requests: list[dict] = []

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        message = SimpleNamespace(content=self.contents.pop(0))
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def _service(*contents: str) -> tuple[GroqService, FakeCompletions]:
    completions = FakeCompletions(list(contents))
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    return GroqService(client=client, model='modelo-teste'), completions


@pytest.mark.asyncio
async def test_generate_text_sends_system_and_user_messages():
    service, completions = _service('  Resumo pronto.  ')

    result = await service.generate_text(
        system_instruction='Seja breve.', user_text='Texto da aula'
    )

    assert result == 'Resumo pronto.'
    [request] = completions.requests
    assert request['model'] == 'modelo-teste'
    assert request['messages'] == [
        {'role': 'system', 'content': 'Seja breve.'},
        {'role': 'user', 'content': 'Texto da aula'},
    ]


@pytest.mark.asyncio
async def test_generate_text_without_system_instruction_sends_only_user():
    service, completions = _service('ok')

    await service.generate_text(system_instruction=None, user_text='Oi')

    assert completions.requests[0]['messages'] == [
        {'role': 'user', 'content': 'Oi'}
    ]


@pytest.mark.asyncio
async def test_empty_answer_raises_like_gemini():
    service, _ = _service('   ')

    with pytest.raises(RuntimeError, match='vazia'):
        await service.generate_text(system_instruction=None, user_text='x')


@pytest.mark.asyncio
async def test_ocr_sends_the_image_as_base64_data_url():
    service, completions = _service('Texto da imagem')
    image = b'\x89PNG-bytes'

    result = await service.ocr_image(image, 'image/png', prompt='Transcreva')

    assert result == 'Texto da imagem'
    [message] = completions.requests[0]['messages']
    text_part, image_part = message['content']
    assert text_part == {'type': 'text', 'text': 'Transcreva'}
    expected_url = 'data:image/png;base64,' + base64.b64encode(image).decode()
    assert image_part == {
        'type': 'image_url',
        'image_url': {'url': expected_url},
    }


@pytest.mark.asyncio
async def test_ocr_returns_empty_when_nothing_is_readable():
    service, _ = _service('[SEM_TEXTO_LEGIVEL]')

    result = await service.ocr_image(b'img', 'image/png')

    assert isinstance(result, str)
    assert not result


@pytest.mark.asyncio
async def test_analyze_chart_asks_for_the_chart_schema():
    answer = {
        'is_chart': True,
        'title': 'Vendas',
        'description': 'Barras crescentes',
        'confidence': 0.9,
    }
    service, completions = _service(json.dumps(answer))

    result = await service.analyze_chart(
        image_bytes=b'img', mime_type='image/png', context_text='Figura 1'
    )

    assert result == ChartVisionResult(**answer)
    request = completions.requests[0]
    schema = request['response_format']['json_schema']
    assert request['response_format']['type'] == 'json_schema'
    assert schema['schema'] == ChartVisionResult.model_json_schema()
    prompt = request['messages'][0]['content'][0]['text']
    assert prompt.startswith(CHART_PROMPT)
    assert 'Figura 1' in prompt


@pytest.mark.asyncio
async def test_audit_asks_for_the_audit_schema():
    answer = {
        'status': 'problemas_encontrados',
        'itens': [{'problema': 'Faltou a fórmula'}],
    }
    service, completions = _service(json.dumps(answer))

    result = await service.audit('original', 'acessível')

    assert result == AuditReport(**answer)
    request = completions.requests[0]
    assert request['messages'][0] == {
        'role': 'system',
        'content': AUDITOR_PROMPT,
    }
    assert (
        request['response_format']['json_schema']['schema']
        == AuditReport.model_json_schema()
    )


@pytest.mark.asyncio
async def test_structured_answer_off_schema_is_rejected():
    service, _ = _service(json.dumps({'status': 'talvez'}))

    with pytest.raises(ValidationError):
        await service.audit('original', 'acessível')


@pytest.mark.asyncio
async def test_correct_lists_the_problems_to_fix():
    service, completions = _service('Texto corrigido')

    result = await service.correct('Texto', ['Erro A', 'Erro B'])

    assert result == 'Texto corrigido'
    user_text = completions.requests[0]['messages'][-1]['content']
    assert '1. Erro A' in user_text
    assert '2. Erro B' in user_text


@pytest.mark.asyncio
async def test_without_api_key_it_is_not_configured(monkeypatch):
    monkeypatch.setattr(settings, 'GROQ_API_KEY', '')
    service = GroqService()

    assert service.is_configured is False
    with pytest.raises(RuntimeError, match='GROQ_API_KEY'):
        await service.generate_text(system_instruction=None, user_text='x')


def test_with_api_key_it_is_configured(monkeypatch):
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'gsk_teste')

    assert GroqService().is_configured is True


def test_conforms_to_the_ai_protocol():
    service, _ = _service()

    assert isinstance(service, AccessibilityAIProtocol)


class RateLimitedCompletions:
    """Answers 429 a few times before the real content, like the free tier."""

    def __init__(self, failures: int, retry_after: str | None = '7'):
        self.failures = failures
        self.retry_after = retry_after
        self.requests: list[dict] = []

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        if self.failures:
            self.failures -= 1
            headers = (
                {'retry-after': self.retry_after} if self.retry_after else {}
            )
            response = httpx.Response(
                429,
                headers=headers,
                request=httpx.Request('POST', 'https://api.groq.com'),
            )
            raise openai.RateLimitError(
                'Rate limit reached', response=response, body=None
            )
        message = SimpleNamespace(content='Texto pronto.')
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def _rate_limited_service(completions, sleeps):
    async def fake_sleep(seconds):
        sleeps.append(seconds)

    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    return GroqService(client=client, model='modelo-teste', sleep=fake_sleep)


@pytest.mark.asyncio
async def test_every_call_caps_the_output_tokens():
    # The free tier refuses a request whose expected output is above its
    # per-minute output budget; an explicit cap keeps every call acceptable.
    service, completions = _service('ok')

    await service.generate_text(system_instruction=None, user_text='Oi')

    assert (
        completions.requests[0]['max_completion_tokens']
        == settings.GROQ_MAX_OUTPUT_TOKENS
    )


@pytest.mark.asyncio
async def test_rate_limit_waits_the_time_groq_asks_and_tries_again():
    sleeps: list[float] = []
    completions = RateLimitedCompletions(failures=2, retry_after='7')
    service = _rate_limited_service(completions, sleeps)

    result = await service.generate_text(
        system_instruction=None, user_text='Oi'
    )

    assert result == 'Texto pronto.'
    assert sleeps == [7.0, 7.0]
    assert len(completions.requests) == 3


@pytest.mark.asyncio
async def test_rate_limit_without_retry_after_waits_the_default():
    sleeps: list[float] = []
    completions = RateLimitedCompletions(failures=1, retry_after=None)
    service = _rate_limited_service(completions, sleeps)

    await service.generate_text(system_instruction=None, user_text='Oi')

    assert sleeps == [float(settings.GROQ_RATE_LIMIT_WAIT_SECONDS)]


@pytest.mark.asyncio
async def test_rate_limit_gives_up_after_the_last_attempt():
    sleeps: list[float] = []
    completions = RateLimitedCompletions(
        failures=settings.GROQ_RATE_LIMIT_RETRIES + 1
    )
    service = _rate_limited_service(completions, sleeps)

    with pytest.raises(openai.RateLimitError):
        await service.generate_text(system_instruction=None, user_text='Oi')

    assert len(sleeps) == settings.GROQ_RATE_LIMIT_RETRIES
