import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function lastRequest(): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: init.headers as Headers };
}

describe('lib/exercises', () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    localStorage.clear();
    const { localStorageTokenStore } = await import('../http/token-store');
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
  });

  it('starts a session with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 's1' }, 201));
    const { startExerciseSession } = await import('../exercises');

    const session = await startExerciseSession('m1', 3);

    const { url, init, headers } = lastRequest();
    expect(url).toMatch(/\/api\/exercicios\/sessoes$/);
    expect(init.method).toBe('POST');
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(JSON.parse(init.body as string)).toEqual({
      materia_id: 'm1',
      total_questoes: 3,
      nivel: null,
    });
    expect(session.id).toBe('s1');
  });

  it('sends the chosen level so the session only serves that level', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 's1' }, 201));
    const { startExerciseSession } = await import('../exercises');

    await startExerciseSession('m1', 3, 'avancado');

    expect(JSON.parse(lastRequest().init.body as string)).toMatchObject({
      nivel: 'avancado',
    });
  });

  it('fetches the next question with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'q1' }));
    const { fetchNextQuestion } = await import('../exercises');

    const question = await fetchNextQuestion('s1');

    const { url, headers } = lastRequest();
    expect(url).toMatch(/\/api\/exercicios\/sessoes\/s1\/proxima$/);
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(question?.id).toBe('q1');
  });

  it('returns null when there is no next question', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Fim' }, 404));
    const { fetchNextQuestion } = await import('../exercises');

    expect(await fetchNextQuestion('s1')).toBeNull();
  });

  it('submits an answer with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ acertou: true }));
    const { submitExerciseAnswer } = await import('../exercises');
    const payload = {
      exercicio_id: 'q1',
      resposta_aluno: true,
      tempo_gasto_segundos: 12,
    };

    const feedback = await submitExerciseAnswer('s1', payload);

    const { url, init, headers } = lastRequest();
    expect(url).toMatch(/\/api\/exercicios\/sessoes\/s1\/respostas$/);
    expect(init.method).toBe('POST');
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(feedback.acertou).toBe(true);
  });

  it('fetches the session result with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ total_acertos: 4 }));
    const { fetchSessionResult } = await import('../exercises');

    const result = await fetchSessionResult('s1');

    const { url, headers } = lastRequest();
    expect(url).toMatch(/\/api\/exercicios\/sessoes\/s1\/resultado$/);
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(result.total_acertos).toBe(4);
  });
});
