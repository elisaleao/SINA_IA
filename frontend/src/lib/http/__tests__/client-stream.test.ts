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

function streamedResponse(lines: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { status });
}

describe('createApiClient stream', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('sends the bearer token and returns the response without consuming the body', async () => {
    fetchMock.mockResolvedValueOnce(streamedResponse(['{"type":"stage","stage":"upload","status":"active"}']));
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore({ getAccessToken: () => 'abc123' }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const formData = new FormData();
    formData.append('file', 'content');

    const response = await client.stream('/api/accessibility/process-stream', {
      method: 'POST',
      body: formData,
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc123');
    expect(response.bodyUsed).toBe(false);
  });

  it('rejects with an ApiError when the streamed response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'sem permissão' }), { status: 403 })
    );
    const client = createApiClient({
      baseUrl: 'https://api.test',
      tokenStore: createTokenStore(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.stream('/api/accessibility/process-stream', { method: 'POST', body: new FormData() })
    ).rejects.toMatchObject({ message: 'sem permissão', status: 403 });
  });
});
