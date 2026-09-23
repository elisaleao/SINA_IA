import datetime

import pytest
from pydantic import ValidationError

from app.models import AccessibilityProfileType
from app.schemas.user import (
    AccessibilityPreferencesCreate,
    AccessibilityPreferencesResponse,
    AccessibilityPreferencesUpdate,
    FontSize,
    LineSpacing,
    LLMKeyUpdate,
    UserCreate,
    UserResponse,
    UserRole,
    UserUpdate,
)


def test_user_create_with_preferences_schema():
    """Valida o schema de criação de usuário com preferências de acessibilidade."""
    prefs = AccessibilityPreferencesCreate(
        profile=AccessibilityProfileType.DYSLEXIA,
        plain_language=True,
        include_glossary=True,
        highlight_key_points=True,
        font_family='opendyslexic',
        font_size='large',
        line_spacing='relaxed',
        high_contrast=False,
    )
    user_in = UserCreate(
        email='novo.aluno@sina.edu.br',
        full_name='Novo Aluno',
        password='senha_segura_123',
        role=UserRole.STUDENT,
        accessibility_preferences=prefs,
    )

    assert user_in.email == 'novo.aluno@sina.edu.br'
    assert user_in.role == UserRole.STUDENT
    assert user_in.accessibility_preferences is not None
    assert (
        user_in.accessibility_preferences.profile
        == AccessibilityProfileType.DYSLEXIA
    )


def test_user_response_serialization():
    """Valida a serialização para UserResponse."""
    now = datetime.datetime.now(datetime.timezone.utc)
    pref_resp = AccessibilityPreferencesResponse(
        id='pref-123',
        user_id='user-123',
        profile=AccessibilityProfileType.UNIVERSAL,
        plain_language=False,
        include_glossary=False,
        highlight_key_points=True,
        font_family='system-ui',
        font_size='normal',
        line_spacing='normal',
        high_contrast=False,
        created_at=now,
        updated_at=now,
    )
    user_resp = UserResponse(
        id='user-123',
        email='resposta@sina.edu.br',
        full_name='Nome Resposta',
        role=UserRole.TEACHER,
        is_active=True,
        version_id=1,
        created_at=now,
        updated_at=now,
        accessibility_preferences=pref_resp,
    )

    assert user_resp.id == 'user-123'
    assert user_resp.role == UserRole.TEACHER
    assert user_resp.accessibility_preferences.font_family == 'system-ui'


def test_user_update_schema():
    """Valida campos opcionais no schema de atualização."""
    update_data = UserUpdate(full_name='Nome Modificado', role=UserRole.ADMIN)
    assert update_data.full_name == 'Nome Modificado'
    assert update_data.role == UserRole.ADMIN
    assert update_data.password is None
    assert update_data.is_active is None


@pytest.mark.parametrize('value', ['normal', 'large', 'larger'])
def test_font_size_accepts_valid_values(value):
    """font_size aceita normal, large e larger."""
    prefs = AccessibilityPreferencesCreate(font_size=value)
    assert prefs.font_size == FontSize(value)


@pytest.mark.parametrize('value', ['medium', 'small', 'extra-large', 'x'])
def test_font_size_rejects_invalid_values(value):
    """font_size recusa qualquer valor fora do vocabulário novo."""
    with pytest.raises(ValidationError):
        AccessibilityPreferencesCreate(font_size=value)


@pytest.mark.parametrize('value', ['normal', 'relaxed'])
def test_line_spacing_accepts_valid_values(value):
    """line_spacing aceita normal e relaxed."""
    prefs = AccessibilityPreferencesCreate(line_spacing=value)
    assert prefs.line_spacing == LineSpacing(value)


@pytest.mark.parametrize('value', ['double', 'wide', 'x'])
def test_line_spacing_rejects_invalid_values(value):
    """line_spacing recusa qualquer valor fora do vocabulário novo."""
    with pytest.raises(ValidationError):
        AccessibilityPreferencesCreate(line_spacing=value)


def test_accessibility_preferences_defaults():
    """font_size, line_spacing, dyslexia_font e auto_audio usam os padrões corretos."""
    prefs = AccessibilityPreferencesCreate()
    assert prefs.font_size == FontSize.NORMAL
    assert prefs.line_spacing == LineSpacing.NORMAL
    assert prefs.dyslexia_font is False
    assert prefs.auto_audio is False


def test_accessibility_preferences_new_booleans_are_settable():
    """dyslexia_font e auto_audio aceitam True."""
    prefs = AccessibilityPreferencesCreate(dyslexia_font=True, auto_audio=True)
    assert prefs.dyslexia_font is True
    assert prefs.auto_audio is True


def test_accessibility_preferences_update_accepts_new_fields():
    """AccessibilityPreferencesUpdate aceita os campos novos como opcionais."""
    update = AccessibilityPreferencesUpdate(
        font_size='larger',
        line_spacing='relaxed',
        dyslexia_font=True,
        auto_audio=True,
    )
    assert update.font_size == FontSize.LARGER
    assert update.line_spacing == LineSpacing.RELAXED
    assert update.dyslexia_font is True
    assert update.auto_audio is True


def test_llm_key_accepts_up_to_512_characters():
    assert len(LLMKeyUpdate(gemini_api_key='k' * 512).gemini_api_key) == 512


def test_llm_key_rejects_more_than_512_characters():
    with pytest.raises(ValidationError):
        LLMKeyUpdate(gemini_api_key='k' * 513)


def test_llm_key_accepts_empty_string_to_remove_the_key():
    assert not LLMKeyUpdate(gemini_api_key='').gemini_api_key


def test_user_response_reports_no_llm_key_by_default():
    now = datetime.datetime.now(datetime.timezone.utc)
    user_resp = UserResponse(
        id='user-1',
        email='aluno@sina.edu.br',
        full_name='Aluno',
        version_id=1,
        created_at=now,
        updated_at=now,
    )

    assert user_resp.llm_key_configurada is False
