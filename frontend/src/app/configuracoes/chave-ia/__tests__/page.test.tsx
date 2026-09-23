import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

import ChaveIaPage from '../page';
import { SessionProvider } from '@/components/session/SessionProvider';
import { localStorageTokenStore } from '@/lib/http/token-store';

const KEY = 'AIzaChaveSecretaDoAluno';

function profile(configured: boolean): Response {
  return new Response(
    JSON.stringify({
      id: 'u1',
      email: 'aluno@sina.dev',
      full_name: 'Aluno',
      role: 'aluno',
      is_active: true,
      accessibility_preferences: null,
      llm_key_configurada: configured,
    }),
    { status: 200 }
  );
}

function renderPage() {
  return render(
    <SessionProvider>
      <ChaveIaPage />
    </SessionProvider>
  );
}

describe('/configuracoes/chave-ia', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    localStorage.clear();
  });

  it('shows that no key is configured and the free ai is in use', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(profile(false));

    renderPage();

    expect(await screen.findByText(/Nenhuma chave configurada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover chave' })).toBeNull();
  });

  it('shows a configured key without ever displaying its value', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(profile(true));

    renderPage();

    expect(await screen.findByText(/Chave pessoal configurada/)).toBeInTheDocument();
    expect(screen.getByLabelText('Trocar a chave do Gemini')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Remover chave' })).toBeInTheDocument();
  });

  it('saves a valid key and reloads the session', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(profile(false))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ llm_key_configurada: true }), { status: 200 })
      )
      .mockResolvedValueOnce(profile(true));
    renderPage();
    const input = await screen.findByLabelText('Chave da API do Gemini');

    fireEvent.change(input, { target: { value: KEY } });
    fireEvent.click(screen.getByRole('button', { name: 'Testar e salvar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Chave testada e salva.');
    expect(await screen.findByText(/Chave pessoal configurada/)).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ gemini_api_key: KEY });
    expect(screen.getByLabelText('Trocar a chave do Gemini')).toHaveValue('');
  });

  it('shows the api message for a rejected key and keeps the form usable', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(profile(false))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: 'A chave do Gemini foi recusada. Confira se está correta e ativa.' }),
          { status: 422 }
        )
      );
    renderPage();
    const input = await screen.findByLabelText('Chave da API do Gemini');

    fireEvent.change(input, { target: { value: 'chave-errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Testar e salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A chave do Gemini foi recusada. Confira se está correta e ativa.'
    );
    expect(input).toHaveValue('chave-errada');
    expect(screen.getByRole('button', { name: 'Testar e salvar' })).toBeEnabled();
    expect(screen.getByText(/Nenhuma chave configurada/)).toBeInTheDocument();
  });

  it('removes the key and updates the state without reloading the page', async () => {
    localStorageTokenStore.setTokens('access-1', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(profile(true))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(profile(false));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Remover chave' }));

    expect(await screen.findByText(/Nenhuma chave configurada/)).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends anonymous visitors to /entrar', async () => {
    renderPage();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entrar'));
  });
});
