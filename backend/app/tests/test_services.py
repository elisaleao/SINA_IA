import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from models import (
    AccessibilityConfig,
    AccessibilityProfileType,
    GenerationType,
    TeacherConfig,
)

from app.services.audio_service import AudioService
from app.services.llm_service import LLMService


# LLMService Tests
def test_llm_service_no_api_key():
    """ValueError is raised if API key is not configured."""
    with patch('app.services.llm_service.settings') as mock_settings:
        mock_settings.GEMINI_API_KEY = None
        service = LLMService()

        with pytest.raises(
            ValueError, match='GEMINI_API_KEY não configurada.'
        ):
            asyncio.run(
                service.generate_content(
                    'teste', GenerationType.SUMMARY, TeacherConfig()
                )
            )


@pytest.mark.asyncio
async def test_llm_service_generate_content():
    """LLMService should format prompts and process responses using MathToSpeechService."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = 'Este é um resumo do texto com $\\frac{1}{2}$.'
    mock_client.models.generate_content.return_value = mock_response

    with (
        patch(
            'app.services.llm_service.genai.Client', return_value=mock_client
        ),
        patch('app.services.llm_service.settings') as mock_settings,
    ):
        mock_settings.GEMINI_API_KEY = 'dummy_key'

        service = LLMService()
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
        mock_client.models.generate_content.assert_called_once()


def test_llm_service_build_system_prompt_dyslexia():
    """Build prompt for dyslexia with plain language and glossary."""
    service = LLMService()
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
    service = LLMService()
    teacher_cfg = TeacherConfig()
    acc_cfg = AccessibilityConfig(profile=AccessibilityProfileType.ADHD)

    prompt = service._build_system_prompt(teacher_cfg, acc_cfg)
    assert 'TDAH' in prompt
    assert 'micro-blocos' in prompt


def test_llm_service_build_system_prompt_cognitive_and_universal():
    """Build prompt for cognitive support and universal design."""
    service = LLMService()
    teacher_cfg = TeacherConfig()

    cog_cfg = AccessibilityConfig(profile=AccessibilityProfileType.COGNITIVE)
    prompt_cog = service._build_system_prompt(teacher_cfg, cog_cfg)
    assert 'Apoio Cognitivo' in prompt_cog

    uni_cfg = AccessibilityConfig(profile=AccessibilityProfileType.UNIVERSAL)
    prompt_uni = service._build_system_prompt(teacher_cfg, uni_cfg)
    assert 'Adaptação Universal' in prompt_uni


# AudioService Tests
@pytest.mark.asyncio
async def test_audio_service_text_to_speech():
    """AudioService should call edge_tts Communicate and save the file."""
    mock_communicate = MagicMock()
    mock_communicate.save = AsyncMock()

    with (
        patch(
            'app.services.audio_service.edge_tts.Communicate',
            return_value=mock_communicate,
        ) as mock_comm_cls,
        patch('app.services.audio_service.settings') as mock_settings,
    ):
        mock_settings.OUTPUT_DIR = '/dummy/dir'

        filename = await AudioService.text_to_speech(
            'Texto fonético', voice='pt-BR-AntonioNeural'
        )

        assert filename.endswith('.mp3')
        mock_comm_cls.assert_called_once_with(
            'Texto fonético', 'pt-BR-AntonioNeural'
        )
        mock_communicate.save.assert_called_once()
