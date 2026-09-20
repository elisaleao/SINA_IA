import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

ph = PasswordHasher()


def hash_password(plain_password: str) -> str:
    """Gera hash seguro da senha utilizando Argon2id."""
    return ph.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano confere com o hash Argon2id."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False


def create_access_token(
    subject: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Gera token de acesso JWT de curta duração com claims sub e role."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)

    payload: dict[str, Any] = {
        'sub': str(subject),
        'role': str(role),
        'exp': expire,
        'iat': now,
        'type': 'access',
    }
    return jwt.encode(
        payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodifica e valida assinatura e expiração do access token JWT."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get('type') != 'access':
            raise ValueError('Invalid token type')
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f'Token decoding failed: {e}') from e


def generate_refresh_token() -> str:
    """Gera token opaco seguro para atualização de sessão."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Gera hash SHA-256 do refresh token para armazenamento seguro no banco."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()
