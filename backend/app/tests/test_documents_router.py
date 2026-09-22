import io
import uuid
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import update

from app.api.deps import get_ingestion_service
from app.database import DocumentRecord, UserRecord
from app.main import app


@pytest.mark.asyncio
async def test_upload_document_anonymous(client):
    file_content = b'# Introducao ao Calculo\nDerivada de $x^2$ e $2x$.'
    files = {'file': ('calculo.txt', io.BytesIO(file_content), 'text/plain')}

    response = await client.post('/api/documents/upload', files=files)
    assert response.status_code == 200
    data = response.json()
    assert 'document_id' in data
    assert data['filename'] == 'calculo.txt'
    assert 'Derivada' in data['extracted_markdown']
    assert isinstance(data['equations_found'], list)


@pytest.mark.asyncio
async def test_upload_document_authenticated(client):
    # Registra usuário
    reg_resp = await client.post(
        '/auth/register',
        json={
            'email': 'uploader@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Uploader User',
            'role': 'aluno',
        },
    )
    assert reg_resp.status_code == 201
    token = reg_resp.json()['access_token']

    files = {
        'file': (
            'algebra.txt',
            io.BytesIO(b'Matrizes: $A \\times B = C$'),
            'text/plain',
        )
    }
    response = await client.post(
        '/api/documents/upload',
        files=files,
        headers={'Authorization': f'Bearer {token}'},
    )
    assert response.status_code == 200
    doc_id = response.json()['document_id']

    # Recupera o documento criado
    get_resp = await client.get(
        f'/api/documents/{doc_id}',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert get_resp.status_code == 200
    assert get_resp.json()['filename'] == 'algebra.txt'


@pytest.mark.asyncio
async def test_upload_document_failure_rolls_back(client):
    mock_ingestion = AsyncMock()
    mock_ingestion.process_file.side_effect = RuntimeError(
        'Falha crítica de OCR'
    )
    app.dependency_overrides[get_ingestion_service] = lambda: mock_ingestion

    try:
        files = {
            'file': (
                'corrompido.pdf',
                io.BytesIO(b'%PDF-invalido'),
                'text/pdf',
            )
        }
        response = await client.post('/api/documents/upload', files=files)
        assert response.status_code == 500
        assert 'Falha crítica de OCR' in response.json()['detail']
    finally:
        app.dependency_overrides.pop(get_ingestion_service, None)


@pytest.mark.asyncio
async def test_get_document_not_found(client):
    fake_id = str(uuid.uuid4())
    response = await client.get(f'/api/documents/{fake_id}')
    assert response.status_code == 404
    assert 'Documento não encontrado' in response.json()['detail']


@pytest.mark.asyncio
async def test_get_document_public_without_owner(client, test_db_session):
    doc_id = str(uuid.uuid4())
    doc = DocumentRecord(
        id=doc_id,
        user_id=None,  # Documento público
        filename='publico.txt',
        raw_markdown='# Conteúdo Público Aberto',
        accessible_text='Conteúdo Público Aberto',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    # Usuário anônimo acessa documento público
    response = await client.get(f'/api/documents/{doc_id}')
    assert response.status_code == 200
    assert response.json()['filename'] == 'publico.txt'


@pytest.mark.asyncio
async def test_admin_can_access_any_private_document(client, test_db_session):
    # Registra aluno e admin
    reg_student = await client.post(
        '/auth/register',
        json={
            'email': 'estudante_privado@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Estudante Privado',
            'role': 'aluno',
        },
    )
    student_id = (
        await client.get(
            '/users/me',
            headers={
                'Authorization': f'Bearer {reg_student.json()["access_token"]}'
            },
        )
    ).json()['id']

    # Admin não pode ser criado pelo cadastro público: promove direto no banco
    reg_admin = await client.post(
        '/auth/register',
        json={
            'email': 'administrador@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Administrador SINA',
            'role': 'professor',
        },
    )
    admin_token = reg_admin.json()['access_token']
    await test_db_session.execute(
        update(UserRecord)
        .where(UserRecord.email == 'administrador@sina.edu.br')
        .values(role='admin')
    )
    await test_db_session.commit()

    # Insere documento pertencente ao estudante
    doc_id = str(uuid.uuid4())
    doc = DocumentRecord(
        id=doc_id,
        user_id=student_id,
        filename='privado_estudante.pdf',
        raw_markdown='# Privado Estudante',
        accessible_text='Privado Estudante',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    # Admin acessa documento do estudante -> 200 OK
    resp_admin = await client.get(
        f'/api/documents/{doc_id}',
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert resp_admin.status_code == 200
    assert resp_admin.json()['filename'] == 'privado_estudante.pdf'
