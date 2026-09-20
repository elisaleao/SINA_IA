"""Criação das tabelas de exercícios, sessões e respostas

Revision ID: 0004_exercicios
Revises: 0003_refresh_tokens
Create Date: 2026-09-20 17:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0004_exercicios'
down_revision: Union[str, None] = '0003_refresh_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabela exercicios
    op.create_table(
        'exercicios',
        sa.Column(
            'id', sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column(
            'materia_id', sa.String(length=50), nullable=False, index=True
        ),
        sa.Column('enunciado', sa.Text(), nullable=False),
        sa.Column('enunciado_falado', sa.Text(), nullable=False),
        sa.Column('codigo', sa.Text(), nullable=True),
        sa.Column('linguagem', sa.String(length=50), nullable=True),
        sa.Column('resposta_correta', sa.Boolean(), nullable=False),
        sa.Column('explicacao', sa.Text(), nullable=False),
        sa.Column(
            'fonte',
            sa.String(length=20),
            server_default='manual',
            nullable=False,
        ),
        sa.Column(
            'status',
            sa.String(length=20),
            server_default='publicado',
            nullable=False,
        ),
        sa.Column(
            'revisado_por',
            sa.String(length=36),
            sa.ForeignKey('usuarios.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('revisado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index('ix_exercicios_status', 'exercicios', ['status'])

    # 2. Tabela sessoes_exercicio
    op.create_table(
        'sessoes_exercicio',
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
            'materia_id', sa.String(length=50), nullable=True, index=True
        ),
        sa.Column(
            'total_questoes',
            sa.Integer(),
            server_default='5',
            nullable=False,
        ),
        sa.Column(
            'tempo_limite_segundos',
            sa.Integer(),
            server_default='13',
            nullable=False,
        ),
        sa.Column(
            'iniciado_em',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column('finalizado_em', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        'ix_sessoes_exercicio_user_id', 'sessoes_exercicio', ['user_id']
    )

    # 3. Tabela respostas_exercicio
    op.create_table(
        'respostas_exercicio',
        sa.Column(
            'id', sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column(
            'sessao_id',
            sa.String(length=36),
            sa.ForeignKey('sessoes_exercicio.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'exercicio_id',
            sa.String(length=36),
            sa.ForeignKey('exercicios.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('resposta_aluno', sa.Boolean(), nullable=False),
        sa.Column('acertou', sa.Boolean(), nullable=False),
        sa.Column(
            'tempo_gasto_segundos',
            sa.Float(),
            server_default='0.0',
            nullable=False,
        ),
        sa.Column(
            'respondido_em',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        'ix_respostas_exercicio_sessao_id',
        'respostas_exercicio',
        ['sessao_id'],
    )
    op.create_index(
        'ix_respostas_exercicio_exercicio_id',
        'respostas_exercicio',
        ['exercicio_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_respostas_exercicio_exercicio_id',
        table_name='respostas_exercicio',
    )
    op.drop_index(
        'ix_respostas_exercicio_sessao_id', table_name='respostas_exercicio'
    )
    op.drop_table('respostas_exercicio')

    op.drop_index(
        'ix_sessoes_exercicio_user_id', table_name='sessoes_exercicio'
    )
    op.drop_table('sessoes_exercicio')

    op.drop_index('ix_exercicios_status', table_name='exercicios')
    op.drop_table('exercicios')
