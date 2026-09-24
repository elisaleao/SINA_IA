"""Adiciona nível às questões e sessões e alinha o ID da matéria de lógica

Revision ID: 0010_nivel_exercicios
Revises: 0009_remove_unique_duplicado
Create Date: 2026-09-24 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010_nivel_exercicios"
down_revision: Union[str, None] = "0009_remove_unique_duplicado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("exercicios") as batch:
        batch.add_column(
            sa.Column(
                "nivel",
                sa.String(length=20),
                server_default="basico",
                nullable=False,
            )
        )
        batch.create_index("ix_exercicios_nivel", ["nivel"], unique=False)
    with op.batch_alter_table("sessoes_exercicio") as batch:
        batch.add_column(sa.Column("nivel", sa.String(length=20), nullable=True))
    op.execute(
        "UPDATE exercicios SET materia_id = 'logica-matematica' "
        "WHERE materia_id = 'logica'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE exercicios SET materia_id = 'logica' "
        "WHERE materia_id = 'logica-matematica'"
    )
    with op.batch_alter_table("sessoes_exercicio") as batch:
        batch.drop_column("nivel")
    with op.batch_alter_table("exercicios") as batch:
        batch.drop_index("ix_exercicios_nivel")
        batch.drop_column("nivel")
