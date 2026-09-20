import uuid
from unittest.mock import AsyncMock

import pytest

from app.api.deps import get_llm_client
from app.database import ExerciseRecord
from app.main import app


@pytest.fixture
async def sample_students(client):
    r1 = await client.post(
        '/auth/register',
        json={
            'email': f's1_{uuid.uuid4().hex[:6]}@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Estudante 1',
            'role': 'aluno',
        },
    )
    r2 = await client.post(
        '/auth/register',
        json={
            'email': f's2_{uuid.uuid4().hex[:6]}@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Estudante 2',
            'role': 'aluno',
        },
    )
    t1 = await client.post(
        '/auth/register',
        json={
            'email': f'prof_{uuid.uuid4().hex[:6]}@sina.edu.br',
            'password': 'senhaForte123',
            'full_name': 'Professor',
            'role': 'professor',
        },
    )
    return {
        's1': {
            'headers': {'Authorization': f'Bearer {r1.json()["access_token"]}'}
        },
        's2': {
            'headers': {'Authorization': f'Bearer {r2.json()["access_token"]}'}
        },
        'prof': {
            'headers': {'Authorization': f'Bearer {t1.json()["access_token"]}'}
        },
    }


@pytest.mark.asyncio
async def test_session_result_and_privacy(
    client, sample_students, test_db_session
):
    # Cria questão publicada
    ex_id = str(uuid.uuid4())
    ex = ExerciseRecord(
        id=ex_id,
        materia_id='logica',
        enunciado='Se $P \\rightarrow Q$ e $P$, então $Q$.',
        enunciado_falado='Modus ponens',
        resposta_correta=True,
        explicacao='Regra do Modus Ponens.',
        fonte='manual',
        status='publicado',
    )
    test_db_session.add(ex)
    await test_db_session.commit()

    # Estudante 1 inicia sessão
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=sample_students['s1']['headers'],
        json={'materia_id': 'logica', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    # Estudante 1 responde a questão corretamente
    ans_resp = await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=sample_students['s1']['headers'],
        json={
            'exercicio_id': ex_id,
            'resposta_aluno': True,
            'tempo_gasto_segundos': 5.0,
        },
    )
    assert ans_resp.status_code == 200
    assert ans_resp.json()['acertou'] is True

    # Estudante 2 tenta consultar resultado da sessão de Estudante 1 -> 404
    res_s2 = await client.get(
        f'/api/exercicios/sessoes/{sessao_id}/resultado',
        headers=sample_students['s2']['headers'],
    )
    assert res_s2.status_code == 404

    # Estudante 1 consulta seu resultado -> 200
    res_s1 = await client.get(
        f'/api/exercicios/sessoes/{sessao_id}/resultado',
        headers=sample_students['s1']['headers'],
    )
    assert res_s1.status_code == 200
    data = res_s1.json()
    assert data['sessao_id'] == sessao_id
    assert data['total_questoes'] == 1
    assert data['total_acertos'] == 1
    assert data['percentual_acerto'] == 100.0
    assert len(data['detalhes']) == 1


