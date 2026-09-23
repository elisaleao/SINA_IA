import os
import sqlite3
import tempfile
import uuid
from pathlib import Path

from alembic.config import Config

from alembic import command


def _alembic_config(sqlite_url: str) -> Config:
    alembic_ini_path = Path(__file__).resolve().parents[1] / 'alembic.ini'
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option('sqlalchemy.url', sqlite_url)
    return alembic_cfg


def test_alembic_migrations_reversibility():
    """Garante que as migrações 0001 e 0002 executam e revertem (upgrade e downgrade) sem erros."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name

    try:
        sqlite_url = f'sqlite:///{db_path}'
        alembic_cfg = _alembic_config(sqlite_url)

        # 1. Executa upgrade até o head (todas as migrações)
        command.upgrade(alembic_cfg, 'head')

        # 2. Reverte até a base (nenhuma migração ativa)
        command.downgrade(alembic_cfg, 'base')

        # 3. Reexecuta upgrade para certificar que downgrade limpou o estado perfeitamente
        command.upgrade(alembic_cfg, 'head')
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


def test_migration_0007_converts_old_vocabulary_and_reverts():
    """Migração 0007 converte valores antigos de font_size/line_spacing e reverte sem erro."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name

    cases = [
        ('medium', 'normal', 'normal', 'normal'),
        ('small', 'normal', 'normal', 'normal'),
        ('extra-large', 'normal', 'larger', 'normal'),
        ('normal', 'double', 'normal', 'relaxed'),
        ('unknown-size', 'unknown-spacing', 'normal', 'normal'),
    ]

    try:
        sqlite_url = f'sqlite:///{db_path}'
        alembic_cfg = _alembic_config(sqlite_url)

        # 1. Sobe até a migração anterior, antes do vocabulário novo
        command.upgrade(alembic_cfg, '0006_materiais_status')

        connection = sqlite3.connect(db_path)
        row_ids = []
        try:
            for font_size, line_spacing, _, _ in cases:
                user_id = str(uuid.uuid4())
                pref_id = str(uuid.uuid4())
                connection.execute(
                    'INSERT INTO usuarios '
                    '(id, email, hashed_password, full_name) '
                    'VALUES (?, ?, ?, ?)',
                    (user_id, f'{user_id}@sina.edu.br', 'hash', 'Teste'),
                )
                connection.execute(
                    'INSERT INTO preferencias_acessibilidade '
                    '(id, user_id, font_size, line_spacing) '
                    'VALUES (?, ?, ?, ?)',
                    (pref_id, user_id, font_size, line_spacing),
                )
                row_ids.append(pref_id)
            connection.commit()
        finally:
            connection.close()

        # 2. Sobe até o head, aplicando a migração 0007
        command.upgrade(alembic_cfg, 'head')

        connection = sqlite3.connect(db_path)
        try:
            for pref_id, (
                _,
                _,
                expected_font_size,
                expected_line_spacing,
            ) in zip(row_ids, cases):
                cursor = connection.execute(
                    'SELECT font_size, line_spacing, dyslexia_font, auto_audio '
                    'FROM preferencias_acessibilidade WHERE id = ?',
                    (pref_id,),
                )
                got_font_size, got_line_spacing, dyslexia_font, auto_audio = (
                    cursor.fetchone()
                )
                assert got_font_size == expected_font_size
                assert got_line_spacing == expected_line_spacing
                assert dyslexia_font == 0
                assert auto_audio == 0
            assert connection.execute(
                'SELECT COUNT(*) FROM preferencias_acessibilidade'
            ).fetchone()[0] == len(cases)
        finally:
            connection.close()

        # 3. Reverte a 0007 sem erro e confirma que as colunas novas somem
        command.downgrade(alembic_cfg, '0006_materiais_status')

        connection = sqlite3.connect(db_path)
        try:
            columns = {
                row[1]
                for row in connection.execute(
                    'PRAGMA table_info(preferencias_acessibilidade)'
                )
            }
            assert 'dyslexia_font' not in columns
            assert 'auto_audio' not in columns
        finally:
            connection.close()

        # 4. Reaplica o upgrade para certificar que a reversão não deixou resíduo
        command.upgrade(alembic_cfg, 'head')
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
