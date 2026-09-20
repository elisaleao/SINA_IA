"""Criação inicial das tabelas usuarios e documentos

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-20 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabela usuarios
    op.create_table(
        'usuarios',
        sa.Column(
            'id', sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column(
            'role',
            sa.String(length=50),
            nullable=False,
            server_default='aluno',
        ),
        sa.Column(
            'is_active', sa.Boolean(), nullable=False, server_default=sa.true()
        ),
        sa.Column(
            'version_id', sa.Integer(), nullable=False, server_default='1'
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        op.f('ix_usuarios_email'), 'usuarios', ['email'], unique=True
    )

    # 2. Tabela documentos
    op.create_table(
        'documentos',
        sa.Column(
            'id', sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column(
            'user_id',
            sa.String(length=36),
            sa.ForeignKey('usuarios.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('raw_markdown', sa.Text(), nullable=False),
        sa.Column('accessible_text', sa.Text(), nullable=False),
        sa.Column(
            'version_id', sa.Integer(), nullable=False, server_default='1'
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        op.f('ix_documentos_user_id'), 'documentos', ['user_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_documentos_user_id'), table_name='documentos')
    op.drop_table('documentos')
    op.drop_index(op.f('ix_usuarios_email'), table_name='usuarios')
    op.drop_table('usuarios')
