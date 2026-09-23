from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.accessibility import AuditReport, ChartVisionResult
from app.services.accessibility_prompts import (
    AUDITOR_PROMPT,
    CHART_PROMPT,
    CORRECTOR_PROMPT,
    OCR_PROMPT,
)

RETRY_ON_TRANSIENT_ERRORS = types.HttpOptions(
    retry_options=types.HttpRetryOptions(
        attempts=4,
        max_delay=10,
        http_status_codes=[429, 500, 502, 503, 504],
    )
)


class GeminiService:
    """Único ponto de acesso ao Google Gemini (assíncrono); a chave fica no backend."""

    def __init__(
        self,
        client: Optional[genai.Client] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.model = model or settings.GEMINI_MODEL
        if client:
            self.client = client
        else:
            resolved_key = api_key or settings.GEMINI_API_KEY
            self.client = (
                genai.Client(
                    api_key=resolved_key,
                    http_options=RETRY_ON_TRANSIENT_ERRORS,
                )
                if resolved_key
                else None
            )

    @property
    def is_configured(self) -> bool:
        return self.client is not None

    def _ensure_client(self) -> genai.Client:
        if not self.client:
            raise RuntimeError(
                'GEMINI_API_KEY não configurada no backend/app/.env.'
            )
        return self.client

    async def generate_text(
        self,
        *,
        system_instruction: Optional[str],
        user_text: str,
        temperature: float = 0.15,
    ) -> str:
        client = self._ensure_client()
        response = await client.aio.models.generate_content(
            model=self.model,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=32768,
            ),
        )
        text = (response.text or '').strip()
        if not text:
            raise RuntimeError('A IA retornou uma resposta vazia.')
        return text

    async def ocr_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str = OCR_PROMPT,
    ) -> str:
        client = self._ensure_client()
        response = await client.aio.models.generate_content(
            model=self.model,
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=16384,
            ),
        )
        text = (response.text or '').strip()
        if text == '[SEM_TEXTO_LEGIVEL]':
            return ''
        return text

    async def analyze_chart(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        context_text: str,
    ) -> ChartVisionResult:
        prompt = (
            CHART_PROMPT
            + '\n\nTEXTO PRÓXIMO/CONTEXTO DO DOCUMENTO:\n'
            + context_text[:6000]
        )
        client = self._ensure_client()
        response = await client.aio.models.generate_content(
            model=self.model,
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type='application/json',
                response_schema=ChartVisionResult,
            ),
        )
        if response.parsed:
            return response.parsed
        return ChartVisionResult.model_validate_json(response.text or '{}')

    async def audit(self, original: str, accessible: str) -> AuditReport:
        client = self._ensure_client()
        response = await client.aio.models.generate_content(
            model=self.model,
            contents=(
                f'TEXTO ORIGINAL EXTRAÍDO:\n{original}\n\n---\n\n'
                f'TEXTO ACESSÍVEL GERADO:\n{accessible}'
            ),
            config=types.GenerateContentConfig(
                system_instruction=AUDITOR_PROMPT,
                temperature=0.0,
                response_mime_type='application/json',
                response_schema=AuditReport,
            ),
        )
        if response.parsed:
            return response.parsed
        return AuditReport.model_validate_json(response.text or '{}')

    async def correct(self, accessible: str, problems: list[str]) -> str:
        problem_list = '\n'.join(
            f'{index}. {problem}'
            for index, problem in enumerate(problems, start=1)
        )
        return await self.generate_text(
            system_instruction=CORRECTOR_PROMPT,
            user_text=(
                f'TEXTO ACESSÍVEL ATUAL:\n{accessible}\n\n---\n\n'
                f'PROBLEMAS A CORRIGIR:\n{problem_list}'
            ),
            temperature=0.0,
        )
