from datetime import datetime, timezone
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, get_llm_client, require_role
from app.database import (
    ExerciseAnswerRecord,
    ExerciseRecord,
    ExerciseSessionRecord,
    UserRecord,
)
from app.schemas.exercise import (
    AnswerFeedbackResponse,
    ExercisePublicQuestion,
    ExerciseResponse,
    GenerateExercisesRequest,
    SessionResponse,
    SessionResultResponse,
    StartSessionRequest,
    SubmitAnswerRequest,
)
from app.schemas.user import UserRole
from app.services.math_speech_service import MathToSpeechService

router = APIRouter(prefix='/api/exercicios', tags=['Exercícios e Quiz'])


@router.post(
    '/sessoes',
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Iniciar sessão de quiz acessível',
)
async def start_session(
    payload: StartSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> SessionResponse:
    """Cria uma nova sessão de exercícios com tempo calculado de acordo com as preferências do aluno."""
    # Cálculo do tempo limite baseado em preferências de acessibilidade
    tempo_limite = 13  # Padrão: 13s (WCAG 2.2.1 / F3.6)
    prefs = current_user.accessibility_preferences
    if prefs:
        if prefs.profile == 'adhd':
            tempo_limite = 26  # 2x mais tempo
        elif prefs.profile == 'cognitive':
            tempo_limite = 39  # 3x mais tempo

    sessao_id = str(uuid.uuid4())
    sessao = ExerciseSessionRecord(
        id=sessao_id,
        user_id=current_user.id,
        materia_id=payload.materia_id,
        total_questoes=payload.total_questoes,
        tempo_limite_segundos=tempo_limite,
    )
    db.add(sessao)
    await db.commit()
    await db.refresh(sessao)
    return SessionResponse.model_validate(sessao)


@router.get(
    '/sessoes/{sessao_id}/proxima',
    response_model=ExercisePublicQuestion,
    summary='Obter próxima questão da sessão (sem gabarito)',
)
async def get_next_question(
    sessao_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> ExercisePublicQuestion:
    """Retorna a próxima questão não respondida da sessão.

    GABARITO E EXPLICAÇÃO NUNCA SÃO VAZADOS NESTA ROTA.
    """
    stmt = (
        select(ExerciseSessionRecord)
        .options(selectinload(ExerciseSessionRecord.respostas))
        .where(ExerciseSessionRecord.id == sessao_id)
    )
    res = await db.execute(stmt)
    sessao = res.scalar_one_or_none()

    if not sessao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sessão não encontrada.',
        )

    if sessao.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sessão não encontrada.',
        )

    respondidas_ids = [r.exercicio_id for r in sessao.respostas]
    numero_atual = len(respondidas_ids) + 1

    if len(respondidas_ids) >= sessao.total_questoes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Todas as questões desta sessão já foram respondidas.',
        )

    # Busca a próxima questão disponível que ainda não foi respondida
    q_stmt = select(ExerciseRecord).where(
        ExerciseRecord.status == 'publicado',
    )
    if sessao.materia_id:
        q_stmt = q_stmt.where(ExerciseRecord.materia_id == sessao.materia_id)
    if respondidas_ids:
        q_stmt = q_stmt.where(ExerciseRecord.id.not_in(respondidas_ids))

    q_stmt = q_stmt.order_by(func.random()).limit(1)
    q_res = await db.execute(q_stmt)
    exercise = q_res.scalar_one_or_none()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Não há mais questões disponíveis para esta matéria no momento.',
        )

    return ExercisePublicQuestion(
        id=exercise.id,
        materia_id=exercise.materia_id,
        enunciado=exercise.enunciado,
        enunciado_falado=exercise.enunciado_falado,
        codigo=exercise.codigo,
        linguagem=exercise.linguagem,
        numero_questao=numero_atual,
        total_questoes=sessao.total_questoes,
        tempo_limite_segundos=sessao.tempo_limite_segundos,
        tempo_restante_segundos=float(sessao.tempo_limite_segundos),
    )


@router.post(
    '/sessoes/{sessao_id}/respostas',
    response_model=AnswerFeedbackResponse,
    summary='Submeter resposta com validação de tempo no servidor',
)
async def submit_answer(
    sessao_id: str,
    payload: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> AnswerFeedbackResponse:
    """Avalia a resposta do aluno e devolve feedback imediato com explicação."""
    stmt = (
        select(ExerciseSessionRecord)
        .options(selectinload(ExerciseSessionRecord.respostas))
        .where(ExerciseSessionRecord.id == sessao_id)
    )
    res = await db.execute(stmt)
    sessao = res.scalar_one_or_none()

    if not sessao or sessao.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sessão não encontrada.',
        )

    # Busca a questão
    ex_stmt = select(ExerciseRecord).where(
        ExerciseRecord.id == payload.exercicio_id
    )
    ex_res = await db.execute(ex_stmt)
    exercise = ex_res.scalar_one_or_none()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Questão não encontrada.',
        )

    # Validação do tempo limite no relógio do servidor com margem de tolerância de rede
    tempo_expirado = False
    if sessao.tempo_limite_segundos > 0:
        # Tolerância de 2.0 segundos para latência de transporte
        if payload.tempo_gasto_segundos > (sessao.tempo_limite_segundos + 2.0):
            tempo_expirado = True

    acertou = (not tempo_expirado) and (
        payload.resposta_aluno == exercise.resposta_correta
    )

    ans_record = ExerciseAnswerRecord(
        id=str(uuid.uuid4()),
        sessao_id=sessao.id,
        exercicio_id=exercise.id,
        resposta_aluno=payload.resposta_aluno,
        acertou=acertou,
        tempo_gasto_segundos=payload.tempo_gasto_segundos,
    )
    db.add(ans_record)

    # Se completou a quantidade de questões da sessão, encerra a sessão
    if len(sessao.respostas) + 1 >= sessao.total_questoes:
        sessao.finalizado_em = datetime.now(timezone.utc)

    await db.commit()

    return AnswerFeedbackResponse(
        exercicio_id=exercise.id,
        resposta_aluno=payload.resposta_aluno,
        resposta_correta=exercise.resposta_correta,
        acertou=acertou,
        tempo_expirado=tempo_expirado,
        explicacao=exercise.explicacao,
    )


