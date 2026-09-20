"""Definições de protocolos e contratos de domínio para injeção de dependências."""

from typing import Optional, Protocol

from app.models import AccessibilityConfig, GenerationType, TeacherConfig


class LLMClientProtocol(Protocol):
    """Protocolo abstrato para clientes de geração de conteúdo e tutoria com LLM."""

    async def generate_content(
        self,
        text: str,
        gen_type: GenerationType,
        config: TeacherConfig,
        accessibility: Optional[AccessibilityConfig] = None,
    ) -> tuple[str, str]:
        """Gera conteúdo didático adaptado retornando (markdown_output, spoken_output)."""
        ...


class TTSClientProtocol(Protocol):
    """Protocolo abstrato para clientes de síntese de voz neural (Text-to-Speech)."""

    async def text_to_speech(
        self, text: str, voice: str = 'pt-BR-AntonioNeural'
    ) -> str:
        """Sintetiza texto falado em arquivo de áudio e retorna o filename relativo gerado."""
        ...
