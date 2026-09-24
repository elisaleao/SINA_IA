import uuid

import pytest
from sqlalchemy import func, select, update

from app.database import ExerciseRecord
from app.schemas.exercise import ExerciseLevel
from scripts.seed_exercicios import seed


async def _student(client) -> dict:
    response = await client.post(
        '/auth/register',
        json={
            'email': f'{uuid.uuid4()}@sina.dev',
            'password': 'senhaForte123',
            'full_name': 'Aluno Quiz',
            'role': 'aluno',
        },
    )
    return {'Authorization': f'Bearer {response.json()["access_token"]}'}


@pytest.fixture
async def questions(test_db_session):
    records = []
    for materia, nivel in (
        ('calculo', 'basico'),
        ('calculo', 'avancado'),
        ('fisica', 'intermediario'),
    ):
        record = ExerciseRecord(
            id=str(uuid.uuid4()),
            materia_id=materia,
            nivel=nivel,
            enunciado=f'Questão de {materia} {nivel}',
            enunciado_falado=f'Questão de {materia} {nivel}',
            resposta_correta=True,
            explicacao='Explicação.',
            fonte='manual',
            status='publicado',
        )
        test_db_session.add(record)
        records.append(record)
    await test_db_session.commit()
    return records


async def _start(client, headers, **filters):
    return await client.post(
        '/api/exercicios/sessoes',
        headers=headers,
        json={'total_questoes': 1, **filters},
    )


@pytest.mark.asyncio
async def test_session_serves_only_questions_of_the_chosen_level(
    client, questions
):
    headers = await _student(client)

    started = await _start(
        client, headers, materia_id='calculo', nivel='avancado'
    )

    assert started.status_code == 201
    assert started.json()['nivel'] == 'avancado'
    question = await client.get(
        f'/api/exercicios/sessoes/{started.json()["id"]}/proxima',
        headers=headers,
    )
    assert question.status_code == 200
    assert question.json()['nivel'] == 'avancado'
    assert question.json()['enunciado'] == 'Questão de calculo avancado'


@pytest.mark.asyncio
async def test_level_filter_works_without_a_subject(client, questions):
    headers = await _student(client)

    started = await _start(client, headers, nivel='intermediario')
    question = await client.get(
        f'/api/exercicios/sessoes/{started.json()["id"]}/proxima',
        headers=headers,
    )

    assert question.json()['materia_id'] == 'fisica'
    assert question.json()['nivel'] == 'intermediario'


@pytest.mark.asyncio
async def test_filter_without_questions_is_refused_before_starting(
    client, questions
):
    headers = await _student(client)

    by_level = await _start(
        client, headers, materia_id='fisica', nivel='avancado'
    )
    by_subject = await _start(client, headers, materia_id='quimica')

    assert by_level.status_code == 422
    assert 'Não há questões' in by_level.json()['detail']
    assert by_subject.status_code == 422


@pytest.mark.asyncio
async def test_unknown_level_is_rejected(client, questions):
    headers = await _student(client)

    response = await _start(client, headers, nivel='impossivel')

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_draft_questions_do_not_count_as_available(
    client, test_db_session
):
    test_db_session.add(
        ExerciseRecord(
            id=str(uuid.uuid4()),
            materia_id='calculo',
            enunciado='Rascunho',
            enunciado_falado='Rascunho',
            resposta_correta=True,
            explicacao='x',
            fonte='ia',
            status='rascunho',
        )
    )
    await test_db_session.commit()
    headers = await _student(client)

    response = await _start(client, headers, materia_id='calculo')

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_seed_covers_every_subject_at_every_level(test_db_session):
    # The quiz screen offers each subject at each level; an empty
    # combination would answer the student with 422 instead of questions.
    await seed(test_db_session)
    rows = await test_db_session.execute(
        select(ExerciseRecord.materia_id, ExerciseRecord.nivel)
    )
    combos = set(rows.all())
    subjects = {
        'calculo',
        'fisica',
        'algoritmos',
        'estruturas-de-dados',
        'logica-matematica',
    }
    levels = {level.value for level in ExerciseLevel}
    assert combos == {(s, lv) for s in subjects for lv in levels}


@pytest.mark.asyncio
async def test_seed_fixes_level_of_questions_already_in_the_bank(
    test_db_session,
):
    # Databases seeded before levels existed got 'basico' everywhere from
    # the migration; re-running the seed must put each question at its
    # real level instead of leaving the advanced filter empty.
    await seed(test_db_session)
    await test_db_session.execute(
        update(ExerciseRecord).values(nivel='basico')
    )
    await test_db_session.commit()

    inserted, _ = await seed(test_db_session)

    assert inserted == 0
    count = await test_db_session.scalar(
        select(func.count())
        .select_from(ExerciseRecord)
        .where(ExerciseRecord.nivel == 'avancado')
    )
    assert count > 0
