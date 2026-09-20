import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db, get_llm_client, get_tts_client
from app.database import Base
from app.main import app
from app.services.fakes import FakeLLMClient, FakeTTSClient

TEST_DATABASE_URL = 'sqlite+aiosqlite:///:memory:'


@pytest.fixture
def fake_llm():
    """Retorna uma instância de FakeLLMClient determinística."""
    return FakeLLMClient()


@pytest.fixture
def fake_tts():
    """Retorna uma instância de FakeTTSClient determinística."""
    return FakeTTSClient()


@pytest_asyncio.fixture
async def test_engine():
    """Cria o banco de dados em memória e inicializa todas as tabelas."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_engine):
    """Gera uma sessão de banco ativa para o escopo do teste individual."""
    session_maker = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_engine, fake_llm, fake_tts):
    """Gera um cliente de teste HTTPX com banco em memória e fakes padrão."""
    session_maker = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_llm_client] = lambda: fake_llm
    app.dependency_overrides[get_tts_client] = lambda: fake_tts

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url='http://test'
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
