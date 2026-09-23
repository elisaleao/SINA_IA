import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, get_llm_key_service
from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.database import (
    AccessibilityPreferencesRecord,
    RefreshTokenRecord,
    UserRecord,
)
from app.schemas.auth import (
    AuthStatusResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.user import (
    AccessibilityPreferencesCreate,
    AccessibilityPreferencesResponse,
    AccessibilityPreferencesUpdate,
    LLMKeyStatus,
    LLMKeyUpdate,
    UserRole,
)
from app.services.llm_key_service import (
    InvalidLLMKey,
    LLMKeyCheckUnavailable,
    LLMKeyService,
)

router = APIRouter(tags=['Autenticação'])


@router.post(
    '/auth/register',
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Registro de novo usuário',
)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Registra um novo usuário no sistema, criando preferências iniciais e emitindo tokens."""
    if payload.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='O cadastro público não permite criar administradores.',
        )

    existing_stmt = select(UserRecord).where(UserRecord.email == payload.email)
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Já existe um usuário cadastrado com este e-mail.',
        )

    user_id = str(uuid.uuid4())
    user = UserRecord(
        id=user_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role.value,
        is_active=True,
    )
    db.add(user)

    # Cria preferências de acessibilidade iniciais
    # model_dump garante que todo campo do schema chegue ao banco
    prefs_data = (
        payload.accessibility_preferences or AccessibilityPreferencesCreate()
    )
    prefs = AccessibilityPreferencesRecord(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **prefs_data.model_dump(mode='json'),
    )
    db.add(prefs)

    # Emite tokens com nova família de refresh
    family_id = str(uuid.uuid4())
    raw_refresh = generate_refresh_token()
    token_record = RefreshTokenRecord(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=hash_refresh_token(raw_refresh),
        family_id=family_id,
        revoked=False,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_DAYS),
    )
    db.add(token_record)
    await db.commit()

    access_token = create_access_token(subject=user_id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type='bearer',
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
    )


@router.post(
    '/auth/login',
    response_model=TokenResponse,
    summary='Autenticação por e-mail e senha',
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Autentica o usuário e emite par de tokens (access e refresh rotativo)."""
    stmt = select(UserRecord).where(UserRecord.email == payload.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Credenciais inválidas. Verifique e-mail e senha.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Usuário inativo no sistema.',
        )

    family_id = str(uuid.uuid4())
    raw_refresh = generate_refresh_token()
    token_record = RefreshTokenRecord(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        family_id=family_id,
        revoked=False,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_DAYS),
    )
    db.add(token_record)
    await db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type='bearer',
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
    )


