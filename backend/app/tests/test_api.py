from unittest.mock import AsyncMock

import pytest

from app.api.deps import get_ingestion_service
from app.database import DocumentRecord
from app.main import app


@pytest.mark.asyncio
async def test_health_check_endpoints(client):
    """GET /health e GET /api/health devem retornar status 200 e payload de prontidão."""
    for path in ['/health', '/api/health']:
        response = await client.get(path)
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'ok'
        assert 'service' in data
        assert 'version' in data


@pytest.mark.asyncio
async def test_upload_document(client):
    """POST /api/documents/upload deve fazer upload, chamar ingestão e salvar no banco."""
    mock_ingest = AsyncMock()
    mock_ingest.process_file = AsyncMock(
        return_value=(
            '# Título\nEquação: $x = 1$',
            'Texto acessível x igual a 1',
            ['x = 1'],
        )
    )

    app.dependency_overrides[get_ingestion_service] = lambda: mock_ingest
    try:
        files = {
            'file': ('test.txt', b'conteudo de teste do arquivo', 'text/plain')
        }
        response = await client.post('/api/documents/upload', files=files)

        assert response.status_code == 200
        data = response.json()
        assert 'document_id' in data
        assert data['filename'] == 'test.txt'
        assert data['extracted_markdown'] == '# Título\nEquação: $x = 1$'
        assert data['accessible_text'] == 'Texto acessível x igual a 1'
        assert data['equations_found'] == ['x = 1']
        mock_ingest.process_file.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_ingestion_service, None)


@pytest.mark.asyncio
async def test_generate_content_success(
    client, test_db_session, fake_llm, fake_tts
):
    """POST /api/content/generate deve processar documento via FakeLLM e FakeTTS sem I/O externo."""
    doc_id = 'test-doc-123'
    doc = DocumentRecord(
        id=doc_id,
        filename='test.txt',
        raw_markdown='Fórmula: $\\frac{1}{2}$',
        accessible_text='Fórmula: fração com numerador 1 e denominador 2',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    request_body = {
        'document_id': doc_id,
        'generation_type': 'summary',
        'teacher_config': {
            'pedagogical_level': 'intermediario',
            'math_detail_level': 'passo_a_passo',
            'tone': 'encorajador',
        },
        'generate_audio': True,
        'voice': 'pt-BR-AntonioNeural',
    }

    response = await client.post('/api/content/generate', json=request_body)

    assert response.status_code == 200
    data = response.json()
    assert data['document_id'] == doc_id
    assert data['generation_type'] == 'summary'
    assert 'Resumo Didático' in data['text_content']
    assert data['audio_url'].startswith('/api/audio/fake-')
    assert len(fake_llm.calls) == 1
    assert len(fake_tts.calls) == 1


@pytest.mark.asyncio
async def test_generate_content_not_found(client):
    """POST /api/content/generate deve retornar 404 se documento não existe."""
    request_body = {
        'document_id': 'non-existent-id',
        'generation_type': 'summary',
        'generate_audio': False,
    }
    response = await client.post('/api/content/generate', json=request_body)
    assert response.status_code == 404
    assert response.json()['detail'] == 'Documento não encontrado.'


@pytest.mark.asyncio
async def test_get_audio_file_success(client, fake_tts):
    """GET /api/audio/{filename} deve servir o arquivo quando ele existe fisicamente."""
    audio_filename = await fake_tts.text_to_speech('Texto de teste')

    response = await client.get(f'/api/audio/{audio_filename}')
    assert response.status_code == 200
    assert response.content == b'fake-mp3-audio-bytes-for-testing'


@pytest.mark.asyncio
async def test_get_audio_file_not_found(client):
    """GET /api/audio/{filename} deve retornar 404 se o arquivo não existe."""
    response = await client.get('/api/audio/non-existent-file.mp3')
    assert response.status_code == 404
    assert response.json()['detail'] == 'Arquivo de áudio não encontrado.'


@pytest.mark.asyncio
async def test_generate_content_with_accessibility_profile(
    client, test_db_session, fake_llm
):
    """POST /api/content/generate com perfil de acessibilidade para dislexia."""
    doc_id = 'test-doc-dyslexia'
    doc = DocumentRecord(
        id=doc_id,
        filename='test.txt',
        raw_markdown='Conteúdo sobre física',
        accessible_text='Conteúdo sobre física',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    request_body = {
        'document_id': doc_id,
        'generation_type': 'summary',
        'accessibility_config': {
            'profile': 'dyslexia',
            'plain_language': True,
            'include_glossary': True,
        },
        'generate_audio': False,
    }

    response = await client.post('/api/content/generate', json=request_body)

    assert response.status_code == 200
    data = response.json()
    assert data['document_id'] == doc_id
    assert data['accessibility_profile'] == 'dyslexia'
    assert 'dyslexia' in data['text_content']
    assert len(fake_llm.calls) == 1
    assert fake_llm.calls[0]['accessibility'].profile.value == 'dyslexia'
