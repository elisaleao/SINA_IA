import uuid

import pytest
from sqlalchemy import update

from app.database import DocumentRecord, UserRecord


@pytest.mark.asyncio
async def test_register_and_login_flow(client):
    # 1. Registro
    reg_resp = await client.post(
        '/auth/register',
        json={
            'email': 'aluno@sina.edu.br',
            'password': 'senhaSegura123',
            'full_name': 'Aluno Exemplo',
            'role': 'aluno',
        },
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert 'access_token' in data
    assert 'refresh_token' in data
    assert data['token_type'] == 'bearer'

    # 2. Login com sucesso
    login_resp = await client.post(
        '/auth/login',
        json={
            'email': 'aluno@sina.edu.br',
            'password': 'senhaSegura123',
        },
    )
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    access_token = tokens['access_token']

    # 3. Acessar /users/me com token
    me_resp = await client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {access_token}'},
    )
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data['email'] == 'aluno@sina.edu.br'
    assert user_data['full_name'] == 'Aluno Exemplo'
    assert user_data['role'] == 'aluno'
    assert user_data['accessibility_preferences'] is not None


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client):
    payload = {
        'email': 'duplicado@sina.edu.br',
        'password': 'senhaSegura123',
        'full_name': 'Primeiro',
    }
    r1 = await client.post('/auth/register', json=payload)
    assert r1.status_code == 201

    r2 = await client.post('/auth/register', json=payload)
    assert r2.status_code == 409
    assert 'Já existe um usuário cadastrado' in r2.json()['detail']


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    await client.post(
        '/auth/register',
        json={
            'email': 'user@sina.edu.br',
            'password': 'correta123',
            'full_name': 'User',
        },
    )
    resp = await client.post(
        '/auth/login',
        json={
            'email': 'user@sina.edu.br',
            'password': 'errada123',
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_reuse_detection(client):
    reg = await client.post(
        '/auth/register',
        json={
            'email': 'rotation@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Rotation User',
        },
    )
    assert reg.status_code == 201
    initial_refresh = reg.json()['refresh_token']

    # Rotação válida
    rot_resp = await client.post(
        '/auth/refresh',
        json={'refresh_token': initial_refresh},
    )
    assert rot_resp.status_code == 200
    new_refresh = rot_resp.json()['refresh_token']
    assert new_refresh != initial_refresh

    # Detecção de reuso do token antigo já rotacionado
    reuse_resp = await client.post(
        '/auth/refresh',
        json={'refresh_token': initial_refresh},
    )
    assert reuse_resp.status_code == 401
    assert (
        'Tentativa de reuso de token detectada' in reuse_resp.json()['detail']
    )

    # O novo token também deve ter sido revogado devido à revogação de toda a família
    post_reuse_resp = await client.post(
        '/auth/refresh',
        json={'refresh_token': new_refresh},
    )
    assert post_reuse_resp.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_token(client):
    reg = await client.post(
        '/auth/register',
        json={
            'email': 'logout@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Logout User',
        },
    )
    assert reg.status_code == 201
    refresh_token = reg.json()['refresh_token']

    logout_resp = await client.post(
        '/auth/logout',
        json={'refresh_token': refresh_token},
    )
    assert logout_resp.status_code == 200

    # Tentar renovar com token revogado falha
    refresh_resp = await client.post(
        '/auth/refresh',
        json={'refresh_token': refresh_token},
    )
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_access_to_users_me_fails(client):
    resp = await client.get('/users/me')
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user_fails(client, test_db_session):
    reg = await client.post(
        '/auth/register',
        json={
            'email': 'inativo@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Inativo User',
        },
    )
    assert reg.status_code == 201

    await test_db_session.execute(
        update(UserRecord)
        .where(UserRecord.email == 'inativo@sina.edu.br')
        .values(is_active=False)
    )
    await test_db_session.commit()

    resp = await client.post(
        '/auth/login',
        json={
            'email': 'inativo@sina.edu.br',
            'password': 'senhaForte123',
        },
    )
    assert resp.status_code == 403
    assert 'inativo' in resp.json()['detail'].lower()


@pytest.mark.asyncio
async def test_document_ownership_and_privacy(client, test_db_session):
    # Registra dois usuários
    r_a = await client.post(
        '/auth/register',
        json={
            'email': 'user_a@sina.edu.br',
            'password': 'senhaA12345',
            'full_name': 'User A',
        },
    )
    token_a = r_a.json()['access_token']
    me_a = await client.get(
        '/users/me', headers={'Authorization': f'Bearer {token_a}'}
    )
    user_a_id = me_a.json()['id']

    r_b = await client.post(
        '/auth/register',
        json={
            'email': 'user_b@sina.edu.br',
            'password': 'senhaB12345',
            'full_name': 'User B',
        },
    )
    token_b = r_b.json()['access_token']

    # Insere documento privado pertencente a A
    doc_id = str(uuid.uuid4())
    doc = DocumentRecord(
        id=doc_id,
        user_id=user_a_id,
        filename='privado_a.pdf',
        raw_markdown='# Privado',
        accessible_text='Privado acessível',
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    # User B tenta acessar documento de A -> 404 (para não revelar existência)
    res_b = await client.get(
        f'/api/documents/{doc_id}',
        headers={'Authorization': f'Bearer {token_b}'},
    )
    assert res_b.status_code == 404

    # User A acessa seu próprio documento -> 200
    res_a = await client.get(
        f'/api/documents/{doc_id}',
        headers={'Authorization': f'Bearer {token_a}'},
    )
    assert res_a.status_code == 200
    assert res_a.json()['filename'] == 'privado_a.pdf'


@pytest.mark.asyncio
async def test_update_accessibility_preferences_vlibras(client):
    reg = await client.post(
        '/auth/register',
        json={
            'email': 'vlibras_user@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'VLibras User',
            'role': 'aluno',
        },
    )
    assert reg.status_code == 201
    token = reg.json()['access_token']

    # Inicialmente, vlibras_active é False
    me_resp = await client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert me_resp.status_code == 200
    assert (
        me_resp.json()['accessibility_preferences']['vlibras_active'] is False
    )

    # Atualiza preferência ativando VLibras
    patch_resp = await client.patch(
        '/users/me/preferences',
        headers={'Authorization': f'Bearer {token}'},
        json={'vlibras_active': True, 'high_contrast': True},
    )
    assert patch_resp.status_code == 200
    patch_data = patch_resp.json()
    assert patch_data['vlibras_active'] is True
    assert patch_data['high_contrast'] is True

    # Verifica persistência ao consultar /users/me novamente
    me_resp_updated = await client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert me_resp_updated.status_code == 200
    updated_prefs = me_resp_updated.json()['accessibility_preferences']
    assert updated_prefs['vlibras_active'] is True
    assert updated_prefs['high_contrast'] is True
