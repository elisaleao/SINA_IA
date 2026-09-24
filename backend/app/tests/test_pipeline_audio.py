import pytest

from app.schemas.accessibility import AuditReport, ChartVisionResult
from app.services.accessibility_pipeline import AccessibilityPipeline
from app.services.document_extractor import DocumentExtractor
from app.services.fakes import FakeEdgeTTS
from app.services.file_store import GeneratedFileStore


class LatexAI:
    """Answers with LaTeX, as the AI sometimes does despite the prompt."""

    is_configured = True

    async def generate_text(self, **kwargs):
        return 'A derivada de $x^2$ é $2x$.'

    async def audit(self, original, accessible):
        return AuditReport(status='ok')

    async def correct(self, accessible, problems):
        return accessible

    async def ocr_image(self, *args, **kwargs):
        return ''

    async def analyze_chart(self, **kwargs):
        return ChartVisionResult(is_chart=False)


@pytest.mark.asyncio
async def test_audio_reads_formulas_in_full_and_screen_keeps_latex(tmp_path):
    # The screen renders LaTeX with KaTeX; the voice must not spell "$x^2$".
    ai = LatexAI()
    tts = FakeEdgeTTS()
    pipeline = AccessibilityPipeline(
        ai=ai,
        tts=tts,
        store=GeneratedFileStore(tmp_path, expires=False),
        extractor=DocumentExtractor(ai, max_visual_candidates=0),
    )

    events = [
        e
        async for e in pipeline.run(
            filename='aula.txt', data=b'Derivadas.', level=2
        )
    ]

    [result] = [e.result for e in events if e.type == 'result']
    assert result.accessible_text == 'A derivada de $x^2$ é $2x$.'
    assert tts.calls == ['A derivada de x ao quadrado é 2x.']
