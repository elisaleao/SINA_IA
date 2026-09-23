"""Definições de protocolos e contratos de domínio para injeção de dependências."""

from collections.abc import AsyncIterator
from typing import Optional, Protocol, runtime_checkable

from app.models import AccessibilityConfig, GenerationType, TeacherConfig
from app.schemas.accessibility import (
    AuditReport,
    ChartVisionResult,
    PipelineEvent,
)


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


@runtime_checkable
class AccessibilityAIProtocol(Protocol):
    """Cliente de IA do pipeline: texto, OCR, gráficos, auditoria e correção."""

    @property
    def is_configured(self) -> bool:
        """Indica se o cliente tem credencial para chamar o provedor."""
        ...

    async def generate_text(
        self,
        *,
        system_instruction: Optional[str],
        user_text: str,
        temperature: float = 0.15,
    ) -> str:
        """Gera texto a partir de instruções de sistema e do texto do usuário."""
        ...

    async def ocr_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str = ...,
    ) -> str:
        """Transcreve o texto de uma imagem."""
        ...

    async def analyze_chart(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        context_text: str,
    ) -> ChartVisionResult:
        """Descreve um gráfico da imagem, usando o texto ao redor como contexto."""
        ...

    async def audit(self, original: str, accessible: str) -> AuditReport:
        """Compara o texto acessível com o original e aponta problemas."""
        ...

    async def correct(self, accessible: str, problems: list[str]) -> str:
        """Corrige o texto acessível a partir dos problemas apontados."""
        ...
