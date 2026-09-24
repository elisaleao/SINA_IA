import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import PerfilPage from '../page';
import { SessionProvider } from '@/components/session/SessionProvider';
import { localStorageTokenStore } from '@/lib/http/token-store';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function profile(fullName: string): Response {
  return json({
    id: 'u1',
    email: 'aluno@sina.dev',
    full_name: fullName,
    role: 'aluno',
    is_active: true,
    accessibility_preferences: null,
    llm_key_configurada: false,
  });
}

function patchBody(): unknown {
  const call = fetchMock.mock.calls.find(
    ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH'
  );
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

async function renderPage() {
  localStorageTokenStore.setTokens('access-1', 'refresh-1');
  fetchMock.mockResolvedValueOnce(profile('Nome Antigo'));
  render(
    <SessionProvider>
      <PerfilPage />
    </SessionProvider>
  );
  await screen.findByDisplayValue('Nome Antigo');
}

describe('/configuracoes/perfil', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorage.clear();
  });

  it('saves only the name, so email and role stay untouched', async () => {
    await renderPage();
    fetchMock
      .mockResolvedValueOnce(profile('Nome Novo'))
      .mockResolvedValueOnce(profile('Nome Novo'));

    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'Nome Novo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Nome atualizado.');
    expect(patchBody()).toEqual({ full_name: 'Nome Novo' });
  });

  it('sends the current password along with the new one', async () => {
    await renderPage();
    fetchMock
      .mockResolvedValueOnce(profile('Nome Antigo'))
      .mockResolvedValueOnce(profile('Nome Antigo'));

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'senhaAntiga123' },
    });
    fireEvent.change(screen.getByLabelText(/Nova senha/), {
      target: { value: 'senhaNova456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.');
    expect(patchBody()).toEqual({
      current_password: 'senhaAntiga123',
      new_password: 'senhaNova456',
    });
    // Password fields are cleared so they do not linger on screen.
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
  });

  it('shows the server reason when the current password is wrong', async () => {
    await renderPage();
    fetchMock.mockResolvedValueOnce(json({ detail: 'A senha atual não confere.' }, 403));

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'errada' },
    });
    fireEvent.change(screen.getByLabelText(/Nova senha/), {
      target: { value: 'senhaNova456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha atual não confere.');
  });

  it('blocks a short new password before calling the server', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'senhaAntiga123' },
    });
    fireEvent.change(screen.getByLabelText(/Nova senha/), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('mínimo 8 caracteres');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
