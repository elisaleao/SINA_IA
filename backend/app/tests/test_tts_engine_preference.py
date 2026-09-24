import uuid

import pytest
from sqlalchemy import select

from app.api.deps import get_tts_client, get_tts_service
from app.database import UserRecord


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


async def _user_record(client, test_db_session, engine=None):
    headers = await _register(client)
    if engine:
        await client.patch(
            '/users/me/preferences',
            headers=headers,
            json={'tts_engine': engine},
        )
    me = await client.get('/users/me', headers=headers)
    return await test_db_session.scalar(
        select(UserRecord)
        .where(UserRecord.id == me.json()['id'])
        .execution_options(populate_existing=True)
    )


@pytest.mark.asyncio
@pytest.mark.parametrize('dependency', [get_tts_service, get_tts_client])
async def test_audio_follows_the_user_voice_choice(
    client, test_db_session, dependency
):
    local_user = await _user_record(client, test_db_session, 'local')
    default_user = await _user_record(client, test_db_session)

    assert dependency(local_user).prefer == 'local'
    assert dependency(default_user).prefer == 'online'


@pytest.mark.asyncio
@pytest.mark.parametrize('dependency', [get_tts_service, get_tts_client])
async def test_anonymous_audio_uses_the_online_voice(dependency):
    assert dependency(None).prefer == 'online'
