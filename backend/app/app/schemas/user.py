import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import AccessibilityProfileType


class UserRole(str, Enum):
    STUDENT = 'aluno'
    TEACHER = 'professor'
    ADMIN = 'admin'


class AccessibilityPreferencesBase(BaseModel):
    profile: AccessibilityProfileType = Field(
        default=AccessibilityProfileType.VISUAL,
        description='Perfil prioritário de acessibilidade',
    )
    plain_language: bool = Field(
        default=False,
        description='Simplificação textual e vocabulário acessível',
    )
    include_glossary: bool = Field(
        default=False,
        description='Glossário automático de termos técnicos',
    )
    highlight_key_points: bool = Field(
        default=True,
        description='Destaque visual de ideias centrais',
    )
    font_family: str = Field(
        default='system-ui',
        description='Família tipográfica adaptada (ex: opendyslexic)',
    )
    font_size: str = Field(
        default='medium',
        description='Tamanho da fonte (small, medium, large, extra-large)',
    )
    line_spacing: str = Field(
        default='normal',
        description='Espaçamento entre linhas (normal, relaxed, double)',
    )
    high_contrast: bool = Field(
        default=False,
        description='Modo de alto contraste para baixa visão',
    )
    vlibras_active: bool = Field(
        default=False,
        description='Ativação do tradutor de Libras (VLibras) sob demanda',
    )


class AccessibilityPreferencesCreate(AccessibilityPreferencesBase):
    pass


class AccessibilityPreferencesUpdate(BaseModel):
    profile: Optional[AccessibilityProfileType] = None
    plain_language: Optional[bool] = None
    include_glossary: Optional[bool] = None
    highlight_key_points: Optional[bool] = None
    font_family: Optional[str] = None
    font_size: Optional[str] = None
    line_spacing: Optional[str] = None
    high_contrast: Optional[bool] = None
    vlibras_active: Optional[bool] = None


class AccessibilityPreferencesResponse(AccessibilityPreferencesBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    accessibility_preferences: Optional[AccessibilityPreferencesCreate] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: str
    version_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    accessibility_preferences: Optional[AccessibilityPreferencesResponse] = (
        None
    )

    model_config = ConfigDict(from_attributes=True)
