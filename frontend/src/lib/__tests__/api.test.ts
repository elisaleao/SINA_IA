import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function lastRequest(): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: init.headers as Headers };
}

describe('lib/api', () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    localStorage.clear();
    const { localStorageTokenStore } = await import('../http/token-store');
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
  });

  it('uploads the document as form data with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        document_id: 'd1',
        filename: 'aula.pdf',
        extracted_markdown: '',
        accessible_text: '',
        equations_found: [],
      })
    );
    const { uploadDocument } = await import('../api');
    const file = new File(['conteúdo'], 'aula.pdf', { type: 'application/pdf' });

    const result = await uploadDocument(file);

    const { url, init, headers } = lastRequest();
    expect(url).toMatch(/\/api\/documents\/upload$/);
    expect(init.method).toBe('POST');
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
    expect(result.document_id).toBe('d1');
  });

  it('sends the generation request as json with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        document_id: 'd1',
        generation_type: 'summary',
        text_content: 'Resumo',
        spoken_content: 'Resumo',
        audio_url: null,
      })
    );
    const { generateStudyContent } = await import('../api');

    const result = await generateStudyContent({
      document_id: 'd1',
      generation_type: 'summary',
    });

    const { url, init, headers } = lastRequest();
    expect(url).toMatch(/\/api\/content\/generate$/);
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toMatchObject({
      document_id: 'd1',
      generation_type: 'summary',
      generate_audio: true,
    });
    expect(result.text_content).toBe('Resumo');
  });
});
