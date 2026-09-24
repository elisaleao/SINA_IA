import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../client';
import type { TokenStore } from '../token-store';

function createTokenStore(overrides: Partial<TokenStore> = {}): TokenStore {
  return {
    getAccessToken: () => null,
    getRefreshToken: () => null,
    setTokens: () => {},
    clear: () => {},
    ...overrides,
  };
}

describe('createApiClient request', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('sends the bearer token when a token exists and auth is not disabled', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ getAccessToken: () => 'abc123' }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.request('/users/me');

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('resolves to undefined on 204 without reading a body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ getAccessToken: () => 'abc123' }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.request('/users/me/llm-key', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('does not send an Authorization header when there is no token', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.request('/users/me');

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('does not send an Authorization header when auth is false, even with a token', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ getAccessToken: () => 'abc123' }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.request('/auth/login', { method: 'POST', auth: false, body: {} });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('sends FormData bodies without a manually-set Content-Type header', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const formData = new FormData();
    formData.append('file', 'content');

    await client.request('/api/documents/upload', { method: 'POST', body: formData });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.has('Content-Type')).toBe(false);
    expect(init.body).toBe(formData);
  });

  it('throws an ApiError with the response detail when present', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'E-mail já cadastrado.' }), { status: 409 })
    );
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.request('/auth/register', { method: 'POST', body: {} })).rejects.toMatchObject(
      { message: 'E-mail já cadastrado.', status: 409 }
    );
  });

  it('keeps a structured detail and reads its mensagem as the message', async () => {
    const detail = { mensagem: 'Arquivos recusados.', arquivos: [{ arquivo: 'a.pdf', erro: 'x' }] };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail }), { status: 422 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.request('/api/materiais', { method: 'POST', body: {} })).rejects.toMatchObject(
      { message: 'Arquivos recusados.', status: 422, detail }
    );
  });

  it('throws an ApiError with "Erro HTTP <status>" when there is no detail', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 500 }));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.request('/api/content/generate', { method: 'POST', body: {} })).rejects.toMatchObject(
      { message: 'Erro HTTP 500', status: 500 }
    );
  });
});
