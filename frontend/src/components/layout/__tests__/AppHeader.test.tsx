import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader } from '../AppHeader';
import type { SessionStatus } from '@/components/session/SessionProvider';

const session = vi.hoisted(() => ({
  status: 'anonymous' as SessionStatus,
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => session,
}));

describe('AppHeader', () => {
  beforeEach(() => {
    session.signOut.mockReset();
  });

  it.each<SessionStatus>(['anonymous', 'loading'])(
    'offers "Entrar" while the session is %s',
    (status) => {
      session.status = status;

      render(<AppHeader />);

      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
        'href',
        '/entrar'
      );
      expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull();
      // Settings belong to an account, so they only show up after login.
      expect(screen.queryByRole('link', { name: /Configurações/ })).toBeNull();
    }
  );

  it('links an authenticated user to the settings', () => {
    session.status = 'authenticated';

    render(<AppHeader />);

    expect(screen.getByRole('link', { name: /Configurações/ })).toHaveAttribute(
      'href',
      '/configuracoes'
    );
  });

  it('offers "Sair" to an authenticated user and signs out on click', () => {
    session.status = 'authenticated';

    render(<AppHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
    expect(session.signOut).toHaveBeenCalledTimes(1);
  });
});
