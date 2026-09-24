import { ApiError, apiClient } from './http';

export type ExerciseLevel = 'basico' | 'intermediario' | 'avancado';

export type ExercisePublicQuestion = {
  id: string;
  materia_id: string;
  nivel: ExerciseLevel;
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
  nivel: ExerciseLevel | null;
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

export async function startExerciseSession(
  materia_id?: string,
  total_questoes: number = 5,
  nivel?: ExerciseLevel
): Promise<SessionResponse> {
  return apiClient.request<SessionResponse>('/api/exercicios/sessoes', {
    method: 'POST',
    body: { materia_id: materia_id || null, total_questoes, nivel: nivel || null },
  });
}

export async function fetchNextQuestion(
  sessao_id: string
): Promise<ExercisePublicQuestion | null> {
  try {
    return await apiClient.request<ExercisePublicQuestion>(
      `/api/exercicios/sessoes/${sessao_id}/proxima`
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function submitExerciseAnswer(
  sessao_id: string,
  payload: SubmitAnswerRequest
): Promise<AnswerFeedbackResponse> {
  return apiClient.request<AnswerFeedbackResponse>(
    `/api/exercicios/sessoes/${sessao_id}/respostas`,
    { method: 'POST', body: payload }
  );
}

export async function fetchSessionResult(
  sessao_id: string
): Promise<SessionResultResponse> {
  return apiClient.request<SessionResultResponse>(
    `/api/exercicios/sessoes/${sessao_id}/resultado`
  );
}
