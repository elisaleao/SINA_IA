import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('lib/auth', () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('stores the tokens returned by login', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'bearer', expires_in: 900 },
        200
      )
    );
    const { loginUser, getStoredAccessToken, getStoredRefreshToken } = await import('../auth');

    await loginUser({ email: 'aluno@sina.dev', password: 'senha1234' });

    expect(getStoredAccessToken()).toBe('access-1');
    expect(getStoredRefreshToken()).toBe('refresh-1');
  });

  it('stores the tokens returned by registration', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { access_token: 'access-2', refresh_token: 'refresh-2', token_type: 'bearer', expires_in: 900 },
        201
      )
    );
    const { registerUser, getStoredAccessToken, getStoredRefreshToken } = await import('../auth');

    await registerUser({ email: 'aluno@sina.dev', password: 'senha1234', full_name: 'Aluno' });

    expect(getStoredAccessToken()).toBe('access-2');
    expect(getStoredRefreshToken()).toBe('refresh-2');
  });

  it('clears the tokens on logout even when the network call fails', async () => {
    const { storeTokens, logoutUser, getStoredAccessToken, getStoredRefreshToken } = await import(
      '../auth'
    );
    storeTokens({
      access_token: 'access-3',
      refresh_token: 'refresh-3',
      token_type: 'bearer',
      expires_in: 900,
    });
    fetchMock.mockRejectedValueOnce(new TypeError('network error'));

    await logoutUser();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('sends the bearer token when fetching the current user profile', async () => {
    const { storeTokens, fetchUserProfile } = await import('../auth');
    storeTokens({
      access_token: 'access-4',
      refresh_token: 'refresh-4',
      token_type: 'bearer',
      expires_in: 900,
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          id: 'u1',
          email: 'aluno@sina.dev',
          full_name: 'Aluno',
          role: 'aluno',
          is_active: true,
          accessibility_preferences: null,
        },
        200
      )
    );

    await fetchUserProfile();

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-4');
  });
});
