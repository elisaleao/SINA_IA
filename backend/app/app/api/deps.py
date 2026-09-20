"""Provedores de dependências reutilizáveis para rotas FastAPI."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.protocols import LLMClientProtocol, TTSClientProtocol
from app.database import AsyncSessionLocal
from app.services.audio_service import AudioService
from app.services.ingestion_service import IngestionService
from app.services.llm_service import LLMService

_default_llm = LLMService()
_default_tts = AudioService()
_default_ingestion = IngestionService()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Injeta uma sessão assíncrona do SQLAlchemy no ciclo de vida da requisição."""
    async with AsyncSessionLocal() as session:
        yield session


def get_llm_client() -> LLMClientProtocol:
    """Retorna o cliente LLM padrão (substituível via app.dependency_overrides)."""
    return _default_llm


def get_tts_client() -> TTSClientProtocol:
    """Retorna o cliente TTS padrão (substituível via app.dependency_overrides)."""
    return _default_tts


def get_ingestion_service() -> IngestionService:
    """Retorna o serviço de ingestão e OCR (substituível via app.dependency_overrides)."""
    return _default_ingestion
