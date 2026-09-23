"""Ingestão síncrona usada por /api/documents/upload.

A extração é a mesma do pipeline de acessibilidade (DocumentExtractor);
aqui só se acrescentam a lista de equações e a versão falada do texto.
"""

import asyncio
import re
from pathlib import Path

from app.core.protocols import AccessibilityAIProtocol
from app.services.document_extractor import DocumentExtractor
from app.services.math_speech_service import MathToSpeechService

# OCR que devolve fórmulas em LaTeX delimitado, para a conversão em fala
INGESTION_OCR_PROMPT = """Transcreva o documento nesta imagem em formato Markdown limpo.
Regras Estritas para Acessibilidade:
1. Todas as equações e cálculos matemáticos DEVEM ser escritas em sintaxe LaTeX válida ($...$ para inline e $$...$$ para bloco).
2. Para tabelas, use Markdown formatado com cabeçalho.
3. Para diagramas ou esquemas gráficos, crie uma descrição textual detalhada (alt-text)."""

OCR_UNAVAILABLE_MESSAGE = (
    'Texto extraído via OCR indisponível (requer GEMINI_API_KEY no backend).'
)
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
_EQUATION = re.compile(r'\$\$(.*?)\$\$|\$(.*?)\$', re.DOTALL)


class IngestionService:
    def __init__(
        self,
        gemini: AccessibilityAIProtocol,
        extractor: DocumentExtractor,
    ):
        self.gemini = gemini
        self.extractor = extractor

    async def process_file(
        self, file_path: str, filename: str
    ) -> tuple[str, str, list[str]]:
        """Devolve (markdown, texto falado, equações encontradas)."""
        data = await asyncio.to_thread(Path(file_path).read_bytes)
        extraction = await self.extractor.extract(filename, data)
        markdown_text = extraction.text

        is_image = Path(filename).suffix.lower() in IMAGE_EXTENSIONS
        if is_image and not markdown_text and not self.gemini.is_configured:
            markdown_text = OCR_UNAVAILABLE_MESSAGE

        equations = [
            inline or block
            for block, inline in _EQUATION.findall(markdown_text)
            if inline or block
        ]
        accessible_text = MathToSpeechService.latex_to_spoken_portuguese(
            markdown_text
        )
        return markdown_text, accessible_text, equations
