"""Provedores de dependências reutilizáveis para rotas FastAPI."""

from typing import AsyncGenerator, Callable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.protocols import (
    AccessibilityAIProtocol,
    LLMClientProtocol,
    TTSClientProtocol,
)
from app.core.security import decode_access_token
from app.database import AsyncSessionLocal, DocumentRecord, UserRecord
from app.schemas.user import UserRole
from app.services.accessibility_pipeline import AccessibilityPipeline
from app.services.ai_provider import FallbackAIClient
from app.services.document_extractor import DocumentExtractor
from app.services.file_store import GeneratedFileStore
from app.services.gemini_service import GeminiService
from app.services.groq_service import GroqService
from app.services.ingestion_service import (
    INGESTION_OCR_PROMPT,
    IngestionService,
)
from app.services.llm_key_service import LLMKeyService
from app.services.llm_service import LLMService
from app.services.material_service import (
    MaterialStorage,
    MaterialUploadService,
)
from app.services.tts_service import ONLINE, TTSService

# Integrações compartilhadas; o cliente de IA é montado por requisição (ADR-0003)
_default_groq = GroqService()
security_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Injeta uma sessão assíncrona do SQLAlchemy no ciclo de vida da requisição."""
    async with AsyncSessionLocal() as session:
        yield session


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Fábrica de sessões para tarefas em segundo plano (fora da requisição)."""
    return AsyncSessionLocal


def get_material_storage() -> MaterialStorage:
    """Armazenamento de materiais (substituível nos testes)."""
    return MaterialStorage(settings.materials_dir)


def get_material_upload_service(
    storage: MaterialStorage = Depends(get_material_storage),
) -> MaterialUploadService:
    """Caso de uso de envio de materiais sobre o armazenamento injetado."""
    return MaterialUploadService(storage)


def get_generated_file_store() -> GeneratedFileStore:
    """Pasta dos arquivos gerados pelo pipeline de /process-stream."""
    return GeneratedFileStore()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        security_scheme
    ),
    db: AsyncSession = Depends(get_db),
) -> UserRecord:
    """Extrai e valida o token Bearer JWT e recupera o usuário ativo no banco."""
    if not credentials or credentials.scheme.lower() != 'bearer':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Credenciais de autenticação não fornecidas ou inválidas.',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Token inválido: sujeito ausente.',
                headers={'WWW-Authenticate': 'Bearer'},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token inválido ou expirado.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    stmt = (
        select(UserRecord)
        .options(
            selectinload(UserRecord.accessibility_preferences),
            selectinload(UserRecord.documents),
        )
        .where(UserRecord.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Usuário não encontrado.',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Usuário inativo no sistema.',
        )
    return user


def require_role(allowed_roles: list[UserRole] | list[str]):
    """Fábrica de dependência para controle de acesso baseado em papéis (RBAC)."""
    roles_str = [
        r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles
    ]

    async def role_checker(
        current_user: UserRecord = Depends(get_current_user),
    ) -> UserRecord:
        if current_user.role not in roles_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Permissão insuficiente para acessar este recurso.',
            )
        return current_user

    return role_checker


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        security_scheme
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[UserRecord]:
    """Retorna o usuário logado caso exista credencial válida, ou None caso anônimo."""
    if not credentials or credentials.scheme.lower() != 'bearer':
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get('sub')
        if not user_id:
            return None
        stmt = select(UserRecord).where(UserRecord.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    except Exception:
        return None


def _tts_for(user: Optional[UserRecord]) -> TTSService:
    prefs = user.accessibility_preferences if user else None
    return TTSService(prefer=prefs.tts_engine if prefs else ONLINE)


def get_tts_service(
    user: Optional[UserRecord] = Depends(get_optional_user),
) -> TTSService:
    """Voz do pipeline no motor que o usuário escolheu (ADR-0004)."""
    return _tts_for(user)


def get_tts_client(
    user: Optional[UserRecord] = Depends(get_optional_user),
) -> TTSClientProtocol:
    """Cliente TTS de /api/content no motor que o usuário escolheu."""
    return _tts_for(user)


def can_access_document(
    document: DocumentRecord, user: Optional[UserRecord]
) -> bool:
    """Documento sem dono é público; com dono, só o dono ou um admin acessam."""
    if document.user_id is None:
        return True
    if user is None:
        return False
    return user.id == document.user_id or user.role == UserRole.ADMIN.value


def get_llm_key_service() -> LLMKeyService:
    """Caso de uso da chave pessoal do Gemini (substituível nos testes)."""
    return LLMKeyService()


def get_fallback_ai() -> AccessibilityAIProtocol:
    """IA gratuita usada sem chave pessoal ou quando ela falha."""
    return _default_groq


def build_personal_ai(api_key: str) -> AccessibilityAIProtocol:
    """Cliente do Gemini com a chave do usuário."""
    return GeminiService(api_key=api_key)


def get_personal_ai_factory() -> Callable[[str], AccessibilityAIProtocol]:
    """Fábrica do cliente pessoal (substituível nos testes)."""
    return build_personal_ai


async def get_ai_client(
    user: Optional[UserRecord] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    llm_keys: LLMKeyService = Depends(get_llm_key_service),
    fallback: AccessibilityAIProtocol = Depends(get_fallback_ai),
    personal_ai: Callable[[str], AccessibilityAIProtocol] = Depends(
        get_personal_ai_factory
    ),
) -> FallbackAIClient:
    """Chave pessoal do Gemini quando existe; senão, o fallback gratuito."""
    api_key = await llm_keys.get_decrypted(user, db)
    primary = personal_ai(api_key) if api_key else None
    return FallbackAIClient(primary=primary, fallback=fallback)


def get_material_pipeline(
    storage: MaterialStorage = Depends(get_material_storage),
    ai: FallbackAIClient = Depends(get_ai_client),
    tts: TTSService = Depends(get_tts_service),
) -> AccessibilityPipeline:
    """Pipeline de acessibilidade gravando resultados no armazenamento de materiais."""
    return AccessibilityPipeline(
        ai=ai,
        tts=tts,
        store=storage.results,
        extractor=DocumentExtractor(ai, max_visual_candidates=4),
    )


def get_accessibility_pipeline(
    store: GeneratedFileStore = Depends(get_generated_file_store),
    ai: FallbackAIClient = Depends(get_ai_client),
    tts: TTSService = Depends(get_tts_service),
) -> AccessibilityPipeline:
    """Pipeline de /process-stream com o cliente de IA da requisição."""
    return AccessibilityPipeline(
        ai=ai,
        tts=tts,
        store=store,
        extractor=DocumentExtractor(ai, max_visual_candidates=4),
    )


def get_llm_client(
    ai: FallbackAIClient = Depends(get_ai_client),
) -> LLMClientProtocol:
    """Geração de conteúdo com o cliente de IA da requisição."""
    return LLMService(gemini=ai)


def get_ingestion_service(
    ai: FallbackAIClient = Depends(get_ai_client),
) -> IngestionService:
    """Ingestão e OCR de /api/documents com o cliente de IA da requisição."""
    return IngestionService(
        gemini=ai,
        extractor=DocumentExtractor(
            ai,
            max_visual_candidates=0,
            ocr_prompt=INGESTION_OCR_PROMPT,
        ),
    )
