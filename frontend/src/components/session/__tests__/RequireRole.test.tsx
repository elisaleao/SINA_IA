import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequireRole } from '../RequireRole';
import { SessionProvider } from '../SessionProvider';
import type { UserRole } from '@/lib/auth';
import { localStorageTokenStore } from '@/lib/http/token-store';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

function signedInAs(role: UserRole) {
  localStorageTokenStore.setTokens('access-1', 'refresh-1');
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        id: 'u1',
        email: `${role}@sina.dev`,
        full_name: 'Pessoa',
        role,
        is_active: true,
        accessibility_preferences: null,
      }),
      { status: 200 }
    )
  );
}

function renderGuard(allow: UserRole[]) {
  return render(
    <SessionProvider>
      <RequireRole allow={allow}>
        <p>área protegida</p>
      </RequireRole>
    </SessionProvider>
  );
}

describe('RequireRole', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    localStorage.clear();
  });

  it('shows a busy status while the session loads', () => {
    signedInAs('aluno');

    renderGuard(['aluno']);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('área protegida')).not.toBeInTheDocument();
  });

  it('sends anonymous visitors to /entrar', async () => {
    renderGuard(['aluno']);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entrar'));
    expect(screen.queryByText('área protegida')).not.toBeInTheDocument();
  });

  it('shows the page to an allowed role', async () => {
    signedInAs('aluno');

    renderGuard(['aluno']);

    expect(await screen.findByText('área protegida')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a student away from teacher pages to /aluno', async () => {
    signedInAs('aluno');

    renderGuard(['professor', 'admin']);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/aluno'));
    expect(screen.queryByText('área protegida')).not.toBeInTheDocument();
  });

  it.each<UserRole>(['professor', 'admin'])(
    'sends a %s away from student pages to /professor',
    async (role) => {
      signedInAs(role);

      renderGuard(['aluno']);

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/professor'));
      expect(screen.queryByText('área protegida')).not.toBeInTheDocument();
    }
  );

  it('lets an admin into teacher pages', async () => {
    signedInAs('admin');

    renderGuard(['professor', 'admin']);

    expect(await screen.findByText('área protegida')).toBeInTheDocument();
  });
});
