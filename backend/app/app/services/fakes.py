"""Implementações Fake (Mocks) para testes determinísticos sem I/O de rede."""

import os
import uuid
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.models import AccessibilityConfig, GenerationType, TeacherConfig
from app.schemas.accessibility import AuditReport, ChartVisionResult
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

    async def generate_text(self, prompt: str) -> str:
        self.calls.append({'prompt': prompt})
        if self.default_response is not None:
            return self.default_response
        return """[
            {
                "enunciado": "A aceleração da gravidade na Terra é aproximadamente $9.8 m/s^2$.",
                "codigo": null,
                "linguagem": null,
                "resposta_correta": true,
                "explicacao": "Na superfície da Terra, a gravidade padrão é de cerca de 9,8 metros por segundo ao quadrado."
            }
        ]"""


class FakeTTSClient:
    """Fake determinístico para síntese de voz neural sem chamadas ao Edge-TTS."""

    def __init__(self, should_create_file: bool = True):
        self.should_create_file = should_create_file
        self.calls: list[dict] = []

    async def text_to_speech(
        self, text: str, voice: Optional[str] = None
    ) -> str:
        self.calls.append({'text': text, 'voice': voice})
        audio_filename = f'fake-{uuid.uuid4()}.mp3'

        if self.should_create_file:
            audio_path = os.path.join(settings.OUTPUT_DIR, audio_filename)
            with open(audio_path, 'wb') as f:
                f.write(b'fake-mp3-audio-bytes-for-testing')

        return audio_filename


class FakeAccessibilityAI:
    """Fake do GeminiService para o pipeline de acessibilidade."""

    def __init__(self, failure: Optional[Exception] = None):
        self.failure = failure
        self.calls: list[str] = []

    async def generate_text(
        self, *, system_instruction: str, user_text: str, **_: object
    ) -> str:
        self.calls.append('generate_text')
        if self.failure is not None:
            raise self.failure
        return f'Versão acessível: {user_text[:200]}'

    async def ocr_image(self, image_bytes: bytes, mime_type: str) -> str:
        self.calls.append('ocr_image')
        return 'Texto reconhecido na imagem: a derivada de x ao quadrado.'

    async def analyze_chart(self, **_: object) -> ChartVisionResult:
        self.calls.append('analyze_chart')
        return ChartVisionResult(is_chart=False)

    async def audit(self, original: str, accessible: str) -> AuditReport:
        self.calls.append('audit')
        return AuditReport(status='ok')

    async def correct(self, accessible: str, problems: list[str]) -> str:
        self.calls.append('correct')
        return accessible


class FakeEdgeTTS:
    """Fake do TTSService que grava um MP3 de mentira."""

    def __init__(self):
        self.calls: list[str] = []

    async def synthesize(
        self, text: str, output_path: Path, voice: Optional[str] = None
    ) -> None:
        self.calls.append(text)
        Path(output_path).write_bytes(b'fake-mp3-audio-bytes-for-testing')
