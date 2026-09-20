"""Roteadores da API."""

from app.accessibility.router import router as accessibility_router
from app.api.routers.audio import router as audio_router
from app.api.routers.auth import router as auth_router
from app.api.routers.content import router as content_router
from app.api.routers.documents import router as documents_router
from app.api.routers.exercises import router as exercises_router
from app.api.routers.health import router as health_router

__all__ = [
    'accessibility_router',
    'audio_router',
    'auth_router',
    'content_router',
    'documents_router',
    'exercises_router',
    'health_router',
]
