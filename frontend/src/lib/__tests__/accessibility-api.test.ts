import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PipelineEvent } from '../accessibility-api';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function ndjsonResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

describe('lib/accessibility-api', () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    localStorage.clear();
    const { localStorageTokenStore } = await import('../http/token-store');
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
  });

  it('streams the pipeline events in order with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(
      ndjsonResponse([
        '{"type":"stage","stage":"upload","status":"done"}\n{"type":"st',
        'age","stage":"extract","status":"active"}\n',
        '{"type":"error","message":"Falhou"}',
      ])
    );
    const { processAccessibleDocument } = await import('../accessibility-api');
    const events: PipelineEvent[] = [];
    const controller = new AbortController();
    const file = new File(['texto'], 'aula.txt', { type: 'text/plain' });

    await processAccessibleDocument(file, 2, (event) => events.push(event), controller.signal);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/accessibility\/process-stream$/);
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer access-1');
    expect(init.signal).toBe(controller.signal);
    expect((init.body as FormData).get('level')).toBe('2');
    expect(events).toEqual([
      { type: 'stage', stage: 'upload', status: 'done' },
      { type: 'stage', stage: 'extract', status: 'active' },
      { type: 'error', message: 'Falhou' },
    ]);
  });
});
