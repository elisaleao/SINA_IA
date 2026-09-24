import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { appRoutes } from '@/lib/routes';
import ConfiguracoesAcessibilidadePage from '../page';

const reload = vi.fn(() => Promise.resolve());
const useSessionMock = vi.fn();

vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => useSessionMock(),
}));

const updateUserPreferences = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>(
    '@/lib/auth'
  );
  return { ...actual, updateUserPreferences };
});

function authenticatedUser(ttsEngine: 'online' | 'local') {
  return {
    status: 'authenticated' as const,
    user: {
      id: 'user-1',
      email: 'aluna@sina.dev',
      full_name: 'Aluna Teste',
      role: 'aluno' as const,
      is_active: true,
      llm_key_configurada: false,
      accessibility_preferences: {
        id: 'pref-1',
        user_id: 'user-1',
        profile: 'visual',
        plain_language: false,
        include_glossary: false,
        highlight_key_points: true,
        font_family: 'system-ui',
        font_size: 'normal',
        line_spacing: 'normal',
        high_contrast: false,
        vlibras_active: false,
        tts_engine: ttsEngine,
      },
    },
    reload,
    signOut: vi.fn(),
    role: 'aluno' as const,
  };
}

function renderPage() {
  return render(
    <AccessibilityProvider>
      <ConfiguracoesAcessibilidadePage />
    </AccessibilityProvider>
  );
}

function getVoiceRadio(label: 'online' | 'local') {
  return screen.getByRole('radio', {
    name: label === 'online' ? /^Voz online/ : /^Voz local/,
  });
}

function queryVoiceRadio(label: 'online' | 'local') {
  return screen.queryByRole('radio', {
    name: label === 'online' ? /^Voz online/ : /^Voz local/,
  });
}

describe('ConfiguracoesAcessibilidadePage - Voz dos áudios', () => {
  beforeEach(() => {
    localStorage.clear();
    reload.mockClear();
    updateUserPreferences.mockReset();
  });

  it('checks the voice option that matches the current session preference', () => {
    useSessionMock.mockReturnValue(authenticatedUser('local'));
    renderPage();

    expect(getVoiceRadio('local')).toBeChecked();
    expect(getVoiceRadio('online')).not.toBeChecked();
  });

  it('saves the chosen voice engine to the server and reloads the session', async () => {
    useSessionMock.mockReturnValue(authenticatedUser('online'));
    updateUserPreferences.mockResolvedValue({});
    renderPage();

    fireEvent.click(getVoiceRadio('local'));

    await waitFor(() =>
      expect(updateUserPreferences).toHaveBeenCalledWith({ tts_engine: 'local' })
    );
    expect(reload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Voz dos áudios atualizada com sucesso.'
    );
  });

  it('shows an alert and keeps the previous option checked when saving fails', async () => {
    useSessionMock.mockReturnValue(authenticatedUser('online'));
    updateUserPreferences.mockRejectedValue(new Error('Falha ao salvar.'));
    renderPage();

    fireEvent.click(getVoiceRadio('local'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar.');
    expect(getVoiceRadio('online')).toBeChecked();
    expect(getVoiceRadio('local')).not.toBeChecked();
  });

  it('shows a login link instead of the voice radios for an anonymous user', () => {
    useSessionMock.mockReturnValue({
      status: 'anonymous' as const,
      user: null,
      reload,
      signOut: vi.fn(),
      role: null,
    });
    renderPage();

    expect(queryVoiceRadio('online')).not.toBeInTheDocument();
    expect(queryVoiceRadio('local')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fazer login' })).toHaveAttribute(
      'href',
      appRoutes.login
    );
  });
});
