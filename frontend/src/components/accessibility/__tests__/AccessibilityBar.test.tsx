import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccessibilityBar } from '../AccessibilityBar';
import { AccessibilityProvider } from '../AccessibilityProvider';

function renderBar() {
  return render(
    <AccessibilityProvider>
      <AccessibilityBar />
    </AccessibilityProvider>
  );
}

describe('AccessibilityBar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-contrast');
  });

  it('exposes a labelled navigation landmark', () => {
    renderBar();
    expect(
      screen.getByRole('navigation', {
        name: 'Barra de Acessibilidade e Ajustes de Leitura',
      })
    ).toBeInTheDocument();
  });

  it('toggles high contrast, updates aria-pressed and the DOM attribute', async () => {
    renderBar();
    const button = screen.getByRole('button', {
      name: 'Ativar modo de alto contraste',
    });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Desativar modo de alto contraste' })
      ).toHaveAttribute('aria-pressed', 'true')
    );
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
  });

  it('announces the change to screen readers', async () => {
    renderBar();
    fireEvent.click(
      screen.getByRole('button', { name: /tipografia de apoio à dislexia/ })
    );
    await waitFor(() =>
      expect(document.getElementById('accessibility-live-announcer')).toHaveTextContent(
        'Fonte de apoio à dislexia ativada'
      )
    );
  });

  it('cycles the font size through normal, large and larger', async () => {
    renderBar();
    const button = screen.getByRole('button', { name: /Alterar tamanho do texto/ });
    fireEvent.click(button);
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-font-size', 'large')
    );
  });
});
