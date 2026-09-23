import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader } from '@/components/layout/AppHeader';
import { RequireRole } from '../RequireRole';
import { SessionProvider } from '../SessionProvider';
import { loginUser } from '@/lib/auth';
import { localStorageTokenStore } from '@/lib/http/token-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/aluno',
}));

const EMAIL = 'aluno@sina.dev';
const PASSWORD = 'senhaForte123';

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function everyStoredEntry(): Array<[string, string]> {
  return Object.keys(localStorage).map((key) => [
    key,
    localStorage.getItem(key) ?? '',
  ]);
}

describe('no local credentials', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorage.clear();
  });

  it('keeps password, email and name out of localStorage after using the main screens', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          token_type: 'bearer',
          expires_in: 900,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'u1',
          email: EMAIL,
          full_name: 'Aluno Teste',
          role: 'aluno',
          is_active: true,
          accessibility_preferences: null,
        })
      );

    await loginUser({ email: EMAIL, password: PASSWORD });

    render(
      <SessionProvider>
        <AppHeader />
        <RequireRole allow={['aluno']}>
          <p>espaço do aluno</p>
        </RequireRole>
      </SessionProvider>
    );
    await screen.findByText('espaço do aluno');

    for (const [key, value] of everyStoredEntry()) {
      expect(key.startsWith('pia.')).toBe(false);
      expect(value).not.toContain(PASSWORD);
      expect(value).not.toContain(EMAIL);
      expect(value).not.toContain('Aluno Teste');
    }
    expect(localStorageTokenStore.getAccessToken()).toBe('access-1');
  });
});
