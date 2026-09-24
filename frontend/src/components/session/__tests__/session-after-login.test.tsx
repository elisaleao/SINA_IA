import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

import CadastroPage from '@/app/cadastro/page';
import EntrarPage from '@/app/entrar/page';
import { SessionProvider, useSession } from '../SessionProvider';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const TOKENS = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'bearer',
  expires_in: 900,
};

const PROFILE = {
  id: 'u1',
  email: 'aluna@sina.dev',
  full_name: 'Aluna',
  role: 'aluno',
  is_active: true,
  accessibility_preferences: null,
  llm_key_configurada: false,
};

function SessionStatus() {
  const { status } = useSession();
  return <p>sessao:{status}</p>;
}

function renderWithSession(page: React.ReactNode) {
  return render(
    <SessionProvider>
      {page}
      <SessionStatus />
    </SessionProvider>
  );
}

describe('session right after login or sign up', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    push.mockReset();
    localStorage.clear();
  });

  it('marks the session as authenticated after login, without reloading the page', async () => {
    renderWithSession(<EntrarPage />);
    await screen.findByText('sessao:anonymous');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TOKENS))
      .mockResolvedValueOnce(jsonResponse(PROFILE));

    fireEvent.change(screen.getByLabelText('E-mail institucional ou de estudante'), {
      target: { value: 'aluna@sina.dev' },
    });
    fireEvent.change(screen.getByLabelText('Senha de acesso'), {
      target: { value: 'senhaForte123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Ambiente' }));

    expect(await screen.findByText('sessao:authenticated')).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/inicio'));
  });

  it('marks the session as authenticated after sign up, without reloading the page', async () => {
    renderWithSession(<CadastroPage />);
    await screen.findByText('sessao:anonymous');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TOKENS, 201))
      .mockResolvedValueOnce(jsonResponse(PROFILE));

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Aluna' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: 'aluna@sina.dev' },
    });
    fireEvent.change(screen.getByLabelText(/Senha segura/), {
      target: { value: 'senhaForte123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Cadastro' }));

    expect(await screen.findByText('sessao:authenticated')).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/inicio'));
  });
});
