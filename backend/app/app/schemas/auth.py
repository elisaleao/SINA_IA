from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import (
    AccessibilityPreferencesCreate,
    UserResponse,
    UserRole,
)


class RegisterRequest(BaseModel):
    email: EmailStr = Field(description='E-mail corporativo ou educacional')
    password: str = Field(
        min_length=8, description='Senha com no mínimo 8 caracteres'
    )
    full_name: str = Field(
        min_length=2, description='Nome completo do usuário'
    )
    role: UserRole = Field(
        default=UserRole.STUDENT, description='Papel no sistema'
    )
    accessibility_preferences: Optional[AccessibilityPreferencesCreate] = None


class LoginRequest(BaseModel):
    email: EmailStr = Field(description='E-mail cadastrado')
    password: str = Field(description='Senha de acesso')


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str = Field(description='Token de atualização de sessão')


class LogoutRequest(BaseModel):
    refresh_token: str = Field(description='Token de atualização a revogar')


class AuthStatusResponse(BaseModel):
    message: str


__all__ = [
    'RegisterRequest',
    'LoginRequest',
    'TokenResponse',
    'RefreshRequest',
    'LogoutRequest',
    'AuthStatusResponse',
    'UserResponse',
]
