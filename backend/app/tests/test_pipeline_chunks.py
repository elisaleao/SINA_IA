import pytest

from app.core.config import settings
from app.schemas.accessibility import AuditItem, AuditReport, ChartVisionResult
from app.services.accessibility_pipeline import AccessibilityPipeline
from app.services.document_extractor import DocumentExtractor
from app.services.fakes import FakeEdgeTTS
from app.services.file_store import GeneratedFileStore


class RecordingAI:
    """Converts each part and flags a problem only in the second part."""

    is_configured = True

    def __init__(self):
        self.converted: list[str] = []
        self.audited: list[tuple[str, str]] = []
        self.corrected: list[str] = []

    async def generate_text(
        self, *, system_instruction, user_text, temperature=0.15
    ):
        self.converted.append(user_text)
        return f'[acessível {len(self.converted)}]'

    async def audit(self, original, accessible):
        self.audited.append((original, accessible))
        if accessible == '[acessível 2]':
            return AuditReport(
                status='problemas_encontrados',
                itens=[AuditItem(problema='Faltou um número.')],
            )
        return AuditReport(status='ok')

    async def correct(self, accessible, problems):
        self.corrected.append(accessible)
        return accessible + ' corrigido'

    async def ocr_image(self, *args, **kwargs):
        return ''

    async def analyze_chart(self, **kwargs):
        return ChartVisionResult(is_chart=False)


async def _run(tmp_path, text: str):
    ai = RecordingAI()
    pipeline = AccessibilityPipeline(
        ai=ai,
        tts=FakeEdgeTTS(),
        store=GeneratedFileStore(tmp_path, expires=False),
        extractor=DocumentExtractor(ai, max_visual_candidates=0),
    )
    events = [
        event
        async for event in pipeline.run(
            filename='aula.txt', data=text.encode(), level=2
        )
    ]
    return ai, events


@pytest.mark.asyncio
async def test_long_material_is_converted_audited_and_fixed_part_by_part(
    tmp_path, monkeypatch
):
    # The free AI refuses big answers; each part must fit its per-minute
    # output budget, and every part keeps its own audit and correction.
    monkeypatch.setattr(settings, 'AI_CHUNK_CHARS', 60)
    text = '\n\n'.join(['a' * 50, 'b' * 50, 'c' * 50])

    ai, events = await _run(tmp_path, text)

    [result] = [e.result for e in events if e.type == 'result']
    assert ai.converted == ['a' * 50, 'b' * 50, 'c' * 50]
    assert [original for original, _ in ai.audited] == ai.converted
    assert ai.corrected == ['[acessível 2]']
    assert result.accessible_text == (
        '[acessível 1]\n\n[acessível 2] corrigido\n\n[acessível 3]'
    )
    assert result.audit.status == 'problemas_encontrados'
    assert [item.problema for item in result.audit.itens] == [
        'Faltou um número.'
    ]


@pytest.mark.asyncio
async def test_short_material_is_converted_in_a_single_call(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, 'AI_CHUNK_CHARS', 10_000)

    ai, events = await _run(tmp_path, 'Um texto curto de aula.')

    [result] = [e.result for e in events if e.type == 'result']
    assert ai.converted == ['Um texto curto de aula.']
    assert result.accessible_text == '[acessível 1]'
    assert result.audit.status == 'ok'
