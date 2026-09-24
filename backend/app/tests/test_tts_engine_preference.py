import uuid

import pytest


async def _register(client) -> dict:
    response = await client.post(
        '/auth/register',
        json={
            'email': f'{uuid.uuid4()}@sina.dev',
            'password': 'senhaForte123',
            'full_name': 'Aluno Voz',
            'role': 'aluno',
        },
    )
    return {'Authorization': f'Bearer {response.json()["access_token"]}'}


@pytest.mark.asyncio
async def test_voice_engine_defaults_to_online(client):
    # Whoever never chose keeps the Microsoft voice they already know.
    headers = await _register(client)

    me = await client.get('/users/me', headers=headers)

    assert me.json()['accessibility_preferences']['tts_engine'] == 'online'


@pytest.mark.asyncio
async def test_user_can_choose_the_local_voice(client):
    headers = await _register(client)

    saved = await client.patch(
        '/users/me/preferences', headers=headers, json={'tts_engine': 'local'}
    )
    me = await client.get('/users/me', headers=headers)

    assert saved.status_code == 200
    assert saved.json()['tts_engine'] == 'local'
    assert me.json()['accessibility_preferences']['tts_engine'] == 'local'


@pytest.mark.asyncio
async def test_unknown_voice_engine_is_rejected(client):
    headers = await _register(client)

    response = await client.patch(
        '/users/me/preferences', headers=headers, json={'tts_engine': 'robo'}
    )

    assert response.status_code == 422
