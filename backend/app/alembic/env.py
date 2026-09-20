import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Adiciona o diretório app ao sys.path
backend_dir = Path(__file__).resolve().parents[1]
app_dir = backend_dir / 'app'
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

from app.core.config import settings  # noqa: E402
from app.database import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    url_from_config = config.get_main_option('sqlalchemy.url')
    if url_from_config and url_from_config.strip():
        if url_from_config.startswith(
            'sqlite:///'
        ) and not url_from_config.startswith('sqlite+aiosqlite:///'):
            return url_from_config.replace(
                'sqlite:///', 'sqlite+aiosqlite:///'
            )
        if url_from_config.startswith(
            'postgresql://'
        ) and not url_from_config.startswith('postgresql+asyncpg://'):
            return url_from_config.replace(
                'postgresql://', 'postgresql+asyncpg://'
            )
        return url_from_config
    return settings.DATABASE_URL


def get_sync_url() -> str:
    url = get_url()
    if '+asyncpg' in url:
        return url.replace('+asyncpg', '')
    if '+aiosqlite' in url:
        return url.replace('+aiosqlite', '')
    return url


def run_migrations_offline() -> None:
    """Executa migrações no modo offline."""
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Executa migrações assíncronas com o motor SQLAlchemy configurado."""
    configuration = config.get_section(config.config_ini_section, {}) or {}
    configuration['sqlalchemy.url'] = get_url()

    connectable = async_engine_from_config(
        configuration,
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Executa migrações no modo online."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
