import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MaterialSummary } from '@/lib/materials';

const api = vi.hoisted(() => ({
  listMaterials: vi.fn(),
  uploadMaterials: vi.fn(),
  reprocessMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
  getMaterial: vi.fn(),
  fetchMaterialAudio: vi.fn(),
}));
vi.mock('@/lib/materials', async () => {
  const actual = await vi.importActual<typeof import('@/lib/materials')>('@/lib/materials');
  return { ...actual, ...api };
});

import { MaterialsScreen } from '../MaterialsScreen';

function material(id: string, status: MaterialSummary['status']): MaterialSummary {
  return {
    id,
    nome_original: `${id}.pdf`,
    status,
    reaproveitado: false,
    chave_pessoal_falhou: false,
    criado_em: '2026-09-23T10:00:00Z',
  };
}

function listNames(): string[] {
  const list = screen.getByRole('region', { name: 'Materiais enviados' });
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.querySelector('span')?.textContent ?? '');
}

describe('MaterialsScreen', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('lists the saved materials from newest to oldest when the page loads', async () => {
    api.listMaterials.mockResolvedValue([material('novo', 'pronto'), material('antigo', 'pronto')]);

    render(<MaterialsScreen />);

    expect(screen.getByRole('heading', { level: 1, name: 'Meus materiais' })).toBeInTheDocument();
    await screen.findByText('novo.pdf');
    expect(listNames()).toEqual(['novo.pdf', 'antigo.pdf']);
  });

  it('sends a file, shows it in the list and opens its result', async () => {
    api.listMaterials.mockResolvedValue([]);
    api.uploadMaterials.mockResolvedValue([material('aula', 'pronto')]);
    api.getMaterial.mockResolvedValue({
      ...material('aula', 'pronto'),
      atualizado_em: '2026-09-23T10:01:00Z',
      texto_acessivel: 'Texto em linguagem simples.',
      audio_url: null,
    });
    const { container } = render(<MaterialsScreen />);
    await screen.findByText('Envie seu primeiro material');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['a'], 'aula.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await screen.findByRole('button', { name: 'Abrir aula.pdf' });
    expect(listNames()).toEqual(['aula.pdf']);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir aula.pdf' }));

    expect(await screen.findByText('Texto em linguagem simples.')).toBeInTheDocument();
    expect(api.getMaterial).toHaveBeenCalledWith('aula');
  });
});
