import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import settings
from app.models import (
    AccessibilityConfig,
    AccessibilityProfileType,
    GenerationType,
    TeacherConfig,
)
from app.services.llm_service import LLMService
from app.services.tts_service import TTSService


def _gemini(configured: bool = True, reply: str = '') -> MagicMock:
    """GeminiService falso: o LLMService só conhece essa interface."""
    gemini = MagicMock()
    gemini.is_configured = configured
    gemini.generate_text = AsyncMock(return_value=reply)
    return gemini


# LLMService Tests
def test_llm_service_no_api_key():
    """ValueError is raised if API key is not configured."""
    service = LLMService(gemini=_gemini(configured=False))

    with pytest.raises(ValueError, match='GEMINI_API_KEY não configurada.'):
        asyncio.run(
            service.generate_content(
                'teste', GenerationType.SUMMARY, TeacherConfig()
            )
        )


@pytest.mark.asyncio
async def test_llm_service_generate_content():
    """LLMService should format prompts and process responses using MathToSpeechService."""
    gemini = _gemini(reply='Este é um resumo do texto com $\\frac{1}{2}$.')
    service = LLMService(gemini=gemini)

    markdown, spoken = await service.generate_content(
        text='Conteúdo do arquivo',
        gen_type=GenerationType.SUMMARY,
        config=TeacherConfig(
            pedagogical_level='basico',
            math_detail_level='direto',
            tone='formal',
        ),
    )

    assert markdown == 'Este é um resumo do texto com $\\frac{1}{2}$.'
    assert 'fração com numerador 1 e denominador 2' in spoken
    gemini.generate_text.assert_awaited_once()
    kwargs = gemini.generate_text.await_args.kwargs
    assert 'tutor acadêmico' in kwargs['system_instruction']
    assert kwargs['user_text'].endswith('Conteúdo do arquivo')


@pytest.mark.asyncio
async def test_llm_service_generate_text_returns_empty_on_empty_reply():
    gemini = _gemini()
    gemini.generate_text = AsyncMock(
        side_effect=RuntimeError('A IA retornou uma resposta vazia.')
    )
    service = LLMService(gemini=gemini)

    assert not await service.generate_text('gere questões')


@pytest.mark.asyncio
async def test_llm_service_generate_text_requires_api_key():
    service = LLMService(gemini=_gemini(configured=False))
    with pytest.raises(ValueError, match='GEMINI_API_KEY'):
        await service.generate_text('gere questões')


def test_llm_service_build_system_prompt_dyslexia():
    """Build prompt for dyslexia with plain language and glossary."""
    service = LLMService(gemini=_gemini())
    teacher_cfg = TeacherConfig()
    acc_cfg = AccessibilityConfig(
        profile=AccessibilityProfileType.DYSLEXIA,
        plain_language=True,
        include_glossary=True,
    )

    prompt = service._build_system_prompt(teacher_cfg, acc_cfg)
    assert 'Linguagem Simples' in prompt
    assert 'Glossário Acessível' in prompt


def test_llm_service_build_system_prompt_adhd():
    """Build prompt for ADHD with micro-chunks."""
    service = LLMService(gemini=_gemini())
    teacher_cfg = TeacherConfig()
    acc_cfg = AccessibilityConfig(profile=AccessibilityProfileType.ADHD)

    prompt = service._build_system_prompt(teacher_cfg, acc_cfg)
    assert 'TDAH' in prompt
    assert 'micro-blocos' in prompt


def test_llm_service_build_system_prompt_cognitive_and_universal():
    """Build prompt for cognitive support and universal design."""
    service = LLMService(gemini=_gemini())
    teacher_cfg = TeacherConfig()

    cog_cfg = AccessibilityConfig(profile=AccessibilityProfileType.COGNITIVE)
    prompt_cog = service._build_system_prompt(teacher_cfg, cog_cfg)
    assert 'Apoio Cognitivo' in prompt_cog

    uni_cfg = AccessibilityConfig(profile=AccessibilityProfileType.UNIVERSAL)
    prompt_uni = service._build_system_prompt(teacher_cfg, uni_cfg)
    assert 'Adaptação Universal' in prompt_uni


# TTSService Tests
@pytest.mark.asyncio
@pytest.mark.parametrize(
    ('voice', 'expected_voice'),
    [('pt-BR-AntonioNeural', 'pt-BR-AntonioNeural'), (None, 'voz-padrao')],
)
async def test_tts_service_text_to_speech(
    tmp_path, monkeypatch, voice, expected_voice
):
    """Grava em OUTPUT_DIR e usa a voz pedida ou a padrão do Settings."""
    monkeypatch.setattr(settings, 'OUTPUT_DIR', str(tmp_path))
    monkeypatch.setattr(settings, 'EDGE_TTS_VOICE', 'voz-padrao')
    communicate = MagicMock()

    async def fake_save(path: str) -> None:
        with open(path, 'wb') as audio:
            audio.write(b'mp3')

    communicate.save = AsyncMock(side_effect=fake_save)

    with patch(
        'app.services.tts_service.edge_tts.Communicate',
        return_value=communicate,
    ) as communicate_cls:
        filename = await TTSService().text_to_speech(
            'Texto fonético', voice=voice
        )

    assert filename.endswith('.mp3')
    assert (tmp_path / filename).read_bytes() == b'mp3'
    assert communicate_cls.call_args.kwargs['voice'] == expected_voice
