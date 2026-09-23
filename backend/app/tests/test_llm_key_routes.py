import uuid

import pytest
from google.genai import errors

from app.api.deps import get_llm_key_service
from app.main import app
from app.services.llm_key_service import LLMKeyService

KEY = 'AIzaSyChavePessoalDaRota-0001'


class Validator:
    def __init__(self, result: bool = True, error: Exception | None = None):
        self.result = result
        self.error = error
        self.calls: list[str] = []

    async def __call__(self, api_key: str) -> bool:
        self.calls.append(api_key)
        if self.error is not None:
            raise self.error
        return self.result


@pytest.fixture
def validator(client):
    fake = Validator()
    app.dependency_overrides[get_llm_key_service] = lambda: LLMKeyService(fake)
    return fake


async def _headers(client) -> dict:
    response = await client.post(
        '/auth/register',
        json={
            'email': f'{uuid.uuid4()}@sina.dev',
            'password': 'senhaForte123',
            'full_name': 'Aluno Chave',
            'role': 'aluno',
        },
    )
    return {'Authorization': f'Bearer {response.json()["access_token"]}'}


async def _configured(client, headers) -> bool:
    response = await client.get('/users/me', headers=headers)
    assert response.status_code == 200
    return response.json()['llm_key_configurada']


@pytest.mark.asyncio
async def test_saving_a_valid_key_marks_it_configured(client, validator):
    headers = await _headers(client)
    assert await _configured(client, headers) is False

    response = await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
    )

    assert response.status_code == 200
    assert response.json() == {'llm_key_configurada': True}
    assert validator.calls == [KEY]
    assert await _configured(client, headers) is True


@pytest.mark.asyncio
async def test_invalid_key_is_rejected_and_not_saved(client, validator):
    validator.result = False
    headers = await _headers(client)

    response = await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
    )

    assert response.status_code == 422
    assert 'recusada' in response.json()['detail']
    assert await _configured(client, headers) is False


@pytest.mark.asyncio
async def test_key_check_failure_is_not_reported_as_invalid_key(
    client, validator
):
    validator.error = errors.ServerError(
        503, {'error': {'code': 503, 'message': 'x', 'status': 'X'}}
    )
    headers = await _headers(client)

    response = await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
    )

    assert response.status_code == 502
    assert 'recusada' not in response.json()['detail']
    assert await _configured(client, headers) is False


@pytest.mark.asyncio
async def test_key_longer_than_512_is_rejected_without_checking(
    client, validator
):
    headers = await _headers(client)

    response = await client.put(
        '/users/me/llm-key',
        headers=headers,
        json={'gemini_api_key': 'k' * 513},
    )

    assert response.status_code == 422
    assert validator.calls == []


@pytest.mark.asyncio
async def test_empty_key_removes_the_saved_key(client, validator):
    headers = await _headers(client)
    await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
    )

    response = await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': ''}
    )

    assert response.status_code == 200
    assert response.json() == {'llm_key_configurada': False}
    assert validator.calls == [KEY]
    assert await _configured(client, headers) is False


@pytest.mark.asyncio
async def test_delete_removes_the_saved_key(client, validator):
    headers = await _headers(client)
    await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
    )

    response = await client.delete('/users/me/llm-key', headers=headers)

    assert response.status_code == 204
    assert await _configured(client, headers) is False


@pytest.mark.asyncio
async def test_key_routes_require_authentication(client, validator):
    put = await client.put('/users/me/llm-key', json={'gemini_api_key': KEY})
    delete = await client.delete('/users/me/llm-key')

    assert put.status_code == 401
    assert delete.status_code == 401
    assert validator.calls == []


@pytest.mark.asyncio
async def test_no_response_ever_contains_the_key(client, validator):
    headers = await _headers(client)

    saved = await client.put(
        '/users/me/llm-key', headers=headers, json={'gemini_api_key': KEY}
    )
    me = await client.get('/users/me', headers=headers)

    assert KEY not in saved.text
    assert KEY not in me.text
