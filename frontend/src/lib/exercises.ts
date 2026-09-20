import { API_BASE_URL } from './api';
import { getStoredAccessToken } from './auth';

export type ExercisePublicQuestion = {
  id: string;
  materia_id: string;
  enunciado: string;
  enunciado_falado: string | null;
  codigo: string | null;
  linguagem: string | null;
  numero_questao: number;
  total_questoes: number;
  tempo_limite_segundos: number;
  tempo_restante_segundos: number;
};

export type SessionResponse = {
  id: string;
  user_id: string;
  materia_id: string | null;
  total_questoes: number;
  tempo_limite_segundos: number;
  criado_em: string;
  finalizado_em: string | null;
};

export type SubmitAnswerRequest = {
  exercicio_id: string;
  resposta_aluno: boolean;
  tempo_gasto_segundos: number;
};

export type AnswerFeedbackResponse = {
  exercicio_id: string;
  resposta_aluno: boolean;
  resposta_correta: boolean;
  acertou: boolean;
  tempo_expirado: boolean;
  explicacao: string;
};

export type SessionResultResponse = {
  sessao_id: string;
  total_questoes: number;
  total_respondidas: number;
  total_acertos: number;
  percentual_acerto: number;
  tempo_total_segundos: number;
  detalhes: AnswerFeedbackResponse[];
};

function getAuthHeaders(): HeadersInit {
  const token = getStoredAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function startExerciseSession(
  materia_id?: string,
  total_questoes: number = 5
): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/exercicios/sessoes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      materia_id: materia_id || null,
      total_questoes,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || 'Não foi possível iniciar a sessão de exercícios.');
  }

  return (await response.json()) as SessionResponse;
}

export async function fetchNextQuestion(
  sessao_id: string
): Promise<ExercisePublicQuestion | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/exercicios/sessoes/${sessao_id}/proxima`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || 'Erro ao carregar a próxima questão.');
  }

  return (await response.json()) as ExercisePublicQuestion;
}

export async function submitExerciseAnswer(
  sessao_id: string,
  payload: SubmitAnswerRequest
): Promise<AnswerFeedbackResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/exercicios/sessoes/${sessao_id}/respostas`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || 'Erro ao enviar resposta.');
  }

  return (await response.json()) as AnswerFeedbackResponse;
}

export async function fetchSessionResult(
  sessao_id: string
): Promise<SessionResultResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/exercicios/sessoes/${sessao_id}/resultado`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || 'Erro ao obter resultado da sessão.');
  }

  return (await response.json()) as SessionResultResponse;
}

