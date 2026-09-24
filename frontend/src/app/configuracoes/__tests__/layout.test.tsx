import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/configuracoes/chave-ia',
}));

import ConfiguracoesLayout from '../layout';

describe('settings side panel', () => {
  it('links every settings section and marks the current one for screen readers', () => {
    render(
      <ConfiguracoesLayout>
        <p>conteudo</p>
      </ConfiguracoesLayout>
    );

    const nav = screen.getByRole('navigation', { name: 'Configurações' });
    expect(nav).toHaveTextContent('Perfil');
    expect(nav).toHaveTextContent('Acessibilidade');
    expect(screen.getByRole('link', { name: 'Chave de IA' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Perfil' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });
});
