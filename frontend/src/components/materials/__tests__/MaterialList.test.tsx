import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MaterialSummary } from '@/lib/materials';
import { MaterialList } from '../MaterialList';

function material(overrides: Partial<MaterialSummary> = {}): MaterialSummary {
  return {
    id: 'm1',
    nome_original: 'aula.pdf',
    status: 'pronto',
    tamanho_bytes: 2048,
    reaproveitado: false,
    chave_pessoal_falhou: false,
    criado_em: '2026-09-23T10:00:00Z',
    ...overrides,
  };
}

function renderList(materials: MaterialSummary[], announcement = '') {
  const handlers = { onRetry: vi.fn(), onRemove: vi.fn(), onOpen: vi.fn() };
  const view = render(
    <MaterialList materials={materials} announcement={announcement} {...handlers} />
  );
  return { ...view, ...handlers };
}

function item(name: string): HTMLElement {
  return screen.getByText(name).closest('li') as HTMLElement;
}

describe('MaterialList', () => {
  it.each([
    ['enviado', 'Enviado'],
    ['processando', 'Processando'],
    ['pronto', 'Pronto'],
    ['erro', 'Erro'],
  ] as const)('shows the %s status as text with an icon', (status, label) => {
    renderList([material({ status })]);

    const badge = within(item('aula.pdf')).getByText(label).parentElement as HTMLElement;
    expect(badge.querySelector('[aria-hidden="true"]')?.textContent).not.toBe('');
  });

  it('shows the name and size of each material', () => {
    renderList([material()]);

    expect(within(item('aula.pdf')).getByText('2 KB')).toBeInTheDocument();
  });

  it('announces status changes politely in a live region', () => {
    renderList([material()], 'Material aula.pdf: Pronto');

    const region = screen.getByText('Material aula.pdf: Pronto');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the focus where it was when an announcement arrives', () => {
    const { rerender, onRetry, onRemove, onOpen } = renderList([material()]);
    const open = screen.getByRole('button', { name: 'Abrir aula.pdf' });
    open.focus();

    rerender(
      <MaterialList
        materials={[material()]}
        announcement="Material aula.pdf: Pronto"
        onRetry={onRetry}
        onRemove={onRemove}
        onOpen={onOpen}
      />
    );

    expect(document.activeElement).toBe(open);
  });

  it('shows the backend error and a retry button for a failed material', () => {
    const { onRetry } = renderList([
      material({ status: 'erro', erro_mensagem: 'Não conseguimos ler este PDF.' }),
    ]);

    expect(within(item('aula.pdf')).getByText('Não conseguimos ler este PDF.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo aula.pdf' }));
    expect(onRetry).toHaveBeenCalledWith('m1');
  });

  it('does not offer a retry for a material that did not fail', () => {
    renderList([material({ status: 'processando' })]);

    expect(screen.queryByRole('button', { name: /Tentar de novo/ })).toBeNull();
  });

  it('marks a reused result', () => {
    renderList([material({ reaproveitado: true })]);

    expect(
      within(item('aula.pdf')).getByText('Resultado reaproveitado de um envio anterior')
    ).toBeInTheDocument();
  });

  it('opens a ready material', () => {
    const { onOpen } = renderList([material()]);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir aula.pdf' }));

    expect(onOpen).toHaveBeenCalledWith('m1');
  });

  it('deletes only after the student confirms', () => {
    const { onRemove } = renderList([material()]);

    fireEvent.click(screen.getByRole('button', { name: 'Apagar aula.pdf' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Sim, apagar' }));
    expect(onRemove).toHaveBeenCalledWith('m1');
  });

  it('keeps the material when the student cancels the deletion', () => {
    const { onRemove } = renderList([material()]);

    fireEvent.click(screen.getByRole('button', { name: 'Apagar aula.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Sim, apagar' })).toBeNull();
  });

  it('warns when the personal key failed and the free ai finished the job', () => {
    renderList([material({ chave_pessoal_falhou: true })]);

    const notice = within(item('aula.pdf')).getByText(/sua chave do Gemini falhou/);
    expect(notice.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Conferir a chave' })).toHaveAttribute(
      'href',
      '/configuracoes/chave-ia'
    );
  });

  it('does not warn when the personal key was not involved', () => {
    renderList([material()]);

    expect(screen.queryByText(/sua chave do Gemini falhou/)).toBeNull();
  });

  it('invites the first upload when the list is empty', () => {
    renderList([]);

    expect(screen.getByText('Envie seu primeiro material')).toBeInTheDocument();
  });
});
