import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function call(index = 0): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url, init };
}

const SUMMARY = {
  id: 'm1',
  nome_original: 'aula.pdf',
  status: 'enviado',
  reaproveitado: false,
  chave_pessoal_falhou: false,
  criado_em: '2026-09-23T10:00:00Z',
};

describe('lib/materials', () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    localStorage.clear();
    const { localStorageTokenStore } = await import('../http/token-store');
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
  });

  it('uploads every file and the chosen level as multipart form data', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ materiais: [SUMMARY] }, 202));
    const { uploadMaterials } = await import('../materials');
    const a = new File(['a'], 'aula.pdf', { type: 'application/pdf' });
    const b = new File(['b'], 'notas.txt', { type: 'text/plain' });

    const materials = await uploadMaterials([a, b], 2);

    const { url, init } = call();
    expect(url).toMatch(/\/api\/materiais$/);
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.getAll('files').map((f) => (f as File).name)).toEqual([
      'aula.pdf',
      'notas.txt',
    ]);
    expect(form.get('nivel')).toBe('2');
    expect(materials).toEqual([SUMMARY]);
  });

  it('leaves the level out so the backend uses the profile level', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ materiais: [SUMMARY] }, 202));
    const { uploadMaterials } = await import('../materials');

    await uploadMaterials([new File(['a'], 'aula.pdf')]);

    expect((call().init.body as FormData).has('nivel')).toBe(false);
  });

  it('reports the error of each rejected file', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: {
            mensagem: 'Um ou mais arquivos foram recusados.',
            arquivos: [{ arquivo: 'virus.pdf', erro: 'O conteúdo não é um PDF.' }],
          },
        },
        422
      )
    );
    const { uploadMaterials, MaterialUploadError } = await import('../materials');

    const error = await uploadMaterials([new File(['x'], 'virus.pdf')]).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(MaterialUploadError);
    expect(error).toMatchObject({
      general: undefined,
      files: [{ arquivo: 'virus.pdf', erro: 'O conteúdo não é um PDF.' }],
    });
  });

  it('reports a plain 422 text as a general error', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Envie no máximo 10 arquivos por vez.' }, 422)
    );
    const { uploadMaterials, MaterialUploadError } = await import('../materials');

    const error = await uploadMaterials([new File(['x'], 'a.pdf')]).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(MaterialUploadError);
    expect(error).toMatchObject({
      general: 'Envie no máximo 10 arquivos por vez.',
      files: [],
    });
  });

  it('lists, opens, retries and deletes materials on their routes', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([SUMMARY]))
      .mockResolvedValueOnce(jsonResponse({ ...SUMMARY, texto_acessivel: 'oi' }))
      .mockResolvedValueOnce(jsonResponse(SUMMARY, 202))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { listMaterials, getMaterial, reprocessMaterial, deleteMaterial } =
      await import('../materials');

    expect(await listMaterials()).toEqual([SUMMARY]);
    expect((await getMaterial('m1')).texto_acessivel).toBe('oi');
    expect((await reprocessMaterial('m1')).status).toBe('enviado');
    await deleteMaterial('m1');

    expect(call(0).url).toMatch(/\/api\/materiais$/);
    expect(call(1).url).toMatch(/\/api\/materiais\/m1$/);
    expect(call(2).url).toMatch(/\/api\/materiais\/m1\/reprocessar$/);
    expect(call(2).init.method).toBe('POST');
    expect(call(3).url).toMatch(/\/api\/materiais\/m1$/);
    expect(call(3).init.method).toBe('DELETE');
  });

  it('keeps the status of a missing material so callers can drop it', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Material não encontrado.' }, 404)
    );
    const { getMaterial } = await import('../materials');

    await expect(getMaterial('m9')).rejects.toMatchObject({ status: 404 });
  });

  it('downloads the audio with the token as a blob', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('mp3', { status: 200, headers: { 'Content-Type': 'audio/mpeg' } })
    );
    const { fetchMaterialAudio } = await import('../materials');

    const blob = await fetchMaterialAudio('m1');

    const { url, init } = call();
    expect(url).toMatch(/\/api\/materiais\/m1\/audio$/);
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer access-1');
    expect(blob.size).toBe(3);
    expect(blob.type).toBe('audio/mpeg');
  });
});
