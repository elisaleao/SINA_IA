import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider, useSession } from '../SessionProvider';
import { apiClient } from '@/lib/http';
import { localStorageTokenStore } from '@/lib/http/token-store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

const PROFESSOR = {
  id: 'u1',
  email: 'prof@sina.dev',
  full_name: 'Professora',
  role: 'professor',
  is_active: true,
  accessibility_preferences: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function Probe() {
  const { status, role, signOut } = useSession();
  return (
    <>
      <p>status:{status}</p>
      <p>role:{role ?? 'none'}</p>
      <button onClick={() => void signOut()}>sair</button>
    </>
  );
}

function renderSession() {
  return render(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    push.mockReset();
    localStorage.clear();
  });

  it('purges legacy local registration data on mount', async () => {
    localStorage.setItem('pia.student.registration', '{}');

    renderSession();
    await screen.findByText('status:anonymous');

    expect(localStorage.getItem('pia.student.registration')).toBeNull();
  });

  it('becomes anonymous without calling the api when there is no token', async () => {
    renderSession();

    expect(await screen.findByText('status:anonymous')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('becomes authenticated with the role from /users/me', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFESSOR));

    renderSession();

    expect(await screen.findByText('status:authenticated')).toBeInTheDocument();
    expect(screen.getByText('role:professor')).toBeInTheDocument();
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toMatch(/\/users\/me$/);
  });

  it('becomes anonymous when /users/me fails', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'erro' }, 500));

    renderSession();

    expect(await screen.findByText('status:anonymous')).toBeInTheDocument();
  });

  it('goes to /entrar when the session expires', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFESSOR));
    renderSession();
    await screen.findByText('status:authenticated');

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'expirado' }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: 'expirado' }, 401));
    await act(async () => {
      await apiClient.request('/api/materiais').catch(() => undefined);
    });

    await waitFor(() => expect(push).toHaveBeenCalledWith('/entrar'));
    expect(screen.getByText('status:anonymous')).toBeInTheDocument();
  });

  it('signs out and goes home', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFESSOR));
    renderSession();
    await screen.findByText('status:authenticated');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    fireEvent.click(screen.getByRole('button', { name: 'sair' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(screen.getByText('status:anonymous')).toBeInTheDocument();
    expect(localStorageTokenStore.getAccessToken()).toBeNull();
  });
});
