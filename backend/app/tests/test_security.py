from datetime import timedelta

import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_argon2_password_hashing():
    password = 'minhasenhasupersecreta123'
    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith('$argon2id$')
    assert verify_password(password, hashed) is True
    assert verify_password('senhaerrada123', hashed) is False


def test_jwt_access_token_creation_and_decoding():
    user_id = 'user-uuid-123'
    role = 'aluno'
    token = create_access_token(
        subject=user_id, role=role, expires_delta=timedelta(minutes=5)
    )

    payload = decode_access_token(token)
    assert payload['sub'] == user_id
    assert payload['role'] == role
    assert payload['type'] == 'access'
    assert 'exp' in payload


def test_jwt_expired_token_fails():
    token = create_access_token(
        subject='expired-user',
        role='aluno',
        expires_delta=timedelta(seconds=-1),
    )

    with pytest.raises(ValueError, match='Token decoding failed'):
        decode_access_token(token)


def test_refresh_token_generation_and_hashing():
    raw_token = generate_refresh_token()
    assert len(raw_token) >= 64

    hashed = hash_refresh_token(raw_token)
    assert len(hashed) == 64
    assert hash_refresh_token(raw_token) == hashed
