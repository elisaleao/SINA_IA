"""Definições de protocolos e contratos de domínio para injeção de dependências."""

from collections.abc import AsyncIterator
from typing import Optional, Protocol

from app.models import AccessibilityConfig, GenerationType, TeacherConfig
from app.schemas.accessibility import PipelineEvent


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

    async def generate_text(self, prompt: str) -> str:
        """Gera texto puro a partir de um prompt arbitrário."""
        ...


class TTSClientProtocol(Protocol):
    """Protocolo abstrato para clientes de síntese de voz neural (Text-to-Speech)."""

    async def text_to_speech(
        self, text: str, voice: Optional[str] = None
    ) -> str:
        """Sintetiza texto falado em arquivo de áudio e retorna o filename relativo gerado."""
        ...


class DocumentPipelineProtocol(Protocol):
    """Protocolo do pipeline que transforma um documento em material acessível."""

    def run(
        self,
        *,
        filename: str,
        data: bytes,
        level: int,
    ) -> AsyncIterator[PipelineEvent]:
        """Emite eventos de cada etapa e termina com o resultado ou um erro."""
        ...
