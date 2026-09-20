"""Implementações Fake (Mocks) para testes determinísticos sem I/O de rede."""

import os
import uuid
from typing import Optional

from app.core.config import settings
from app.models import AccessibilityConfig, GenerationType, TeacherConfig
from app.services.math_speech_service import MathToSpeechService


class FakeLLMClient:
    """Fake determinístico para geração de conteúdo didático sem chamadas à Google Gemini."""

    def __init__(self, default_response: Optional[str] = None):
        self.default_response = default_response
        self.calls: list[dict] = []

    async def generate_content(
        self,
        text: str,
        gen_type: GenerationType,
        config: TeacherConfig,
        accessibility: Optional[AccessibilityConfig] = None,
    ) -> tuple[str, str]:
        self.calls.append({
            'text': text,
            'gen_type': gen_type,
            'config': config,
            'accessibility': accessibility,
        })

        if self.default_response is not None:
            output_markdown = self.default_response
        else:
            profile_name = (
                accessibility.profile.value if accessibility else 'default'
            )
            output_markdown = (
                f'# Resumo Didático ({profile_name})\n'
                f'Conteúdo processado: {text[:100]}\n'
                f'Nível pedagógico: {config.pedagogical_level}\n'
                'Expressão matemática: $x^2 + 1 = 0$'
            )

        spoken_output = MathToSpeechService.latex_to_spoken_portuguese(
            output_markdown
        )
        return output_markdown, spoken_output


class FakeTTSClient:
    """Fake determinístico para síntese de voz neural sem chamadas ao Edge-TTS."""

    def __init__(self, should_create_file: bool = True):
        self.should_create_file = should_create_file
        self.calls: list[dict] = []

    async def text_to_speech(
        self, text: str, voice: str = 'pt-BR-AntonioNeural'
    ) -> str:
        self.calls.append({'text': text, 'voice': voice})
        audio_filename = f'fake-{uuid.uuid4()}.mp3'

        if self.should_create_file:
            audio_path = os.path.join(settings.OUTPUT_DIR, audio_filename)
            with open(audio_path, 'wb') as f:
                f.write(b'fake-mp3-audio-bytes-for-testing')

        return audio_filename