@router.post(
    '/auth/refresh',
    response_model=TokenResponse,
    summary='Rotação de refresh token com detecção de reuso',
)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Rotaciona o refresh token. Se o token já foi usado, revoga toda a família por segurança."""
    hashed = hash_refresh_token(payload.refresh_token)
    stmt = (
        select(RefreshTokenRecord)
        .options(selectinload(RefreshTokenRecord.user))
        .where(RefreshTokenRecord.token_hash == hashed)
    )
    res = await db.execute(stmt)
    token_record = res.scalar_one_or_none()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token de atualização inválido ou inexistente.',
        )

    # Detecção de reuso malicioso: token já revogado
    if token_record.revoked:
        revoke_all = (
            update(RefreshTokenRecord)
            .where(RefreshTokenRecord.family_id == token_record.family_id)
            .values(revoked=True)
        )
        await db.execute(revoke_all)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Tentativa de reuso de token detectada. Sessão revogada por segurança.',
        )

    # Verifica expiração
    now = datetime.now(timezone.utc)
    token_expires_at = token_record.expires_at
    if token_expires_at.tzinfo is None:
        token_expires_at = token_expires_at.replace(tzinfo=timezone.utc)

    if token_expires_at < now:
        token_record.revoked = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token de atualização expirado.',
        )

    # Revoga o token atual e gera um novo mantendo a mesma family_id
    token_record.revoked = True

    new_raw_refresh = generate_refresh_token()
    new_token_record = RefreshTokenRecord(
        id=str(uuid.uuid4()),
        user_id=token_record.user_id,
        token_hash=hash_refresh_token(new_raw_refresh),
        family_id=token_record.family_id,
        revoked=False,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_DAYS),
    )
    db.add(new_token_record)
    await db.commit()

    user = token_record.user
    access_token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_raw_refresh,
        token_type='bearer',
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
    )


@router.post(
    '/auth/logout',
    response_model=AuthStatusResponse,
    summary='Encerramento de sessão e revogação de refresh token',
)
async def logout(
    payload: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthStatusResponse:
    """Revoga o refresh token informado, invalidando a renovação da sessão."""
    hashed = hash_refresh_token(payload.refresh_token)
    stmt = (
        update(RefreshTokenRecord)
        .where(RefreshTokenRecord.token_hash == hashed)
        .values(revoked=True)
    )
    await db.execute(stmt)
    await db.commit()
    return AuthStatusResponse(message='Sessão encerrada com sucesso.')


@router.get(
    '/users/me',
    response_model=UserResponse,
    summary='Obter dados e preferências do usuário logado',
)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    llm_keys: LLMKeyService = Depends(get_llm_key_service),
) -> UserResponse:
    """Retorna os dados cadastrais e as preferências UDL do usuário autenticado."""
    configured = await llm_keys.is_configured(current_user, db)
    return UserResponse.model_validate(current_user).model_copy(
        update={'llm_key_configurada': configured}
    )


@router.put(
    '/users/me/llm-key',
    response_model=LLMKeyStatus,
    summary='Salvar a chave pessoal do Gemini do usuário logado',
)
async def save_my_llm_key(
    payload: LLMKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    llm_keys: LLMKeyService = Depends(get_llm_key_service),
) -> LLMKeyStatus:
    """Testa a chave no Gemini antes de gravar; string vazia remove a chave."""
    if not payload.gemini_api_key:
        await llm_keys.remove(current_user, db)
        return LLMKeyStatus(llm_key_configurada=False)
    try:
        await llm_keys.save(current_user, payload.gemini_api_key, db)
    except InvalidLLMKey as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='A chave do Gemini foi recusada. Confira se está correta '
            'e ativa.',
        ) from exc
    except LLMKeyCheckUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='Não foi possível testar a chave agora. Tente de novo em '
            'instantes.',
        ) from exc
    return LLMKeyStatus(llm_key_configurada=True)


@router.delete(
    '/users/me/llm-key',
    status_code=status.HTTP_204_NO_CONTENT,
    summary='Remover a chave pessoal do Gemini do usuário logado',
)
async def delete_my_llm_key(
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    llm_keys: LLMKeyService = Depends(get_llm_key_service),
) -> None:
    """Apaga a chave cifrada; as próximas chamadas usam o fallback."""
    await llm_keys.remove(current_user, db)


@router.patch(
    '/users/me/preferences',
    response_model=AccessibilityPreferencesResponse,
    summary='Atualizar preferências de acessibilidade do usuário logado',
)
async def update_my_preferences(
    payload: AccessibilityPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> AccessibilityPreferencesResponse:
    """Atualiza de forma parcial as preferências UDL e de acessibilidade (como VLibras)."""
    prefs = current_user.accessibility_preferences
    if not prefs:
        prefs = AccessibilityPreferencesRecord(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
        )
        db.add(prefs)
        current_user.accessibility_preferences = prefs

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if hasattr(prefs, field) and val is not None:
            resolved_val = val.value if hasattr(val, 'value') else val
            setattr(prefs, field, resolved_val)

    await db.commit()
    await db.refresh(prefs)
    return AccessibilityPreferencesResponse.model_validate(prefs)
