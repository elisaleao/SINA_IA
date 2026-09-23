import pytest

from app.core.config import settings
from app.services.crypto import (
    InvalidEncryptedKey,
    decrypt_api_key,
    encrypt_api_key,
)

API_KEY = 'AIzaSyExemploDeChaveDoGemini-1234567890'


def test_round_trip_returns_the_original_key():
    assert decrypt_api_key(encrypt_api_key(API_KEY)) == API_KEY


def test_ciphertext_does_not_contain_the_plain_key():
    cipher = encrypt_api_key(API_KEY)

    assert API_KEY not in cipher


def test_tampered_ciphertext_is_rejected():
    cipher = encrypt_api_key(API_KEY)
    tampered = cipher[:-4] + (
        'AAAA' if not cipher.endswith('AAAA') else 'BBBB'
    )

    with pytest.raises(InvalidEncryptedKey):
        decrypt_api_key(tampered)


def test_a_different_secret_cannot_decrypt(monkeypatch):
    cipher = encrypt_api_key(API_KEY)
    monkeypatch.setattr(
        settings, 'LLM_KEY_ENCRYPTION_SECRET', 'outro-segredo-qualquer'
    )

    with pytest.raises(InvalidEncryptedKey):
        decrypt_api_key(cipher)
