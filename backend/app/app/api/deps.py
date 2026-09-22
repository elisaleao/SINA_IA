"""Provedores de dependências reutilizáveis para rotas FastAPI."""

from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.accessibility.pipeline import AccessibilityPipeline
from app.core.config import settings
from app.core.protocols import LLMClientProtocol, TTSClientProtocol
from app.core.security import decode_access_token
from app.database import AsyncSessionLocal, DocumentRecord, UserRecord
from app.schemas.user import UserRole
from app.services.gemini_service import GeminiService
from app.services.ingestion_service import IngestionService
from app.services.llm_service import LLMService
from app.services.material_service import MaterialStorage
from app.services.tts_service import TTSService

# Uma instância de cada integração externa, compartilhada por todas as rotas
_default_gemini = GeminiService()
_default_llm = LLMService(gemini=_default_gemini)
_default_tts = TTSService()
_default_ingestion = IngestionService(gemini=_default_gemini)
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


def get_tts_service() -> TTSService:
    """Serviço de voz completo, usado pelo pipeline de acessibilidade."""
    return _default_tts


def get_gemini_service() -> GeminiService:
    """Cliente Gemini compartilhado (substituível via app.dependency_overrides)."""
    return _default_gemini


def get_material_pipeline(
    storage: MaterialStorage = Depends(get_material_storage),
) -> AccessibilityPipeline:
    """Pipeline de acessibilidade gravando resultados no armazenamento de materiais."""
    return AccessibilityPipeline(
        ai=_default_gemini, tts=_default_tts, store=storage.results
    )


def get_llm_client() -> LLMClientProtocol:
    """Retorna o cliente LLM padrão (substituível via app.dependency_overrides)."""
    return _default_llm


def get_tts_client() -> TTSClientProtocol:
    """Retorna o cliente TTS padrão (substituível via app.dependency_overrides)."""
    return _default_tts


def get_ingestion_service() -> IngestionService:
    """Retorna o serviço de ingestão e OCR (substituível via app.dependency_overrides)."""
    return _default_ingestion


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


def can_access_document(
    document: DocumentRecord, user: Optional[UserRecord]
) -> bool:
    """Documento sem dono é público; com dono, só o dono ou um admin acessam."""
    if document.user_id is None:
        return True
    if user is None:
        return False
    return user.id == document.user_id or user.role == UserRole.ADMIN.value
