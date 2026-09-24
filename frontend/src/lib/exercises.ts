import { ApiError, apiClient } from './http';

export type {
  AnswerFeedbackResponse,
  ExerciseLevel,
  ExercisePublicQuestion,
  SessionResponse,
  SessionResultResponse,
  SubmitAnswerRequest,
} from './api-schema';
import type {
  AnswerFeedbackResponse,
  ExerciseLevel,
  ExercisePublicQuestion,
  SessionResponse,
  SessionResultResponse,
  SubmitAnswerRequest,
} from './api-schema';

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
