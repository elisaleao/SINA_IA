"""IA gratuita de fallback: Groq pela API compatível com OpenAI (ADR-0003)."""

import asyncio
import base64
import logging
from typing import Any, Awaitable, Callable, Optional, TypeVar

from openai import AsyncOpenAI, RateLimitError
from pydantic import BaseModel

from app.core.config import settings
from app.schemas.accessibility import AuditReport, ChartVisionResult
from app.services.accessibility_prompts import (
    AUDITOR_PROMPT,
    CHART_PROMPT,
    CORRECTOR_PROMPT,
    OCR_PROMPT,
)

GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

logger = logging.getLogger(__name__)
MAX_WAIT_SECONDS = 120.0

Model = TypeVar('Model', bound=BaseModel)


class GroqService:
    """Mesma superfície do GeminiService, sobre o tier gratuito do Groq."""

    def __init__(
        self,
        client: Optional[Any] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        sleep: Callable[[float], Awaitable[Any]] = asyncio.sleep,
    ) -> None:
        self.model = model or settings.GROQ_MODEL
        self._sleep = sleep
        if client:
            self.client = client
        else:
            resolved_key = api_key or settings.GROQ_API_KEY
            self.client = (
                AsyncOpenAI(
                    api_key=resolved_key,
                    base_url=GROQ_BASE_URL,
                    max_retries=0,
                )
                if resolved_key
                else None
            )

    @property
    def is_configured(self) -> bool:
        return self.client is not None

    def _ensure_client(self) -> Any:
        if not self.client:
            raise RuntimeError(
                'GROQ_API_KEY não configurada no backend/app/.env.'
            )
        return self.client

    async def _complete(
        self,
        messages: list[dict],
        *,
        temperature: float,
        response_format: Optional[dict] = None,
    ) -> str:
        options: dict[str, Any] = {}
        if response_format is not None:
            options['response_format'] = response_format
        client = self._ensure_client()
        attempt = 0
        while True:
            try:
                response = await client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_completion_tokens=settings.GROQ_MAX_OUTPUT_TOKENS,
                    **options,
                )
                return (response.choices[0].message.content or '').strip()
            except RateLimitError as exc:
                if attempt >= settings.GROQ_RATE_LIMIT_RETRIES:
                    raise
                attempt += 1
                wait = self._retry_after(exc)
                logger.warning(
                    'Groq pediu para esperar %.0f s (tentativa %d).',
                    wait,
                    attempt,
                )
                await self._sleep(wait)

    @staticmethod
    def _retry_after(exc: RateLimitError) -> float:
        default = settings.GROQ_RATE_LIMIT_WAIT_SECONDS
        header = exc.response.headers.get('retry-after')
        try:
            wait = float(header) if header else default
        except ValueError:
            wait = default
        return min(wait, MAX_WAIT_SECONDS)

    async def _structured(
        self, messages: list[dict], schema: type[Model]
    ) -> Model:
        content = await self._complete(
            messages,
            temperature=0.0,
            response_format={
                'type': 'json_schema',
                'json_schema': {
                    'name': schema.__name__,
                    'strict': False,
                    'schema': schema.model_json_schema(),
                },
            },
        )
        return schema.model_validate_json(content or '{}')

    @staticmethod
    def _image_message(
        prompt: str, image_bytes: bytes, mime_type: str
    ) -> dict:
        encoded = base64.b64encode(image_bytes).decode()
        return {
            'role': 'user',
            'content': [
                {'type': 'text', 'text': prompt},
                {
                    'type': 'image_url',
                    'image_url': {'url': f'data:{mime_type};base64,{encoded}'},
                },
            ],
        }

    async def generate_text(
        self,
        *,
        system_instruction: Optional[str],
        user_text: str,
        temperature: float = 0.15,
    ) -> str:
        messages = []
        if system_instruction:
            messages.append({'role': 'system', 'content': system_instruction})
        messages.append({'role': 'user', 'content': user_text})
        text = await self._complete(messages, temperature=temperature)
        if not text:
            raise RuntimeError('A IA retornou uma resposta vazia.')
        return text

    async def ocr_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str = OCR_PROMPT,
    ) -> str:
        text = await self._complete(
            [self._image_message(prompt, image_bytes, mime_type)],
            temperature=0.0,
        )
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
        return await self._structured(
            [self._image_message(prompt, image_bytes, mime_type)],
            ChartVisionResult,
        )

    async def audit(self, original: str, accessible: str) -> AuditReport:
        return await self._structured(
            [
                {'role': 'system', 'content': AUDITOR_PROMPT},
                {
                    'role': 'user',
                    'content': (
                        f'TEXTO ORIGINAL EXTRAÍDO:\n{original}\n\n---\n\n'
                        f'TEXTO ACESSÍVEL GERADO:\n{accessible}'
                    ),
                },
            ],
            AuditReport,
        )

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
