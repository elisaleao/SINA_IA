import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.config import settings


class Base(AsyncAttrs, DeclarativeBase):
    pass


engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class UserRecord(Base):
    """Modelo relacional de usuários com papéis RBAC e lock otimista."""

    __tablename__ = 'usuarios'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), default='aluno', nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    version_id: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __mapper_args__ = {'version_id_col': version_id}

    accessibility_preferences: Mapped[
        Optional['AccessibilityPreferencesRecord']
    ] = relationship(
        'AccessibilityPreferencesRecord',
        back_populates='user',
        uselist=False,
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    documents: Mapped[list['DocumentRecord']] = relationship(
        'DocumentRecord',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    refresh_tokens: Mapped[list['RefreshTokenRecord']] = relationship(
        'RefreshTokenRecord',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    chave_gemini: Mapped[Optional['ChaveGeminiUsuarioRecord']] = relationship(
        'ChaveGeminiUsuarioRecord',
        back_populates='user',
        uselist=False,
        cascade='all, delete-orphan',
        lazy='selectin',
    )


class AccessibilityPreferencesRecord(Base):
    """Modelo 1:1 de preferências de acessibilidade e UDL do usuário."""

    __tablename__ = 'preferencias_acessibilidade'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('usuarios.id', ondelete='CASCADE'),
        unique=True,
        nullable=False,
        index=True,
    )
    profile: Mapped[str] = mapped_column(
        String(50), default='visual', nullable=False
    )
    plain_language: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    include_glossary: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    highlight_key_points: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    font_family: Mapped[str] = mapped_column(
        String(50), default='system-ui', nullable=False
    )
    font_size: Mapped[str] = mapped_column(
        String(20), default='normal', nullable=False
    )
    line_spacing: Mapped[str] = mapped_column(
        String(20), default='normal', nullable=False
    )
    high_contrast: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    dyslexia_font: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    auto_audio: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    vlibras_active: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped['UserRecord'] = relationship(
        'UserRecord',
        back_populates='accessibility_preferences',
    )


class ChaveGeminiUsuarioRecord(Base):
    """Chave pessoal do Gemini do usuário, sempre cifrada (1:1)."""

    __tablename__ = 'chave_gemini_usuario'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('usuarios.id', ondelete='CASCADE'),
        unique=True,
        nullable=False,
        index=True,
    )
    gemini_api_key_cifrada: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped['UserRecord'] = relationship(
        'UserRecord',
        back_populates='chave_gemini',
    )


class DocumentRecord(Base):
    """Modelo de documentos ingeridos com lock otimista e auditoria."""

    __tablename__ = 'documentos'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey('usuarios.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # Nulos enquanto o material ainda não foi processado
    raw_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    accessible_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Ciclo de vida do material: enviado -> processando -> pronto | erro
    status: Mapped[str] = mapped_column(
        String(20),
        default='pronto',
        server_default='pronto',
        nullable=False,
        index=True,
    )
    erro_mensagem: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mime: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tamanho_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    sha256: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True
    )
    nivel: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    caminho_armazenamento: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    audio_arquivo: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    resultado_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # FK para ambientes entra na UX3 (#14)
    ambiente_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )
    version_id: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __mapper_args__ = {'version_id_col': version_id}

    user: Mapped[Optional['UserRecord']] = relationship(
        'UserRecord',
        back_populates='documents',
    )


class RefreshTokenRecord(Base):
    """Modelo de refresh token com rotação e família para revogação em cadeia."""

    __tablename__ = 'refresh_tokens'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('usuarios.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    family_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped['UserRecord'] = relationship(
        'UserRecord',
        back_populates='refresh_tokens',
    )


class ExerciseRecord(Base):
    """Modelo de questão de exercício/quiz acessível de engenharia."""

    __tablename__ = 'exercicios'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    materia_id: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    enunciado_falado: Mapped[str] = mapped_column(Text, nullable=False)
    codigo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linguagem: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resposta_correta: Mapped[bool] = mapped_column(Boolean, nullable=False)
    explicacao: Mapped[str] = mapped_column(Text, nullable=False)
    fonte: Mapped[str] = mapped_column(
        String(20), default='manual', nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default='publicado', nullable=False, index=True
    )
    revisado_por: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey('usuarios.id', ondelete='SET NULL'),
        nullable=True,
    )
    revisado_em: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ExerciseSessionRecord(Base):
    """Modelo de sessão de quiz com timer e cálculo de tempo no servidor."""

    __tablename__ = 'sessoes_exercicio'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('usuarios.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    materia_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True
    )
    total_questoes: Mapped[int] = mapped_column(
        Integer, default=5, nullable=False
    )
    tempo_limite_segundos: Mapped[int] = mapped_column(
        Integer, default=13, nullable=False
    )
    iniciado_em: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finalizado_em: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped['UserRecord'] = relationship('UserRecord')
    respostas: Mapped[list['ExerciseAnswerRecord']] = relationship(
        'ExerciseAnswerRecord',
        back_populates='sessao',
        cascade='all, delete-orphan',
        lazy='selectin',
    )


class ExerciseAnswerRecord(Base):
    """Modelo de resposta enviada pelo aluno em uma sessão de quiz."""

    __tablename__ = 'respostas_exercicio'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    sessao_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('sessoes_exercicio.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    exercicio_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('exercicios.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    resposta_aluno: Mapped[bool] = mapped_column(Boolean, nullable=False)
    acertou: Mapped[bool] = mapped_column(Boolean, nullable=False)
    tempo_gasto_segundos: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    respondido_em: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sessao: Mapped['ExerciseSessionRecord'] = relationship(
        'ExerciseSessionRecord',
        back_populates='respostas',
    )
    exercicio: Mapped['ExerciseRecord'] = relationship('ExerciseRecord')


async def close_db():
    """Libera o pool de conexões do engine assíncrono."""
    if engine:
        await engine.dispose()