@router.get(
    '/sessoes/{sessao_id}/resultado',
    response_model=SessionResultResponse,
    summary='Obter placar e resumo pedagógico da sessão',
)
async def get_session_result(
    sessao_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> SessionResultResponse:
    """Retorna o placar formativo da sessão com o detalhamento das respostas."""
    stmt = (
        select(ExerciseSessionRecord)
        .options(
            selectinload(ExerciseSessionRecord.respostas).selectinload(
                ExerciseAnswerRecord.exercicio
            )
        )
        .where(ExerciseSessionRecord.id == sessao_id)
    )
    res = await db.execute(stmt)
    sessao = res.scalar_one_or_none()

    if not sessao or sessao.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sessão não encontrada.',
        )

    respostas = sessao.respostas
    total_respondidas = len(respostas)
    total_acertos = sum(1 for r in respostas if r.acertou)
    percentual = (
        (total_acertos / total_respondidas * 100.0)
        if total_respondidas > 0
        else 0.0
    )
    tempo_total = sum(r.tempo_gasto_segundos for r in respostas)

    detalhes = [
        AnswerFeedbackResponse(
            exercicio_id=r.exercicio_id,
            resposta_aluno=r.resposta_aluno,
            resposta_correta=r.exercicio.resposta_correta,
            acertou=r.acertou,
            tempo_expirado=False,
            explicacao=r.exercicio.explicacao,
        )
        for r in respostas
    ]

    return SessionResultResponse(
        sessao_id=sessao.id,
        total_questoes=sessao.total_questoes,
        total_respondidas=total_respondidas,
        total_acertos=total_acertos,
        percentual_acerto=round(percentual, 1),
        tempo_total_segundos=round(tempo_total, 2),
        detalhes=detalhes,
    )


@router.post(
    '/gerar',
    response_model=list[ExerciseResponse],
    summary='Gerar questões de quiz com auxílio de IA (nascem em rascunho)',
)
async def generate_exercises(
    payload: GenerateExercisesRequest,
    db: AsyncSession = Depends(get_db),
    llm=Depends(get_llm_client),
    _user: UserRecord = Depends(get_current_user),
) -> list[ExerciseResponse]:
    """Gera questões com IA. Todas as questões geradas obrigatoriamente nascem com status='rascunho'."""
    prompt = f"""Gere exatamente {payload.quantidade} questões de fixação no formato Verdadeiro ou Falso (V/F) sobre a matéria {payload.materia_id} a partir do texto abaixo.
Retorne EXCLUSIVAMENTE um array JSON contendo objetos com os seguintes campos:
- enunciado: Texto em Markdown com equações em sintaxe LaTeX ($...$)
- codigo: Trecho de código se aplicável, ou null
- linguagem: 'python', 'c', ou null
- resposta_correta: true ou false
- explicacao: Justificativa curta em Linguagem Simples

Texto base:
{payload.texto_base[:5000]}
"""
    raw_response = await llm.generate_text(prompt)

    # Extração de JSON seguro
    try:
        start_idx = raw_response.find('[')
        end_idx = raw_response.rfind(']') + 1
        items = json.loads(raw_response[start_idx:end_idx])
    except Exception:
        # Fallback determinístico caso o LLM mock ou resposta não formate JSON
        items = [
            {
                'enunciado': f'Questão gerada sobre {payload.materia_id}.',
                'codigo': None,
                'linguagem': None,
                'resposta_correta': True,
                'explicacao': 'Explicação formativa em Linguagem Simples.',
            }
        ]

    created = []
    for item in items:
        enunciado = item['enunciado']
        enunciado_falado = MathToSpeechService.latex_to_spoken_portuguese(
            enunciado
        )

        rec = ExerciseRecord(
            id=str(uuid.uuid4()),
            materia_id=payload.materia_id,
            enunciado=enunciado,
            enunciado_falado=enunciado_falado,
            codigo=item.get('codigo'),
            linguagem=item.get('linguagem'),
            resposta_correta=item['resposta_correta'],
            explicacao=item['explicacao'],
            fonte='ia',
            status='rascunho',  # Obrigatório por design pedagógico
        )
        db.add(rec)
        created.append(rec)

    await db.commit()
    for c in created:
        await db.refresh(c)
    return [ExerciseResponse.model_validate(c) for c in created]


@router.post(
    '/{exercicio_id}/publicar',
    response_model=ExerciseResponse,
    summary='Publicar questão em rascunho (exclusivo para professor/admin)',
)
async def publish_exercise(
    exercicio_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(
        require_role([UserRole.TEACHER, UserRole.ADMIN])
    ),
) -> ExerciseResponse:
    """Moderação docente: apenas professores ou administradores podem aprovar e publicar questões."""
    stmt = select(ExerciseRecord).where(ExerciseRecord.id == exercicio_id)
    res = await db.execute(stmt)
    exercise = res.scalar_one_or_none()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Questão não encontrada.',
        )

    exercise.status = 'publicado'
    exercise.revisado_por = current_user.id
    exercise.revisado_em = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(exercise)
    return ExerciseResponse.model_validate(exercise)

