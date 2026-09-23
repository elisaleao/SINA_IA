import json
import uuid

import pytest
from google.genai import errors

from app.api.deps import (
    build_personal_ai,
    get_fallback_ai,
    get_generated_file_store,
    get_llm_client,
    get_llm_key_service,
    get_material_storage,
    get_personal_ai_factory,
    get_tts_service,
)
from app.database import DocumentRecord
from app.main import app
from app.services.fakes import FakeAccessibilityAI, FakeEdgeTTS
from app.services.file_store import GeneratedFileStore
from app.services.gemini_service import GeminiService
from app.services.llm_key_service import LLMKeyService
from app.services.material_service import MaterialStorage

KEY = 'AIzaSyChaveDoAlunoParaRotas-01'
TEXT = 'Cinemática: velocidade média é deslocamento sobre tempo.'.encode()


def _unauthorized() -> errors.ClientError:
    return errors.ClientError(
        401, {'error': {'code': 401, 'message': 'x', 'status': 'X'}}
    )


async def _accept(_: str) -> bool:
    return True


@pytest.fixture
def providers(client, tmp_path):
    state = {
        'groq': FakeAccessibilityAI(),
        'personal': FakeAccessibilityAI(),
        'keys': [],
    }

    def personal_factory(api_key: str):
        state['keys'].append(api_key)
        return state['personal']

    app.dependency_overrides.pop(get_llm_client, None)
    app.dependency_overrides[get_fallback_ai] = lambda: state['groq']
    app.dependency_overrides[get_personal_ai_factory] = lambda: (
        personal_factory
    )
    app.dependency_overrides[get_llm_key_service] = lambda: LLMKeyService(
        _accept
    )
    app.dependency_overrides[get_tts_service] = FakeEdgeTTS
    app.dependency_overrides[get_generated_file_store] = lambda: (
        GeneratedFileStore(tmp_path / 'gerados', expires=False)
    )
    app.dependency_overrides[get_material_storage] = lambda: MaterialStorage(
        tmp_path / 'materiais'
    )
    return state


async def _student(client, with_key: bool) -> dict:
    response = await client.post(
        '/auth/register',
        json={
            'email': f'{uuid.uuid4()}@sina.dev',
            'password': 'senhaForte123',
            'full_name': 'Aluno',
            'role': 'aluno',
        },
    )
    headers = {'Authorization': f'Bearer {response.json()["access_token"]}'}
    if with_key:
        saved = await client.put(
            '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
        )
        assert saved.status_code == 200
    return headers


async def _process_stream(client, headers=None) -> dict:
    response = await client.post(
        '/api/accessibility/process-stream',
        headers=headers or {},
        files={'file': ('aula.txt', TEXT)},
        data={'level': '2'},
    )
    assert response.status_code == 200
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[-1]['type'] == 'result', events[-1]
    return events[-1]


@pytest.mark.asyncio
async def test_anonymous_request_uses_the_free_fallback(client, providers):
    await _process_stream(client)

    assert 'generate_text' in providers['groq'].calls
    assert providers['personal'].calls == []
    assert providers['keys'] == []


@pytest.mark.asyncio
async def test_user_without_key_uses_the_free_fallback(client, providers):
    headers = await _student(client, with_key=False)

    await _process_stream(client, headers)

    assert 'generate_text' in providers['groq'].calls
    assert providers['personal'].calls == []


@pytest.mark.asyncio
async def test_user_key_is_used_on_process_stream(client, providers):
    headers = await _student(client, with_key=True)

    await _process_stream(client, headers)

    assert providers['keys'] == [KEY]
    assert 'generate_text' in providers['personal'].calls
    assert providers['groq'].calls == []


@pytest.mark.asyncio
async def test_failing_user_key_falls_back_and_the_request_succeeds(
    client, providers
):
    providers['personal'].failure = _unauthorized()
    headers = await _student(client, with_key=True)

    await _process_stream(client, headers)

    assert providers['personal'].calls == ['generate_text']
    assert 'generate_text' in providers['groq'].calls