@pytest.mark.asyncio
async def test_session_result_not_found(client, sample_students):
    fake_id = str(uuid.uuid4())
    resp = await client.get(
        f'/api/exercicios/sessoes/{fake_id}/resultado',
        headers=sample_students['s1']['headers'],
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_generate_exercises_with_ai_and_fallback(
    client, sample_students
):
    # Teste de geração com retorno estruturado JSON
    gen_payload = {
        'materia_id': 'calculo',
        'texto_base': 'A integral de $x$ é $\\frac{x^2}{2} + C$.',
        'quantidade': 1,
    }
    resp = await client.post(
        '/api/exercicios/gerar',
        headers=sample_students['prof']['headers'],
        json=gen_payload,
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]['status'] == 'rascunho'
    assert items[0]['fonte'] == 'ia'
    assert items[0]['enunciado_falado'] is not None

    # Teste de fallback quando LLM retorna resposta sem JSON válido
    mock_llm = AsyncMock()
    mock_llm.generate_text.return_value = (
        'Texto livre sem formato de lista JSON'
    )
    app.dependency_overrides[get_llm_client] = lambda: mock_llm

    try:
        resp_fallback = await client.post(
            '/api/exercicios/gerar',
            headers=sample_students['prof']['headers'],
            json=gen_payload,
        )
        assert resp_fallback.status_code == 200
        items_fallback = resp_fallback.json()
        assert len(items_fallback) == 1
        assert items_fallback[0]['status'] == 'rascunho'
    finally:
        app.dependency_overrides.pop(get_llm_client, None)


@pytest.mark.asyncio
async def test_publish_exercise_rbac_and_validation(
    client, sample_students, test_db_session
):
    # Cria questão em rascunho
    draft_id = str(uuid.uuid4())
    draft = ExerciseRecord(
        id=draft_id,
        materia_id='fisica',
        enunciado='A primeira lei de Newton trata da inércia.',
        enunciado_falado='Primeira lei de Newton',
        resposta_correta=True,
        explicacao='Todo corpo permanece em repouso a menos que forças atuem.',
        fonte='ia',
        status='rascunho',
    )
    test_db_session.add(draft)
    await test_db_session.commit()

    # Aluno tenta publicar -> 403 Forbidden
    pub_student = await client.post(
        f'/api/exercicios/{draft_id}/publicar',
        headers=sample_students['s1']['headers'],
    )
    assert pub_student.status_code == 403

    # Questão inexistente -> 404
    pub_404 = await client.post(
        f'/api/exercicios/{uuid.uuid4()}/publicar',
        headers=sample_students['prof']['headers'],
    )
    assert pub_404.status_code == 404

    # Professor publica com sucesso -> 200 OK
    pub_prof = await client.post(
        f'/api/exercicios/{draft_id}/publicar',
        headers=sample_students['prof']['headers'],
    )
    assert pub_prof.status_code == 200
    assert pub_prof.json()['status'] == 'publicado'


@pytest.mark.asyncio
async def test_quiz_edge_cases_already_finished_and_timeout(
    client, sample_students, test_db_session
):
    ex_id = str(uuid.uuid4())
    ex = ExerciseRecord(
        id=ex_id,
        materia_id='algoritmos',
        enunciado='Busca binária tem complexidade $O(\\log n)$.',
        enunciado_falado='Busca binária',
        resposta_correta=True,
        explicacao='Divisão contínua do espaço de busca.',
        fonte='manual',
        status='publicado',
    )
    test_db_session.add(ex)
    await test_db_session.commit()

    # Inicia sessão de 1 questão
    start_resp = await client.post(
        '/api/exercicios/sessoes',
        headers=sample_students['s1']['headers'],
        json={'materia_id': 'algoritmos', 'total_questoes': 1},
    )
    sessao_id = start_resp.json()['id']

    # Responde estourando o tempo limite (ex: gastou 30s quando o limite era 13s)
    ans_resp = await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=sample_students['s1']['headers'],
        json={
            'exercicio_id': ex_id,
            'resposta_aluno': True,
            'tempo_gasto_segundos': 35.0,  # 35s > 13s + 2s
        },
    )
    assert ans_resp.status_code == 200
    data = ans_resp.json()
    assert data['tempo_expirado'] is True
    assert data['acertou'] is False

    # Tenta pedir próxima questão quando todas já foram respondidas -> 404
    next_resp = await client.get(
        f'/api/exercicios/sessoes/{sessao_id}/proxima',
        headers=sample_students['s1']['headers'],
    )
    assert next_resp.status_code == 404
    assert 'já foram respondidas' in next_resp.json()['detail']

    # Tenta responder com exercício inexistente -> 404
    ans_fake_ex = await client.post(
        f'/api/exercicios/sessoes/{sessao_id}/respostas',
        headers=sample_students['s1']['headers'],
        json={
            'exercicio_id': str(uuid.uuid4()),
            'resposta_aluno': True,
            'tempo_gasto_segundos': 2.0,
        },
    )
    assert ans_fake_ex.status_code == 404
