"""Evolui documentos para materiais com status de processamento

Revision ID: 0006_materiais_status
Revises: 0005_vlibras_preference
Create Date: 2026-09-22 19:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_materiais_status"
down_revision: Union[str, None] = "0005_vlibras_preference"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch_alter_table recria a tabela no SQLite, que não altera NOT NULL
    with op.batch_alter_table("documentos") as batch:
        batch.alter_column(
            "raw_markdown", existing_type=sa.Text(), nullable=True
        )
        batch.alter_column(
            "accessible_text", existing_type=sa.Text(), nullable=True
        )
        # Documentos já existentes foram processados de forma síncrona
        batch.add_column(
            sa.Column(
                "status",
                sa.String(length=20),
                server_default="pronto",
                nullable=False,
            )
        )
        batch.add_column(sa.Column("erro_mensagem", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column("mime", sa.String(length=100), nullable=True)
        )
        batch.add_column(
            sa.Column("tamanho_bytes", sa.Integer(), nullable=True)
        )
        batch.add_column(
            sa.Column("sha256", sa.String(length=64), nullable=True)
        )
        batch.add_column(sa.Column("nivel", sa.Integer(), nullable=True))
        batch.add_column(
            sa.Column(
                "caminho_armazenamento", sa.String(length=500), nullable=True
            )
        )
        batch.add_column(
            sa.Column("audio_arquivo", sa.String(length=255), nullable=True)
        )
        batch.add_column(sa.Column("resultado_json", sa.JSON(), nullable=True))
        batch.add_column(
            sa.Column("ambiente_id", sa.String(length=36), nullable=True)
        )
        batch.create_index("ix_documentos_status", ["status"])
        batch.create_index("ix_documentos_sha256", ["sha256"])
        batch.create_index("ix_documentos_ambiente_id", ["ambiente_id"])


def downgrade() -> None:
    # Materiais que nunca terminaram de processar não cabem no schema antigo
    op.execute(
        "DELETE FROM documentos "
        "WHERE raw_markdown IS NULL OR accessible_text IS NULL"
    )
    with op.batch_alter_table("documentos") as batch:
        batch.drop_index("ix_documentos_ambiente_id")
        batch.drop_index("ix_documentos_sha256")
        batch.drop_index("ix_documentos_status")
        for column in (
            "ambiente_id",
            "resultado_json",
            "audio_arquivo",
            "caminho_armazenamento",
            "nivel",
            "sha256",
            "tamanho_bytes",
            "mime",
            "erro_mensagem",
            "status",
        ):
            batch.drop_column(column)
        batch.alter_column(
            "accessible_text", existing_type=sa.Text(), nullable=False
        )
        batch.alter_column(
            "raw_markdown", existing_type=sa.Text(), nullable=False
        )
