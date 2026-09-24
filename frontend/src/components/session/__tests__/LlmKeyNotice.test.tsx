import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LlmKeyNotice } from '../LlmKeyNotice';
import type { SessionStatus } from '../SessionProvider';
import type { UserProfile } from '@/lib/auth';

const session = vi.hoisted(() => ({
  status: 'anonymous' as SessionStatus,
  user: null as UserProfile | null,
}));

vi.mock('../SessionProvider', () => ({ useSession: () => session }));

function user(configured: boolean): UserProfile {
  return {
    id: 'u1',
    email: 'aluno@sina.dev',
    full_name: 'Aluno',
    role: 'aluno',
    is_active: true,
    accessibility_preferences: null,
    version_id: 1,
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
    llm_key_configurada: configured,
  };
}

describe('LlmKeyNotice', () => {
  it('points a user without a key to the key settings', () => {
    session.status = 'authenticated';
    session.user = user(false);

    render(<LlmKeyNotice />);

    expect(screen.getByRole('link', { name: 'Configurar chave de IA' })).toHaveAttribute(
      'href',
      '/configuracoes/chave-ia'
    );
  });

  it('stays hidden for a user who already has a key', () => {
    session.status = 'authenticated';
    session.user = user(true);

    const { container } = render(<LlmKeyNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each<SessionStatus>(['anonymous', 'loading'])('stays hidden while %s', (status) => {
    session.status = status;
    session.user = null;

    const { container } = render(<LlmKeyNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
