"""Converte preferências para o vocabulário novo e adiciona dyslexia_font e auto_audio

Revision ID: 0007_preferencias_vocabulario
Revises: 0006_materiais_status
Create Date: 2026-09-22 21:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_preferencias_vocabulario"
down_revision: Union[str, None] = "0006_materiais_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("preferencias_acessibilidade") as batch:
        batch.add_column(
            sa.Column(
                "dyslexia_font",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            )
        )
        batch.add_column(
            sa.Column(
                "auto_audio",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            )
        )

    op.execute(
        "UPDATE preferencias_acessibilidade "
        "SET font_size = 'larger' WHERE font_size = 'extra-large'"
    )
    op.execute(
        "UPDATE preferencias_acessibilidade "
        "SET font_size = 'normal' "
        "WHERE font_size NOT IN ('normal', 'large', 'larger')"
    )
    op.execute(
        "UPDATE preferencias_acessibilidade "
        "SET line_spacing = 'relaxed' WHERE line_spacing = 'double'"
    )
    op.execute(
        "UPDATE preferencias_acessibilidade "
        "SET line_spacing = 'normal' "
        "WHERE line_spacing NOT IN ('normal', 'relaxed')"
    )

    with op.batch_alter_table("preferencias_acessibilidade") as batch:
        batch.alter_column(
            "font_size",
            existing_type=sa.String(length=20),
            server_default="normal",
        )


def downgrade() -> None:
    with op.batch_alter_table("preferencias_acessibilidade") as batch:
        batch.drop_column("auto_audio")
        batch.drop_column("dyslexia_font")
        batch.alter_column(
            "font_size",
            existing_type=sa.String(length=20),
            server_default="medium",
        )
