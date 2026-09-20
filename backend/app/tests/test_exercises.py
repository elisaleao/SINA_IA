import uuid

import pytest
from sqlalchemy import update

from app.database import AccessibilityPreferencesRecord, ExerciseRecord, UserRecord
from scripts.seed_exercicios import seed


@pytest.fixture
async def sample_exercise(test_db_session):
    exercise = ExerciseRecord(
        id=str(uuid.uuid4()),
        materia_id='calculo',
        enunciado='A derivada de $f(x) = x^2$ é $2x$.',
        enunciado_falado='A derivada de f de x igual a x ao quadrado é dois x.',
        codigo=None,
        linguagem=None,
        resposta_correta=True,
        explicacao='Regra do tombo para derivadas de potências.',
        fonte='manual',
        status='publicado',
    )
    test_db_session.add(exercise)
    await test_db_session.commit()
    await test_db_session.refresh(exercise)
    return exercise


@pytest.fixture
async def student_auth(client):
    email = f'aluno_{uuid.uuid4().hex[:6]}@sina.edu.br'
    resp = await client.post(
        '/auth/register',
        json={
            'email': email,
            'password': 'senhaForte123',
            'full_name': 'Aluno Teste',
            'role': 'aluno',
        },
    )
    data = resp.json()
    return {
        'token': data['access_token'],
        'headers': {'Authorization': f'Bearer {data["access_token"]}'},
        'email': email,
    }


@pytest.fixture
async def teacher_auth(client):
    email = f'prof_{uuid.uuid4().hex[:6]}@sina.edu.br'
    resp = await client.post(
        '/auth/register',
        json={
            'email': email,
            'password': 'senhaForte123',
            'full_name': 'Professor Teste',
            'role': 'professor',
        },
    )
    data = resp.json()
    return {
        'token': data['access_token'],
        'headers': {'Authorization': f'Bearer {data["access_token"]}'},
        'email': email,
    }


@pytest.mark.asyncio
async def test_seed_exercicios_idempotent(test_db_session):
    # Executa o seed duas vezes para garantir idempotência
    ins1, skip1 = await seed(test_db_session)
    assert ins1 > 0
    ins2, skip2 = await seed(test_db_session)
    assert ins2 == 0
    assert skip2 == ins1



@pytest.mark.asyncio
async def test_start_session_standard_timer(client, student_auth, sample_exercise):
    resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 3},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data['materia_id'] == 'calculo'
    assert data['total_questoes'] == 3
    # Padrão: 13 segundos (WCAG 2.2.1)
    assert data['tempo_limite_segundos'] == 13


@pytest.mark.asyncio
async def test_start_session_adhd_timer(client, student_auth, test_db_session, sample_exercise):
    # Atualiza preferência para perfil TDAH (adhd)
    me_resp = await client.get('/users/me', headers=student_auth['headers'])
    user_id = me_resp.json()['id']

    await test_db_session.execute(
        update(AccessibilityPreferencesRecord)
        .where(AccessibilityPreferencesRecord.user_id == user_id)
        .values(profile='adhd')
    )
    await test_db_session.commit()

    resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 3},
    )
    assert resp.status_code == 201
    data = resp.json()
    # TDAH: 26 segundos (2x tempo)
    assert data['tempo_limite_segundos'] == 26


@pytest.mark.asyncio
async def test_start_session_cognitive_timer(client, student_auth, test_db_session, sample_exercise):
    # Atualiza preferência para perfil Cognitivo
    me_resp = await client.get('/users/me', headers=student_auth['headers'])
    user_id = me_resp.json()['id']

    await test_db_session.execute(
        update(AccessibilityPreferencesRecord)
        .where(AccessibilityPreferencesRecord.user_id == user_id)
        .values(profile='cognitive')
    )
    await test_db_session.commit()

    resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 3},
    )
    assert resp.status_code == 201
    data = resp.json()
    # Apoio cognitivo: 39 segundos (3x tempo)
    assert data['tempo_limite_segundos'] == 39


@pytest.mark.asyncio
async def test_get_next_question_anti_leak_security(client, student_auth, sample_exercise):
    # Inicia sessão
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    # Busca próxima questão
    next_resp = await client.get(
        f'/api/exercicios/sessoes/{sessao_id}/proxima',
        headers=student_auth['headers'],
    )
    assert next_resp.status_code == 200
    q_data = next_resp.json()

    assert q_data['id'] == sample_exercise.id
    assert q_data['materia_id'] == 'calculo'
    assert q_data['enunciado'] == sample_exercise.enunciado
    assert q_data['enunciado_falado'] == sample_exercise.enunciado_falado
    assert q_data['numero_questao'] == 1
    assert q_data['total_questoes'] == 1
    assert q_data['tempo_limite_segundos'] == 13

    # VERIFICAÇÃO CRÍTICA DE SEGURANÇA: Gabarito e explicação NÃO podem vazar na questão
    assert 'resposta_correta' not in q_data
    assert 'explicacao' not in q_data


