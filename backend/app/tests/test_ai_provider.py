import pytest
from google.genai import errors

from app.core.protocols import AccessibilityAIProtocol
from app.schemas.accessibility import AuditReport, ChartVisionResult
from app.services.accessibility_prompts import OCR_PROMPT
from app.services.ai_provider import FallbackAIClient

CALLS = [
    ('generate_text', (), {'system_instruction': None, 'user_text': 'x'}),
    ('ocr_image', (b'img', 'image/png'), {}),
    (
        'analyze_chart',
        (),
        {'image_bytes': b'img', 'mime_type': 'image/png', 'context_text': ''},
    ),
    ('audit', ('original', 'acessível'), {}),
    ('correct', ('texto', ['problema']), {}),
]

RESULTS = {
    'generate_text': 'texto',
    'ocr_image': 'ocr',
    'analyze_chart': ChartVisionResult(is_chart=True),
    'audit': AuditReport(status='ok'),
    'correct': 'corrigido',
}


def _client_error(code: int, reason: str = 'X') -> errors.ClientError:
    return errors.ClientError(
        code,
        {
            'error': {
                'code': code,
                'message': 'erro',
                'status': 'X',
                'details': [{'reason': reason}],
            }
        },
    )


class Provider:
    def __init__(self, name: str, error: Exception | None = None):
        self.name = name
        self.error = error
        self.calls: list[str] = []
        self.is_configured = True

    async def _answer(self, method: str):
        self.calls.append(method)
        if self.error is not None:
            raise self.error
        return (self.name, RESULTS[method])

    async def generate_text(self, **_):
        return await self._answer('generate_text')

    async def ocr_image(self, *_, **__):
        return await self._answer('ocr_image')

    async def analyze_chart(self, **_):
        return await self._answer('analyze_chart')

    async def audit(self, *_):
        return await self._answer('audit')

    async def correct(self, *_):
        return await self._answer('correct')


async def _call(client, method, args, kwargs):
    return await getattr(client, method)(*args, **kwargs)


@pytest.mark.asyncio
@pytest.mark.parametrize(('method', 'args', 'kwargs'), CALLS)
async def test_without_personal_key_only_the_fallback_is_used(
    method, args, kwargs
):
    groq = Provider('groq')
    client = FallbackAIClient(primary=None, fallback=groq)

    result = await _call(client, method, args, kwargs)

    assert result == ('groq', RESULTS[method])
    assert client.used_fallback is False


@pytest.mark.asyncio
@pytest.mark.parametrize(('method', 'args', 'kwargs'), CALLS)
async def test_working_personal_key_never_touches_the_fallback(
    method, args, kwargs
):
    gemini, groq = Provider('gemini'), Provider('groq')
    client = FallbackAIClient(primary=gemini, fallback=groq)

    result = await _call(client, method, args, kwargs)

    assert result == ('gemini', RESULTS[method])
    assert groq.calls == []
    assert client.used_fallback is False


@pytest.mark.asyncio
@pytest.mark.parametrize(('method', 'args', 'kwargs'), CALLS)
@pytest.mark.parametrize(
    'error',
    [
        _client_error(401),
        _client_error(403),
        _client_error(429),
        _client_error(400, 'API_KEY_INVALID'),
    ],
    ids=['401', '403', '429', '400-api-key-invalid'],
)
async def test_personal_key_failure_falls_back_in_the_same_call(
    method, args, kwargs, error
):
    gemini, groq = Provider('gemini', error), Provider('groq')
    client = FallbackAIClient(primary=gemini, fallback=groq)

    result = await _call(client, method, args, kwargs)

    assert result == ('groq', RESULTS[method])
    assert gemini.calls == [method]
    assert groq.calls == [method]
    assert client.used_fallback is True


@pytest.mark.asyncio
@pytest.mark.parametrize(
    'error',
    [_client_error(400, 'INVALID_IMAGE'), _client_error(404), ValueError()],
    ids=['400-generic', '404', 'value-error'],
)
async def test_other_errors_surface_without_fallback(error):
    gemini, groq = Provider('gemini', error), Provider('groq')
    client = FallbackAIClient(primary=gemini, fallback=groq)

    with pytest.raises(type(error)):
        await client.generate_text(system_instruction=None, user_text='x')

    assert groq.calls == []
    assert client.used_fallback is False


@pytest.mark.asyncio
async def test_after_a_key_failure_the_request_stays_on_the_fallback():
    gemini = Provider('gemini', _client_error(401))
    groq = Provider('groq')
    client = FallbackAIClient(primary=gemini, fallback=groq)

    await client.generate_text(system_instruction=None, user_text='x')
    await client.audit('original', 'acessível')

    assert gemini.calls == ['generate_text']
    assert groq.calls == ['generate_text', 'audit']
    assert client.used_fallback is True


@pytest.mark.asyncio
async def test_fallback_error_surfaces_unchanged():
    gemini = Provider('gemini', _client_error(401))
    groq = Provider('groq', RuntimeError('Groq indisponível'))
    client = FallbackAIClient(primary=gemini, fallback=groq)

    with pytest.raises(RuntimeError, match='Groq indisponível'):
        await client.generate_text(system_instruction=None, user_text='x')


@pytest.mark.asyncio
async def test_ocr_prompt_reaches_the_provider():
    received = []

    class Recorder(Provider):
        async def ocr_image(self, image_bytes, mime_type, prompt):
            received.append(prompt)
            return ''

    client = FallbackAIClient(
        primary=Recorder('gemini'), fallback=Provider('g')
    )

    await client.ocr_image(b'img', 'image/png', 'Prompt da ingestão')
    await client.ocr_image(b'img', 'image/png')

    assert received == ['Prompt da ingestão', OCR_PROMPT]


def test_is_configured_when_any_provider_is():
    groq = Provider('groq')
    groq.is_configured = False

    assert FallbackAIClient(primary=None, fallback=groq).is_configured is False
    assert (
        FallbackAIClient(
            primary=Provider('gemini'), fallback=groq
        ).is_configured
        is True
    )


def test_conforms_to_the_ai_protocol():
    client = FallbackAIClient(primary=None, fallback=Provider('groq'))

    assert isinstance(client, AccessibilityAIProtocol)
