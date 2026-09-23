import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

import { removeLlmKey, saveLlmKey } from '../llm-key';
import { ApiError } from '../http';
import { localStorageTokenStore } from '../http/token-store';

function lastRequest(): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: init.headers as Headers };
}

describe('lib/llm-key', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorage.clear();
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
  });

  it('saves the key with PUT and the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ llm_key_configurada: true }), { status: 200 })
    );

    const status = await saveLlmKey('AIzaChave');

    const { url, init, headers } = lastRequest();
    expect(url).toMatch(/\/users\/me\/llm-key$/);
    expect(init.method).toBe('PUT');
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(JSON.parse(init.body as string)).toEqual({ gemini_api_key: 'AIzaChave' });
    expect(status.llm_key_configurada).toBe(true);
  });

  it('removes the key with DELETE and the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await removeLlmKey();

    const { url, init, headers } = lastRequest();
    expect(url).toMatch(/\/users\/me\/llm-key$/);
    expect(init.method).toBe('DELETE');
    expect(headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('turns a rejected key into an ApiError with the api message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'A chave do Gemini foi recusada.' }), {
        status: 422,
      })
    );

    const error = await saveLlmKey('ruim').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).message).toBe('A chave do Gemini foi recusada.');
  });
});
