"""Schemas Pydantic para validação e serialização de dados."""

from app.schemas.user import (
    AccessibilityPreferencesBase,
    AccessibilityPreferencesCreate,
    AccessibilityPreferencesResponse,
    AccessibilityPreferencesUpdate,
    UserBase,
    UserCreate,
    UserResponse,
    UserRole,
    UserUpdate,
)

__all__ = [
    'AccessibilityPreferencesBase',
    'AccessibilityPreferencesCreate',
    'AccessibilityPreferencesResponse',
    'AccessibilityPreferencesUpdate',
    'UserBase',
    'UserCreate',
    'UserResponse',
    'UserRole',
    'UserUpdate',
]
