import uuid

import pytest
from google.genai import errors
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import ChaveGeminiUsuarioRecord, UserRecord
from app.services import llm_key_service
from app.services.crypto import encrypt_api_key
from app.services.llm_key_service import (
    InvalidLLMKey,
    LLMKeyService,
    validate_with_gemini,
)

KEY = 'AIzaSyChavePessoalDoAluno-0001'
OTHER_KEY = 'AIzaSyChavePessoalDoAluno-0002'


async def accept(_: str) -> bool:
    return True


async def reject(_: str) -> bool:
    return False


async def _user(db: AsyncSession) -> UserRecord:
    user = UserRecord(
        id=str(uuid.uuid4()),
        email=f'{uuid.uuid4()}@sina.edu.br',
        hashed_password='hash',
        full_name='Aluno',
    )
    db.add(user)
    await db.commit()
    return user


async def _rows(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(ChaveGeminiUsuarioRecord).where(
            ChaveGeminiUsuarioRecord.user_id == user_id
        )
    )
    return list(result.scalars())


@pytest.mark.asyncio
async def test_valid_key_is_stored_encrypted(test_db_session):
    user = await _user(test_db_session)

    await LLMKeyService(accept).save(user, KEY, test_db_session)

    [row] = await _rows(test_db_session, user.id)
    assert KEY not in row.gemini_api_key_cifrada
    assert await LLMKeyService.get_decrypted(user, test_db_session) == KEY
    assert await LLMKeyService.is_configured(user, test_db_session) is True


@pytest.mark.asyncio
async def test_rejected_key_raises_and_stores_nothing(test_db_session):
    user = await _user(test_db_session)

    with pytest.raises(InvalidLLMKey):
        await LLMKeyService(reject).save(user, KEY, test_db_session)

    assert await _rows(test_db_session, user.id) == []
    assert await LLMKeyService.is_configured(user, test_db_session) is False


@pytest.mark.asyncio
async def test_saving_again_replaces_the_key(test_db_session):
    user = await _user(test_db_session)
    service = LLMKeyService(accept)

    await service.save(user, KEY, test_db_session)
    await service.save(user, OTHER_KEY, test_db_session)

    assert len(await _rows(test_db_session, user.id)) == 1
    assert (
        await LLMKeyService.get_decrypted(user, test_db_session) == OTHER_KEY
    )


@pytest.mark.asyncio
async def test_remove_deletes_the_row(test_db_session):
    user = await _user(test_db_session)
    service = LLMKeyService(accept)
    await service.save(user, KEY, test_db_session)

    await service.remove(user, test_db_session)

    assert await _rows(test_db_session, user.id) == []
    assert await LLMKeyService.is_configured(user, test_db_session) is False
    assert await LLMKeyService.get_decrypted(user, test_db_session) is None


@pytest.mark.asyncio
async def test_user_without_key_has_no_row(test_db_session):
    user = await _user(test_db_session)

    assert await _rows(test_db_session, user.id) == []
    assert await LLMKeyService.is_configured(user, test_db_session) is False
    assert await LLMKeyService.is_configured(None, test_db_session) is False
    assert await LLMKeyService.get_decrypted(None, test_db_session) is None


@pytest.mark.asyncio
async def test_concurrent_save_keeps_the_last_key(test_engine, monkeypatch):
    make_session = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )
    real_load = llm_key_service._load_key
    calls = []

    async def stale_first_load(user, db):
        calls.append(True)
        if len(calls) > 1:
            await real_load(user, db)

    async with make_session() as first:
        user = await _user(first)
        await real_load(user, first)
        async with make_session() as second:
            second.add(
                ChaveGeminiUsuarioRecord(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    gemini_api_key_cifrada=encrypt_api_key(OTHER_KEY),
                )
            )
            await second.commit()
        monkeypatch.setattr(llm_key_service, '_load_key', stale_first_load)

        await LLMKeyService(accept).save(user, KEY, first)

        monkeypatch.setattr(llm_key_service, '_load_key', real_load)
        assert len(calls) == 2
        assert len(await _rows(first, user.id)) == 1
        assert await LLMKeyService.get_decrypted(user, first) == KEY


def _client_error(code: int) -> errors.ClientError:
    return errors.ClientError(
        code, {'error': {'code': code, 'message': 'x', 'status': 'X'}}
    )


@pytest.mark.asyncio
@pytest.mark.parametrize('code', [400, 401, 403])
async def test_gemini_validator_rejects_auth_errors(monkeypatch, code):
    async def fail(self, **_):
        raise _client_error(code)

    monkeypatch.setattr(llm_key_service.GeminiService, 'generate_text', fail)

    assert await validate_with_gemini(KEY) is False


@pytest.mark.asyncio
async def test_gemini_validator_propagates_other_errors(monkeypatch):
    async def fail(self, **_):
        raise _client_error(429)

    monkeypatch.setattr(llm_key_service.GeminiService, 'generate_text', fail)

    with pytest.raises(errors.ClientError):
        await validate_with_gemini(KEY)


@pytest.mark.asyncio
async def test_gemini_validator_accepts_a_working_key(monkeypatch):
    async def ok(self, **_):
        return 'ok'

    monkeypatch.setattr(llm_key_service.GeminiService, 'generate_text', ok)

    assert await validate_with_gemini(KEY) is True
