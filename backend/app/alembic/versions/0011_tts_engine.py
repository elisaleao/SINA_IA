"""Adiciona motor de síntese de voz (online ou local) às preferências

Revision ID: 0011_tts_engine
Revises: 0010_nivel_exercicios
Create Date: 2026-09-24 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0011_tts_engine"
down_revision: Union[str, None] = "0010_nivel_exercicios"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("preferencias_acessibilidade") as batch:
        batch.add_column(
            sa.Column(
                "tts_engine",
                sa.String(length=20),
                server_default="online",
                nullable=False,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("preferencias_acessibilidade") as batch:
        batch.drop_column("tts_engine")
