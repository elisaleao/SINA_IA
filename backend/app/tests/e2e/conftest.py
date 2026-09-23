from types import SimpleNamespace

import pytest

from app.api.deps import get_material_pipeline, get_material_storage
from app.main import app
from app.services.accessibility_pipeline import AccessibilityPipeline
from app.services.document_extractor import DocumentExtractor
from app.services.fakes import FakeAccessibilityAI, FakeEdgeTTS
from app.services.material_service import MaterialStorage


@pytest.fixture
def backend(client, tmp_path):
    state = SimpleNamespace(
        ai=FakeAccessibilityAI(),
        tts=FakeEdgeTTS(),
        storage=MaterialStorage(tmp_path / 'materiais'),
    )

    def pipeline() -> AccessibilityPipeline:
        return AccessibilityPipeline(
            ai=state.ai,
            tts=state.tts,
            store=state.storage.results,
            extractor=DocumentExtractor(state.ai, max_visual_candidates=4),
        )

    app.dependency_overrides[get_material_storage] = lambda: state.storage
    app.dependency_overrides[get_material_pipeline] = pipeline
    return state


@pytest.fixture
async def student(client) -> dict:
    response = await client.post(
        '/auth/register',
        json={
            'email': 'e2e@sina.dev',
            'password': 'senhaForte123',
            'full_name': 'Aluno E2E',
            'role': 'aluno',
        },
    )
    assert response.status_code == 201, response.text
    return {'Authorization': f'Bearer {response.json()["access_token"]}'}


def stored_files(storage: MaterialStorage) -> list[str]:
    return sorted(p.name for p in storage.root.rglob('*') if p.is_file())
