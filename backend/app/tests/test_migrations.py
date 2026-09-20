import os
import tempfile
from pathlib import Path

from alembic.config import Config

from alembic import command


def test_alembic_migrations_reversibility():
    """Garante que as migrações 0001 e 0002 executam e revertem (upgrade e downgrade) sem erros."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name

    try:
        sqlite_url = f'sqlite:///{db_path}'
        alembic_ini_path = Path(__file__).resolve().parents[1] / 'alembic.ini'
        alembic_cfg = Config(str(alembic_ini_path))
        alembic_cfg.set_main_option('sqlalchemy.url', sqlite_url)

        # 1. Executa upgrade até o head (todas as migrações)
        command.upgrade(alembic_cfg, 'head')

        # 2. Reverte até a base (nenhuma migração ativa)
        command.downgrade(alembic_cfg, 'base')

        # 3. Reexecuta upgrade para certificar que downgrade limpou o estado perfeitamente
        command.upgrade(alembic_cfg, 'head')
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
