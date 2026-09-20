"""Criação da tabela refresh_tokens

Revision ID: 0003_refresh_tokens
Revises: 0002_preferencias
Create Date: 2026-09-20 16:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0003_refresh_tokens'
down_revision: Union[str, None] = '0002_preferencias'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'refresh_tokens',
        sa.Column(
            'id', sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column(
            'user_id',
            sa.String(length=36),
            sa.ForeignKey('usuarios.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'token_hash',
            sa.String(length=64),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            'family_id',
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            'revoked',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            'expires_at',
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index(
        'ix_refresh_tokens_family_id', 'refresh_tokens', ['family_id']
    )
    op.create_index(
        'ix_refresh_tokens_token_hash',
        'refresh_tokens',
        ['token_hash'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('ix_refresh_tokens_token_hash', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_family_id', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
