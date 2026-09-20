"""Adiciona campo vlibras_active nas preferências de acessibilidade

Revision ID: 0005_vlibras_preference
Revises: 0004_exercicios
Create Date: 2026-09-20 20:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_vlibras_preference"
down_revision: Union[str, None] = "0004_exercicios"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "preferencias_acessibilidade",
        sa.Column(
            "vlibras_active",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("preferencias_acessibilidade", "vlibras_active")