@pytest.mark.asyncio
async def test_get_next_question_isolation_other_user(client, student_auth, sample_exercise):
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    # Outro aluno tenta acessar a sessão
    other_reg = await client.post(
        '/auth/register',
        json={
            'email': 'outro_aluno@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Outro Aluno',
            'role': 'aluno',
        },
    )
    other_token = other_reg.json()['access_token']

    resp = await client.get(
        f'/api/exercicios/sessoes/{sessao_id}/proxima',
        headers={'Authorization': f'Bearer {other_token}'},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submit_answer_correct(client, student_auth, sample_exercise):
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    submit_resp = await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=student_auth['headers'],
        json={
            'exercicio_id': sample_exercise.id,
            'resposta_aluno': True,
            'tempo_gasto_segundos': 5.2,
        },
    )
    assert submit_resp.status_code == 200
    res = submit_resp.json()
    assert res['exercicio_id'] == sample_exercise.id
    assert res['resposta_aluno'] is True
    assert res['resposta_correta'] is True
    assert res['acertou'] is True
    assert res['tempo_expirado'] is False
    assert 'Regra do tombo' in res['explicacao']


@pytest.mark.asyncio
async def test_submit_answer_incorrect(client, student_auth, sample_exercise):
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    submit_resp = await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=student_auth['headers'],
        json={
            'exercicio_id': sample_exercise.id,
            'resposta_aluno': False,
            'tempo_gasto_segundos': 4.1,
        },
    )
    assert submit_resp.status_code == 200
    res = submit_resp.json()
    assert res['acertou'] is False
    assert res['resposta_correta'] is True
    assert res['tempo_expirado'] is False


@pytest.mark.asyncio
async def test_submit_answer_server_timeout_expiration(client, student_auth, sample_exercise):
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    # Submete com tempo acima do limite + tolerância de 2.0s (13 + 2.0 = 15.0; 16.5 > 15.0)
    submit_resp = await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=student_auth['headers'],
        json={
            'exercicio_id': sample_exercise.id,
            'resposta_aluno': True,  # Resposta certa, mas tempo expirado
            'tempo_gasto_segundos': 16.5,
        },
    )
    assert submit_resp.status_code == 200
    res = submit_resp.json()
    assert res['tempo_expirado'] is True
    assert res['acertou'] is False


@pytest.mark.asyncio
async def test_session_result_summary(client, student_auth, sample_exercise):
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=student_auth['headers'],
        json={'materia_id': 'calculo', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=student_auth['headers'],
        json={
            'exercicio_id': sample_exercise.id,
            'resposta_aluno': True,
            'tempo_gasto_segundos': 6.0,
        },
    )

    result_resp = await client.get(
        f'/api/exercicios/sessoes/{sessao_id}/resultado',
        headers=student_auth['headers'],
    )
    assert result_resp.status_code == 200
    result = result_resp.json()
    assert result['sessao_id'] == sessao_id
    assert result['total_questoes'] == 1
    assert result['total_respondidas'] == 1
    assert result['total_acertos'] == 1
    assert result['percentual_acerto'] == 100.0
    assert result['tempo_total_segundos'] == 6.0
    assert len(result['detalhes']) == 1
    assert result['detalhes'][0]['acertou'] is True


@pytest.mark.asyncio
async def test_generate_exercises_draft_by_default(client, student_auth):
    resp = await client.post(
        '/api/exercicios/gerar',
        headers=student_auth['headers'],
        json={
            'materia_id': 'fisica',
            'texto_base': 'A Primeira Lei de Newton descreve o princípio da inércia.',
            'quantidade': 1,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    item = data[0]
    # Garantia pedagógica e arquitetural: geradas por IA nascem estritamente como rascunho
    assert item['fonte'] == 'ia'
    assert item['status'] == 'rascunho'
    assert item['enunciado_falado'] is not None


@pytest.mark.asyncio
async def test_publish_exercise_teacher_moderation(client, student_auth, teacher_auth, test_db_session):
    # Cria uma questão rascunho
    draft_ex = ExerciseRecord(
        id=str(uuid.uuid4()),
        materia_id='algoritmos',
        enunciado='Busca binária tem complexidade $O(\\log n)$.',
        enunciado_falado='Busca binária tem complexidade logarítmica.',
        codigo=None,
        linguagem=None,
        resposta_correta=True,
        explicacao='A cada divisão do array pela metade.',
        fonte='ia',
        status='rascunho',
    )
    test_db_session.add(draft_ex)
    await test_db_session.commit()

    # 1. Aluno tenta publicar -> 403 Proibido
    student_pub_resp = await client.post(
        f'/api/exercicios/{draft_ex.id}/publicar',
        headers=student_auth['headers'],
    )
    assert student_pub_resp.status_code == 403

    # 2. Professor publica -> 200 OK
    teacher_pub_resp = await client.post(
        f'/api/exercicios/{draft_ex.id}/publicar',
        headers=teacher_auth['headers'],
    )
    assert teacher_pub_resp.status_code == 200
    pub_data = teacher_pub_resp.json()
    assert pub_data['status'] == 'publicado'
    assert pub_data['revisado_por'] is not None
    assert pub_data['revisado_em'] is not None
