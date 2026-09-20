import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.api.deps import get_optional_user
from app.core.config import settings
from app.core.security import create_access_token, hash_refresh_token
from app.database import RefreshTokenRecord, UserRecord


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client):
    email = f'dup_{uuid.uuid4().hex[:6]}@sina.edu.br'
    payload = {
        'email': email,
        'password': 'senhaForte123',
        'full_name': 'Original User',
        'role': 'aluno',
    }
    r1 = await client.post('/auth/register', json=payload)
    assert r1.status_code == 201

    # Tenta registrar o mesmo e-mail novamente
    r2 = await client.post('/auth/register', json=payload)
    assert r2.status_code == 409
    assert 'Já existe um usuário' in r2.json()['detail']


@pytest.mark.asyncio
async def test_login_invalid_password_or_user_not_found(client):
    email = f'login_{uuid.uuid4().hex[:6]}@sina.edu.br'
    await client.post(
        '/auth/register',
        json={
            'email': email,
            'password': 'senhaCorreta123',
            'full_name': 'Login Test',
            'role': 'aluno',
        },
    )

    # Senha incorreta
    resp_bad_pass = await client.post(
        '/auth/login',
        json={'email': email, 'password': 'senhaIncorretaErrada'},
    )
    assert resp_bad_pass.status_code == 401
    assert 'Credenciais inválidas' in resp_bad_pass.json()['detail']

    # Usuário inexistente
    resp_bad_user = await client.post(
        '/auth/login',
        json={'email': 'inexistente@sina.edu.br', 'password': 'qualquerSenha'},
    )
    assert resp_bad_user.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_expired_or_not_found(client, test_db_session):
    # Token inexistente
    resp_fake = await client.post(
        '/auth/refresh',
        json={'refresh_token': 'token-aleatorio-que-nao-existe'},
    )
    assert resp_fake.status_code == 401

    # Cria usuário e insere refresh token já expirado no passado
    user_id = str(uuid.uuid4())
    user = UserRecord(
        id=user_id,
        email=f'exp_{uuid.uuid4().hex[:6]}@sina.edu.br',
        hashed_password='hash',
        full_name='Expired User',
        role='aluno',
        is_active=True,
    )
    test_db_session.add(user)

    raw_expired = 'expired-raw-token-12345'
    expired_token = RefreshTokenRecord(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=hash_refresh_token(raw_expired),
        family_id=str(uuid.uuid4()),
        revoked=False,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    test_db_session.add(expired_token)
    await test_db_session.commit()

    resp_exp = await client.post(
        '/auth/refresh',
        json={'refresh_token': raw_expired},
    )
    assert resp_exp.status_code == 401
    assert 'expirado' in resp_exp.json()['detail'].lower()


@pytest.mark.asyncio
async def test_logout_is_idempotent_even_with_unknown_token(client):
    resp = await client.post(
        '/auth/logout',
        json={'refresh_token': 'token_invalido_inexistente'},
    )
    assert resp.status_code == 200
    assert 'encerrada' in resp.json()['message'].lower()


@pytest.mark.asyncio
async def test_deps_auth_header_variations(client, test_db_session):
    # 1. Sem header de autorização -> 401
    r_no_header = await client.get('/users/me')
    assert r_no_header.status_code == 401

    # 2. Header não Bearer (ex: Basic) -> 401
    r_basic = await client.get(
        '/users/me',
        headers={'Authorization': 'Basic dXNlcjpwYXNz'},
    )
    assert r_basic.status_code == 401

    # 3. Token JWT expirado
    expired_payload = {
        'sub': str(uuid.uuid4()),
        'exp': datetime.now(timezone.utc) - timedelta(minutes=10),
    }
    expired_jwt = jwt.encode(
        expired_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )
    r_exp = await client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {expired_jwt}'},
    )
    assert r_exp.status_code == 401
    assert 'inválido ou expirado' in r_exp.json()['detail'].lower()

    # 4. Token sem campo 'sub'
    no_sub_payload = {
        'role': 'aluno',
        'exp': datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    no_sub_jwt = jwt.encode(
        no_sub_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )
    r_no_sub = await client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {no_sub_jwt}'},
    )
    assert r_no_sub.status_code == 401

    # 5. Token com usuário inexistente no banco
    orphan_jwt = create_access_token(subject=str(uuid.uuid4()), role='aluno')
    r_orphan = await client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {orphan_jwt}'},
    )
    assert r_orphan.status_code == 401
    assert 'não encontrado' in r_orphan.json()['detail'].lower()


@pytest.mark.asyncio
async def test_require_role_blocks_unauthorized_roles(client):
    # Registra aluno
    reg_student = await client.post(
        '/auth/register',
        json={
            'email': f'stud_{uuid.uuid4().hex[:6]}@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Estudante RBAC',
            'role': 'aluno',
        },
    )
    token = reg_student.json()['access_token']

    # Tenta publicar questão (que exige professor ou admin)
    resp = await client.post(
        f'/api/exercicios/{uuid.uuid4()}/publicar',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 403
    assert 'Permissão insuficiente' in resp.json()['detail']


@pytest.mark.asyncio
async def test_get_optional_user_helper(test_db_session):
    # Sem credenciais retorna None
    res_none = await get_optional_user(credentials=None, db=test_db_session)
    assert res_none is None

    # Com token malformado retorna None
    class FakeCreds:
        scheme = 'bearer'
        credentials = 'token.malformado.invalido'

    res_malformed = await get_optional_user(
        credentials=FakeCreds(), db=test_db_session
    )
    assert res_malformed is None