@pytest.mark.asyncio
async def test_user_key_is_used_on_materials(client, providers):
    headers = await _student(client, with_key=True)

    response = await client.post(
        '/api/materiais',
        headers=headers,
        files=[('files', ('aula.txt', TEXT))],
    )

    assert response.status_code == 202
    [material] = response.json()['materiais']
    detail = await client.get(
        f'/api/materiais/{material["id"]}', headers=headers
    )
    assert detail.json()['status'] == 'pronto'
    assert 'generate_text' in providers['personal'].calls
    assert providers['groq'].calls == []


@pytest.mark.asyncio
async def test_user_key_is_used_on_content_generation(
    client, providers, test_db_session
):
    headers = await _student(client, with_key=True)
    doc_id = str(uuid.uuid4())
    test_db_session.add(
        DocumentRecord(
            id=doc_id,
            filename='aula.txt',
            raw_markdown='Velocidade média.',
            accessible_text='Velocidade média.',
        )
    )
    await test_db_session.commit()

    response = await client.post(
        '/api/content/generate',
        headers=headers,
        json={
            'document_id': doc_id,
            'generation_type': 'summary',
            'generate_audio': False,
        },
    )

    assert response.status_code == 200
    assert providers['personal'].calls == ['generate_text']
    assert providers['groq'].calls == []


def test_personal_factory_builds_gemini_with_the_user_key():
    client = build_personal_ai(KEY)

    assert isinstance(client, GeminiService)
    assert client.is_configured is True


async def _upload(client, headers) -> dict:
    response = await client.post(
        '/api/materiais',
        headers=headers,
        files=[('files', ('aula.txt', TEXT))],
    )
    assert response.status_code == 202
    [material] = response.json()['materiais']
    detail = await client.get(
        f'/api/materiais/{material["id"]}', headers=headers
    )
    return detail.json()


async def _generate(client, headers, test_db_session) -> dict:
    doc_id = str(uuid.uuid4())
    test_db_session.add(
        DocumentRecord(
            id=doc_id,
            filename='aula.txt',
            raw_markdown='Velocidade média.',
            accessible_text='Velocidade média.',
        )
    )
    await test_db_session.commit()
    response = await client.post(
        '/api/content/generate',
        headers=headers,
        json={
            'document_id': doc_id,
            'generation_type': 'summary',
            'generate_audio': False,
        },
    )
    assert response.status_code == 200
    return response.json()


@pytest.mark.asyncio
async def test_key_failure_is_reported_in_every_response(
    client, providers, test_db_session
):
    providers['personal'].failure = _unauthorized()
    headers = await _student(client, with_key=True)

    streamed = await _process_stream(client, headers)
    material = await _upload(client, headers)
    listing = await client.get('/api/materiais', headers=headers)
    generated = await _generate(client, headers, test_db_session)

    assert streamed['result']['chave_pessoal_falhou'] is True
    assert material['chave_pessoal_falhou'] is True
    assert listing.json()[0]['chave_pessoal_falhou'] is True
    assert generated['chave_pessoal_falhou'] is True


@pytest.mark.asyncio
async def test_missing_key_is_not_reported_as_a_failure(
    client, providers, test_db_session
):
    headers = await _student(client, with_key=False)

    streamed = await _process_stream(client, headers)
    material = await _upload(client, headers)
    generated = await _generate(client, headers, test_db_session)

    assert streamed['result']['chave_pessoal_falhou'] is False
    assert material['chave_pessoal_falhou'] is False
    assert generated['chave_pessoal_falhou'] is False


@pytest.mark.asyncio
async def test_reused_material_does_not_inherit_the_failure(client, providers):
    providers['personal'].failure = _unauthorized()
    headers = await _student(client, with_key=True)
    first = await _upload(client, headers)

    second = await _upload(client, headers)

    assert first['chave_pessoal_falhou'] is True
    assert second['reaproveitado'] is True
    assert second['chave_pessoal_falhou'] is False
