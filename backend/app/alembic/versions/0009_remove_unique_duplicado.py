"""Remove constraints UNIQUE duplicadas pelos índices únicos no PostgreSQL

Revision ID: 0009_remove_unique_duplicado
Revises: 0008_chave_gemini_usuario
Create Date: 2026-09-23 20:30:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_remove_unique_duplicado"
down_revision: Union[str, None] = "0008_chave_gemini_usuario"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DUPLICATES = [
    ("preferencias_acessibilidade", "preferencias_acessibilidade_user_id_key", "user_id"),
    ("refresh_tokens", "refresh_tokens_token_hash_key", "token_hash"),
]


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table, constraint, _ in DUPLICATES:
        op.drop_constraint(constraint, table, type_="unique")


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table, constraint, column in DUPLICATES:
        op.create_unique_constraint(constraint, table, [column])
