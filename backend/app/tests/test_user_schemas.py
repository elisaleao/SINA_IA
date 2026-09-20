import datetime

from app.models import AccessibilityProfileType
from app.schemas.user import (
    AccessibilityPreferencesCreate,
    AccessibilityPreferencesResponse,
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
        font_size='medium',
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
