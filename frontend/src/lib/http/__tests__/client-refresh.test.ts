import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../client';
import type { TokenStore } from '../token-store';

function createTokenStore(overrides: Partial<TokenStore> = {}): TokenStore {
  return {
    getAccessToken: () => 'expired-token',
    getRefreshToken: () => 'refresh-token',
    setTokens: () => {},
    clear: () => {},
    ...overrides,
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('createApiClient session refresh', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('refreshes once on 401 and repeats the original call once', async () => {
    const setTokens = vi.fn();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new-access', refresh_token: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: '1' }, 200));

    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ setTokens }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await client.request('/users/me');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/auth/refresh');
    expect(setTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
    expect(result).toEqual({ id: '1' });
  });

  it('shares a single refresh call across concurrent 401s', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new-access', refresh_token: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: '1' }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: '2' }, 200));

    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await Promise.all([client.request('/users/me'), client.request('/api/materials')]);

    const refreshCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === 'https://api.test/auth/refresh'
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('clears the session and notifies handlers when the refresh call fails', async () => {
    const clear = vi.fn();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: 'invalid refresh token' }, 401));

    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ clear }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const handler = vi.fn();
    client.onSessionExpired(handler);

    await expect(client.request('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ends the session without a second refresh when the retried call 401s again', async () => {
    const clear = vi.fn();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new-access', refresh_token: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({}, 401));

    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ clear }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const handler = vi.fn();
    client.onSessionExpired(handler);

    await expect(client.request('/users/me')).rejects.toMatchObject({ status: 401 });

    const refreshCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === 'https://api.test/auth/refresh'
    );
    expect(refreshCalls).toHaveLength(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh when /auth/login itself returns 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'invalid credentials' }, 401));

    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.request('/auth/login', { method: 'POST', auth: false, body: {} })
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
