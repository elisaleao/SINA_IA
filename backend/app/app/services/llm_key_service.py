"""Caso de uso da chave pessoal do Gemini: validar, cifrar, gravar e remover."""

import uuid
from typing import Awaitable, Callable, Optional

from google.genai import errors
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import ChaveGeminiUsuarioRecord, UserRecord
from app.services.crypto import decrypt_api_key, encrypt_api_key
from app.services.gemini_service import GeminiService

KeyValidator = Callable[[str], Awaitable[bool]]

INVALID_KEY_STATUS = {400, 401, 403}


async def _load_key(user: UserRecord, db: AsyncSession) -> None:
    await db.refresh(user, attribute_names=['chave_gemini'])


class InvalidLLMKey(Exception):
    """A chave foi recusada pelo Gemini na chamada de teste."""


async def validate_with_gemini(api_key: str) -> bool:
    """Faz uma chamada curta com a chave; só recusa em erro de autenticação."""
    try:
        await GeminiService(api_key=api_key).generate_text(
            system_instruction=None, user_text='Responda apenas: ok'
        )
    except errors.ClientError as exc:
        if exc.code in INVALID_KEY_STATUS:
            return False
        raise
    return True


class LLMKeyService:
    def __init__(self, validate: KeyValidator = validate_with_gemini) -> None:
        self.validate = validate

    async def save(
        self, user: UserRecord, api_key: str, db: AsyncSession
    ) -> None:
        if not await self.validate(api_key):
            raise InvalidLLMKey('A chave do Gemini foi recusada.')
        cipher = encrypt_api_key(api_key)
        await _load_key(user, db)
        try:
            self._store(user, cipher)
            await db.commit()
        except IntegrityError:
            await db.rollback()
            await db.refresh(user)
            await _load_key(user, db)
            self._store(user, cipher)
            await db.commit()

    async def remove(self, user: UserRecord, db: AsyncSession) -> None:
        await _load_key(user, db)
        if user.chave_gemini is not None:
            user.chave_gemini = None
            await db.commit()

    @staticmethod
    async def is_configured(
        user: Optional[UserRecord], db: AsyncSession
    ) -> bool:
        if user is None:
            return False
        await _load_key(user, db)
        return user.chave_gemini is not None

    @staticmethod
    async def get_decrypted(
        user: Optional[UserRecord], db: AsyncSession
    ) -> Optional[str]:
        if user is None:
            return None
        await _load_key(user, db)
        if user.chave_gemini is None:
            return None
        return decrypt_api_key(user.chave_gemini.gemini_api_key_cifrada)

    @staticmethod
    def _store(user: UserRecord, cipher: str) -> None:
        if user.chave_gemini is not None:
            user.chave_gemini.gemini_api_key_cifrada = cipher
            return
        user.chave_gemini = ChaveGeminiUsuarioRecord(
            id=str(uuid.uuid4()),
            user_id=user.id,
            gemini_api_key_cifrada=cipher,
        )
