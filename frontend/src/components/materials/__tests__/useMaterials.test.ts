import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/http';
import type { MaterialSummary } from '@/lib/materials';

const api = vi.hoisted(() => ({
  listMaterials: vi.fn(),
  uploadMaterials: vi.fn(),
  reprocessMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
}));
vi.mock('@/lib/materials', () => api);

import { useMaterials } from '../useMaterials';

function material(
  id: string,
  status: MaterialSummary['status'],
  nome = `${id}.pdf`
): MaterialSummary {
  return {
    id,
    nome_original: nome,
    status,
    reaproveitado: false,
    chave_pessoal_falhou: false,
    criado_em: '2026-09-23T10:00:00Z',
  };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function mount() {
  const hook = renderHook(() => useMaterials());
  await advance(0);
  return hook;
}

describe('useMaterials', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the list on mount', async () => {
    api.listMaterials.mockResolvedValue([material('a', 'pronto')]);

    const { result } = await mount();

    expect(result.current.materials.map((m) => m.id)).toEqual(['a']);
  });

  it('polls after 2 s and doubles the wait up to 30 s while nothing changes', async () => {
    api.listMaterials.mockResolvedValue([material('a', 'processando')]);
    await mount();
    expect(api.listMaterials).toHaveBeenCalledTimes(1);

    for (const [wait, calls] of [
      [2000, 2],
      [4000, 3],
      [8000, 4],
      [16000, 5],
      [30000, 6],
      [30000, 7],
    ]) {
      await advance(wait - 1);
      expect(api.listMaterials).toHaveBeenCalledTimes(calls - 1);
      await advance(1);
      expect(api.listMaterials).toHaveBeenCalledTimes(calls);
    }
  });

  it('goes back to 2 s when a status changes', async () => {
    api.listMaterials
      .mockResolvedValueOnce([material('a', 'enviado'), material('b', 'enviado')])
      .mockResolvedValueOnce([material('a', 'enviado'), material('b', 'enviado')])
      .mockResolvedValueOnce([material('a', 'processando'), material('b', 'enviado')])
      .mockResolvedValue([material('a', 'processando'), material('b', 'enviado')]);
    await mount();
    await advance(2000);
    await advance(4000);
    expect(api.listMaterials).toHaveBeenCalledTimes(3);

    await advance(2000);

    expect(api.listMaterials).toHaveBeenCalledTimes(4);
  });

  it('announces each status change as "Material <nome>: <status>"', async () => {
    api.listMaterials
      .mockResolvedValueOnce([material('a', 'processando', 'aula.pdf')])
      .mockResolvedValue([material('a', 'pronto', 'aula.pdf')]);
    const { result } = await mount();
    expect(result.current.announcement).toBe('');

    await advance(2000);

    expect(result.current.announcement).toBe('Material aula.pdf: Pronto');
  });

  it('stops polling when nothing is sent or processing', async () => {
    api.listMaterials
      .mockResolvedValueOnce([material('a', 'processando')])
      .mockResolvedValue([material('a', 'erro')]);
    await mount();
    await advance(2000);

    await advance(120000);

    expect(api.listMaterials).toHaveBeenCalledTimes(2);
  });

  it('stops polling when the screen unmounts', async () => {
    api.listMaterials.mockResolvedValue([material('a', 'processando')]);
    const { unmount } = await mount();

    unmount();
    await advance(120000);

    expect(api.listMaterials).toHaveBeenCalledTimes(1);
  });

  it('runs one query at a time', async () => {
    api.listMaterials.mockResolvedValueOnce([material('a', 'processando')]);
    api.listMaterials.mockReturnValue(new Promise(() => undefined));
    const { result } = await mount();
    await advance(2000);

    await act(async () => {
      await result.current.refresh();
    });
    await advance(120000);

    expect(api.listMaterials).toHaveBeenCalledTimes(2);
  });

  it('keeps the list and tries again next cycle when the network fails', async () => {
    api.listMaterials
      .mockResolvedValueOnce([material('a', 'processando')])
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue([material('a', 'pronto')]);
    const { result } = await mount();

    await advance(2000);
    expect(result.current.materials.map((m) => m.status)).toEqual(['processando']);

    await advance(4000);
    expect(result.current.materials.map((m) => m.status)).toEqual(['pronto']);
  });

  it('puts uploaded materials on top and starts following them', async () => {
    api.listMaterials
      .mockResolvedValueOnce([material('old', 'pronto')])
      .mockResolvedValue([material('new', 'processando'), material('old', 'pronto')]);
    api.uploadMaterials.mockResolvedValue([material('new', 'enviado')]);
    const { result } = await mount();

    await act(async () => {
      await result.current.upload([new File(['x'], 'new.pdf')], 3);
    });

    expect(api.uploadMaterials).toHaveBeenCalledWith([expect.any(File)], 3);
    expect(result.current.materials.map((m) => m.id)).toEqual(['new', 'old']);
    await advance(2000);
    expect(api.listMaterials).toHaveBeenCalledTimes(2);
  });

  it('retries a failed material and follows it again', async () => {
    api.listMaterials
      .mockResolvedValueOnce([material('a', 'erro')])
      .mockResolvedValue([material('a', 'processando')]);
    api.reprocessMaterial.mockResolvedValue(material('a', 'enviado'));
    const { result } = await mount();

    await act(async () => {
      await result.current.retry('a');
    });

    expect(result.current.materials[0].status).toBe('enviado');
    await advance(2000);
    expect(api.listMaterials).toHaveBeenCalledTimes(2);
  });

  it('removes a deleted material from the list', async () => {
    api.listMaterials.mockResolvedValue([material('a', 'pronto'), material('b', 'pronto')]);
    api.deleteMaterial.mockResolvedValue(undefined);
    const { result } = await mount();

    await act(async () => {
      await result.current.remove('a');
    });

    expect(api.deleteMaterial).toHaveBeenCalledWith('a');
    expect(result.current.materials.map((m) => m.id)).toEqual(['b']);
  });

  it('drops a material the backend answers with 404', async () => {
    api.listMaterials.mockResolvedValue([material('a', 'erro'), material('b', 'pronto')]);
    api.reprocessMaterial.mockRejectedValue(new ApiError('Material não encontrado.', 404));
    const { result } = await mount();

    await act(async () => {
      await result.current.retry('a');
    });

    expect(result.current.materials.map((m) => m.id)).toEqual(['b']);
  });
});
