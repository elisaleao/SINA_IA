import uuid

import pytest


async def _register(client) -> tuple[str, dict]:
    email = f'{uuid.uuid4()}@sina.dev'
    response = await client.post(
        '/auth/register',
        json={
            'email': email,
            'password': 'senhaAntiga123',
            'full_name': 'Nome Antigo',
            'role': 'aluno',
        },
    )
    token = response.json()['access_token']
    return email, {'Authorization': f'Bearer {token}'}


async def _login(client, email: str, password: str) -> int:
    response = await client.post(
        '/auth/login', json={'email': email, 'password': password}
    )
    return response.status_code


@pytest.mark.asyncio
async def test_update_name_keeps_email_and_role(client):
    email, headers = await _register(client)

    response = await client.patch(
        '/users/me',
        headers=headers,
        json={'full_name': 'Nome Novo', 'role': 'admin', 'email': 'x@y.z'},
    )

    assert response.status_code == 200
    data = response.json()
    assert data['full_name'] == 'Nome Novo'
    # Self-service must never escalate the role or move the account.
    assert data['role'] == 'aluno'
    assert data['email'] == email


@pytest.mark.asyncio
async def test_change_password_with_current_password(client):
    email, headers = await _register(client)

    response = await client.patch(
        '/users/me',
        headers=headers,
        json={
            'current_password': 'senhaAntiga123',
            'new_password': 'senhaNova456',
        },
    )

    assert response.status_code == 200
    assert await _login(client, email, 'senhaNova456') == 200
    assert await _login(client, email, 'senhaAntiga123') == 401


@pytest.mark.asyncio
@pytest.mark.parametrize('current', [None, 'senhaErrada999'])
async def test_change_password_refused_without_right_current_password(
    client, current
):
    # A stolen access token alone must not be enough to take the account.
    email, headers = await _register(client)

    response = await client.patch(
        '/users/me',
        headers=headers,
        json={'current_password': current, 'new_password': 'senhaNova456'},
    )

    assert response.status_code == 403
    assert await _login(client, email, 'senhaAntiga123') == 200


@pytest.mark.asyncio
async def test_short_new_password_is_rejected(client):
    _, headers = await _register(client)

    response = await client.patch(
        '/users/me',
        headers=headers,
        json={'current_password': 'senhaAntiga123', 'new_password': '123'},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_profile_requires_login(client):
    response = await client.patch('/users/me', json={'full_name': 'Nome'})

    assert response.status_code == 401
