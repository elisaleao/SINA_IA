import uuid
from unittest.mock import AsyncMock

import pytest

from app.api.deps import get_llm_client
from app.database import DocumentRecord
from app.main import app


@pytest.mark.asyncio
async def test_generate_content_document_not_found(client):
    payload = {
        'document_id': str(uuid.uuid4()),
        'generation_type': 'summary',
        'teacher_config': {'pedagogical_level': 'medio', 'subject': 'Física'},
        'generate_audio': False,
    }
    response = await client.post('/api/content/generate', json=payload)
    assert response.status_code == 404
    assert 'Documento não encontrado' in response.json()['detail']


@pytest.mark.asyncio
async def test_generate_content_success_without_audio(client, test_db_session):
    doc_id = str(uuid.uuid4())
    doc = DocumentRecord(
        id=doc_id,
        filename='cinematica.txt',
        raw_markdown='# Cinemática\nA velocidade é $v = \\frac{\\Delta s}{\\Delta t}$.',
        accessible_text='A velocidade é delta s sobre delta t.',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    payload = {
        'document_id': doc_id,
        'generation_type': 'summary',
        'teacher_config': {
            'pedagogical_level': 'superior',
            'subject': 'Física Clássica',
        },
        'accessibility_config': {
            'profile': 'dyslexia',
            'plain_language': True,
            'include_glossary': True,
        },
        'generate_audio': False,
    }

    response = await client.post('/api/content/generate', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['document_id'] == doc_id
    assert data['generation_type'] == 'summary'
    assert data['accessibility_profile'] == 'dyslexia'
    assert 'text_content' in data
    assert 'spoken_content' in data
    assert data['audio_url'] is None


@pytest.mark.asyncio
async def test_generate_content_with_audio_synthesis(client, test_db_session):
    doc_id = str(uuid.uuid4())
    doc = DocumentRecord(
        id=doc_id,
        filename='geometria.md',
        raw_markdown='# Triângulos\nA área é expressa por $A = \\frac{b \\cdot h}{2}$.',
        accessible_text='A área é b vezes h sobre dois.',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    payload = {
        'document_id': doc_id,
        'generation_type': 'study_guide',
        'teacher_config': {
            'pedagogical_level': 'fundamental',
            'subject': 'Geometria',
        },
        'generate_audio': True,
        'voice': 'pt-BR-AntonioNeural',
    }

    response = await client.post('/api/content/generate', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['audio_url'] is not None
    assert data['audio_url'].startswith('/api/audio/')


@pytest.mark.asyncio
async def test_generate_content_llm_failure_returns_500(
    client, test_db_session
):
    doc_id = str(uuid.uuid4())
    doc = DocumentRecord(
        id=doc_id,
        filename='erro.md',
        raw_markdown='# Falha',
        accessible_text='Falha',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    # Cria mock de falha no LLM
    mock_llm = AsyncMock()
    mock_llm.generate_content.side_effect = RuntimeError(
        'Simulated LLM Timeout'
    )
    app.dependency_overrides[get_llm_client] = lambda: mock_llm

    try:
        payload = {
            'document_id': doc_id,
            'generation_type': 'summary',
            'teacher_config': {'pedagogical_level': 'medio', 'subject': 'TI'},
            'generate_audio': False,
        }
        response = await client.post('/api/content/generate', json=payload)
        assert response.status_code == 500
        assert 'Simulated LLM Timeout' in response.json()['detail']
    finally:
        # Restaura fake_llm padrão
        app.dependency_overrides.pop(get_llm_client, None)
