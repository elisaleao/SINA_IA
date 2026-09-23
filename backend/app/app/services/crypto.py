"""Cifragem das chaves de API dos usuários (sem banco, sem rede)."""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class InvalidEncryptedKey(Exception):
    """O texto cifrado foi adulterado ou pertence a outro segredo."""


def _fernet() -> Fernet:
    digest = hashlib.sha256(
        settings.LLM_KEY_ENCRYPTION_SECRET.encode()
    ).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_api_key(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_api_key(cipher: str) -> str:
    try:
        return _fernet().decrypt(cipher.encode()).decode()
    except InvalidToken as exc:
        raise InvalidEncryptedKey(
            'Não foi possível decifrar a chave.'
        ) from exc
