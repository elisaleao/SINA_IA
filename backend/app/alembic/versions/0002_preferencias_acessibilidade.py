"""Criação da tabela preferencias_acessibilidade

Revision ID: 0002_preferencias
Revises: 0001_initial
Create Date: 2026-09-20 12:05:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0002_preferencias'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'preferencias_acessibilidade',
        sa.Column(
            'id', sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column(
            'user_id',
            sa.String(length=36),
            sa.ForeignKey('usuarios.id', ondelete='CASCADE'),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            'profile',
            sa.String(length=50),
            nullable=False,
            server_default='visual',
        ),
        sa.Column(
            'plain_language',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            'include_glossary',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            'highlight_key_points',
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            'font_family',
            sa.String(length=50),
            nullable=False,
            server_default='system-ui',
        ),
        sa.Column(
            'font_size',
            sa.String(length=20),
            nullable=False,
            server_default='medium',
        ),
        sa.Column(
            'line_spacing',
            sa.String(length=20),
            nullable=False,
            server_default='normal',
        ),
        sa.Column(
            'high_contrast',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
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
        op.f('ix_preferencias_acessibilidade_user_id'),
        'preferencias_acessibilidade',
        ['user_id'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_preferencias_acessibilidade_user_id'),
        table_name='preferencias_acessibilidade',
    )
    op.drop_table('preferencias_acessibilidade')
