"""Escolha do provedor de IA por requisição: chave pessoal ou fallback (ADR-0003)."""

from typing import Any, Optional

from google.genai import errors

from app.core.protocols import AccessibilityAIProtocol
from app.schemas.accessibility import AuditReport, ChartVisionResult
from app.services.accessibility_prompts import OCR_PROMPT

KEY_FAILURE_STATUS = {401, 403, 429}


def is_key_failure(exc: errors.ClientError) -> bool:
    """Erro que indica problema com a chave, e não com o conteúdo enviado."""
    if exc.code in KEY_FAILURE_STATUS:
        return True
    return exc.code == 400 and 'API_KEY_INVALID' in str(exc.details)


class FallbackAIClient:
    """Tenta a chave pessoal; se ela falhar, a requisição segue no fallback."""

    def __init__(
        self,
        primary: Optional[AccessibilityAIProtocol],
        fallback: AccessibilityAIProtocol,
    ) -> None:
        self.primary = primary
        self.fallback = fallback
        self.used_fallback = False

    @property
    def is_configured(self) -> bool:
        primary_ready = self.primary is not None and self.primary.is_configured
        return primary_ready or self.fallback.is_configured

    async def _call(self, method: str, *args: Any, **kwargs: Any) -> Any:
        if self.primary is not None and not self.used_fallback:
            try:
                return await getattr(self.primary, method)(*args, **kwargs)
            except errors.ClientError as exc:
                if not is_key_failure(exc):
                    raise
                self.used_fallback = True
        return await getattr(self.fallback, method)(*args, **kwargs)

    async def generate_text(
        self,
        *,
        system_instruction: Optional[str],
        user_text: str,
        temperature: float = 0.15,
    ) -> str:
        return await self._call(
            'generate_text',
            system_instruction=system_instruction,
            user_text=user_text,
            temperature=temperature,
        )

    async def ocr_image(
        self, image_bytes: bytes, mime_type: str, prompt: str = OCR_PROMPT
    ) -> str:
        return await self._call('ocr_image', image_bytes, mime_type, prompt)

    async def analyze_chart(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        context_text: str,
    ) -> ChartVisionResult:
        return await self._call(
            'analyze_chart',
            image_bytes=image_bytes,
            mime_type=mime_type,
            context_text=context_text,
        )

    async def audit(self, original: str, accessible: str) -> AuditReport:
        return await self._call('audit', original, accessible)

    async def correct(self, accessible: str, problems: list[str]) -> str:
        return await self._call('correct', accessible, problems)
