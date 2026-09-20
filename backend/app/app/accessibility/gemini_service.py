from __future__ import annotations

import os

from google import genai
from google.genai import types

from .prompts import AUDITOR_PROMPT, CHART_PROMPT, CORRECTOR_PROMPT, OCR_PROMPT
from .schemas import AuditReport, ChartVisionResult


class GeminiAccessibilityService:
    """Centraliza todas as chamadas à IA; nenhuma chave fica no navegador."""

    def __init__(self) -> None:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise RuntimeError(
                'GEMINI_API_KEY não configurada no backend/app/.env.'
            )
        self.model = os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')
        self.client = genai.Client(api_key=api_key)

    async def generate_text(
        self,
        *,
        system_instruction: str,
        user_text: str,
        temperature: float = 0.15,
    ) -> str:
        response = await self.client.aio.models.generate_content(
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

    async def ocr_image(self, image_bytes: bytes, mime_type: str) -> str:
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[
                OCR_PROMPT,
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
        response = await self.client.aio.models.generate_content(
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
        response = await self.client.aio.models.generate_content(
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
