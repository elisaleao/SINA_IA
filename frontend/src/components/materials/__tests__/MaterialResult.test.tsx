import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MaterialDetail } from '@/lib/materials';

const api = vi.hoisted(() => ({
  getMaterial: vi.fn(),
  fetchMaterialAudio: vi.fn(),
}));
vi.mock('@/lib/materials', () => api);

import { MaterialResult } from '../MaterialResult';

function detail(overrides: Partial<MaterialDetail> = {}): MaterialDetail {
  return {
    id: 'm1',
    nome_original: 'aula.pdf',
    status: 'pronto',
    reaproveitado: false,
    chave_pessoal_falhou: false,
    criado_em: '2026-09-23T10:00:00Z',
    atualizado_em: '2026-09-23T10:01:00Z',
    texto_original: 'Texto como veio no PDF.',
    texto_acessivel: 'Texto em linguagem simples.',
    resultado: {
      charts: [{ source_label: 'Figura 1', title: 'Vendas', description: 'Barras subindo.', confidence: 0.9 }],
      audit: { status: 'ok', itens: [] },
    },
    audio_url: '/api/materiais/m1/audio',
    ...overrides,
  };
}

const createObjectURL = vi.fn(() => 'blob:audio-1');
const revokeObjectURL = vi.fn();

describe('MaterialResult', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  });

  it('shows the five result tabs following the WAI-ARIA tabs pattern', async () => {
    api.getMaterial.mockResolvedValue(detail());
    render(<MaterialResult materialId="m1" />);

    const tabs = await screen.findAllByRole('tab');

    expect(tabs.map((t) => t.textContent)).toEqual([
      'Texto acessível',
      'Texto original',
      'Gráficos',
      'Auditoria',
      'Áudio',
    ]);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Texto em linguagem simples.');
  });

  it('moves between tabs with the arrow keys', async () => {
    api.getMaterial.mockResolvedValue(detail());
    render(<MaterialResult materialId="m1" />);
    const first = await screen.findByRole('tab', { name: 'Texto acessível' });

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Texto original' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Texto como veio no PDF.');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Texto original' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Vendas');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Barras subindo.');
  });

  it('downloads the audio only when the audio tab opens and plays it', async () => {
    api.getMaterial.mockResolvedValue(detail());
    api.fetchMaterialAudio.mockResolvedValue(new Blob(['mp3']));
    const { container } = render(<MaterialResult materialId="m1" />);
    await screen.findAllByRole('tab');
    expect(api.fetchMaterialAudio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Áudio' }));

    await screen.findByText(/Ouça o texto acessível/);
    expect(api.fetchMaterialAudio).toHaveBeenCalledWith('m1');
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio).toHaveAttribute('controls');
    expect(audio).toHaveAttribute('src', 'blob:audio-1');
    expect(audio).toHaveAccessibleName('Áudio do material aula.pdf');
  });

  it('says when the material has no audio yet', async () => {
    api.getMaterial.mockResolvedValue(detail({ audio_url: null }));
    render(<MaterialResult materialId="m1" />);
    await screen.findAllByRole('tab');

    fireEvent.click(screen.getByRole('tab', { name: 'Áudio' }));

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Este material ainda não tem áudio.');
    expect(api.fetchMaterialAudio).not.toHaveBeenCalled();
  });

  it('frees the audio blob url when the result closes', async () => {
    api.getMaterial.mockResolvedValue(detail());
    api.fetchMaterialAudio.mockResolvedValue(new Blob(['mp3']));
    const { unmount } = render(<MaterialResult materialId="m1" />);
    await screen.findAllByRole('tab');
    fireEvent.click(screen.getByRole('tab', { name: 'Áudio' }));
    await screen.findByText(/Ouça o texto acessível/);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audio-1');
  });
});
