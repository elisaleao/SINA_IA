from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExerciseBase(BaseModel):
    materia_id: str = Field(description='Identificador da matéria / tópico')
    enunciado: str = Field(
        description='Texto da questão em Markdown com fórmulas LaTeX'
    )
    codigo: Optional[str] = Field(
        default=None, description='Trecho de código associado à questão'
    )
    linguagem: Optional[str] = Field(
        default=None, description='Linguagem de programação do trecho de código'
    )
    resposta_correta: bool = Field(
        description='Gabarito verdadeiro ou falso da assertiva'
    )
    explicacao: str = Field(
        description='Justificativa pedagógica em Linguagem Simples'
    )


class ExerciseCreate(ExerciseBase):
    fonte: str = Field(
        default='manual', description='Origem da questão: manual ou ia'
    )


class ExerciseResponse(ExerciseBase):
    id: str
    enunciado_falado: str
    fonte: str
    status: str
    revisado_por: Optional[str] = None
    revisado_em: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExercisePublicQuestion(BaseModel):
    """Modelo público da questão para o aluno em teste.

    GABARITO E EXPLICAÇÃO SÃO ESTRITAMENTE OMITIDOS AQUI.
    """

    id: str
    materia_id: str
    enunciado: str
    enunciado_falado: str
    codigo: Optional[str] = None
    linguagem: Optional[str] = None
    numero_questao: int
    total_questoes: int
    tempo_limite_segundos: int
    tempo_restante_segundos: float


class StartSessionRequest(BaseModel):
    materia_id: Optional[str] = Field(
        default=None,
        description='Filtrar questões por matéria específica (opcional)',
    )
    total_questoes: int = Field(
        default=5,
        ge=1,
        le=20,
        description='Quantidade de questões na sessão de quiz',
    )


class SessionResponse(BaseModel):
    id: str
    user_id: str
    materia_id: Optional[str] = None
    total_questoes: int
    tempo_limite_segundos: int
    iniciado_em: datetime
    finalizado_em: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SubmitAnswerRequest(BaseModel):
    exercicio_id: str = Field(description='Identificador da questão')
    resposta_aluno: bool = Field(description='Resposta do aluno: True ou False')
    tempo_gasto_segundos: float = Field(
        default=0.0, ge=0.0, description='Tempo gasto pelo aluno nesta questão'
    )


class AnswerFeedbackResponse(BaseModel):
    exercicio_id: str
    resposta_aluno: bool
    resposta_correta: bool
    acertou: bool
    tempo_expirado: bool
    explicacao: str


class SessionResultResponse(BaseModel):
    sessao_id: str
    total_questoes: int
    total_respondidas: int
    total_acertos: int
    percentual_acerto: float
    tempo_total_segundos: float
    detalhes: list[AnswerFeedbackResponse]


class GenerateExercisesRequest(BaseModel):
    materia_id: str = Field(description='Matéria do exercício')
    texto_base: str = Field(
        min_length=20,
        description='Texto base ou transcrição do material para geração',
    )
    quantidade: int = Field(
        default=3,
        ge=1,
        le=5,
        description='Quantidade de questões a gerar com a IA',
    )


class PublishExerciseRequest(BaseModel):
    exercicio_id: str

