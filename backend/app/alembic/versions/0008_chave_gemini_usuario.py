"""Cria a tabela da chave pessoal do Gemini, cifrada, por usuário

Revision ID: 0008_chave_gemini_usuario
Revises: 0007_preferencias_vocabulario
Create Date: 2026-09-23 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_chave_gemini_usuario"
down_revision: Union[str, None] = "0007_preferencias_vocabulario"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chave_gemini_usuario",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("gemini_api_key_cifrada", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["usuarios.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_chave_gemini_usuario_user_id"),
        "chave_gemini_usuario",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_chave_gemini_usuario_user_id"),
        table_name="chave_gemini_usuario",
    )
    op.drop_table("chave_gemini_usuario")
