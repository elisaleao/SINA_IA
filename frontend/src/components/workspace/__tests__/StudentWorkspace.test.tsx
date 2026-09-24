import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentWorkspace } from '../StudentWorkspace';
import type { UserProfile } from '@/lib/auth';

const session = vi.hoisted(() => ({
  user: null as UserProfile | null,
}));

vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => session,
}));

const joinClassroomByCode = vi.hoisted(() =>
  vi.fn(() => ({ status: 'joined', room: { id: 'room-1' } }))
);
vi.mock('@/lib/classrooms-storage', () => ({
  getStudentClassrooms: vi.fn(() => []),
  joinClassroomByCode,
  subscribeToClassrooms: vi.fn(() => () => undefined),
}));

vi.mock('@/lib/api', () => ({
  generateStudyContent: vi.fn(),
  getAudioUrl: vi.fn(),
}));

describe('StudentWorkspace', () => {
  beforeEach(() => {
    joinClassroomByCode.mockClear();
    session.user = {
      id: 'u1',
      email: 'aluno@sina.dev',
      full_name: 'Aluno Teste',
      role: 'aluno',
      is_active: true,
      accessibility_preferences: null,
      version_id: 1,
      created_at: '2026-09-24T10:00:00Z',
      updated_at: '2026-09-24T10:00:00Z',
      llm_key_configurada: false,
    };
  });

  it('joins a classroom using the email from the session', async () => {
    render(<StudentWorkspace />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.click(
      screen.getByRole('button', { name: 'Expandir menu lateral' })
    );
    fireEvent.click(screen.getByText('Ingressar em nova sala'));
    fireEvent.change(screen.getByLabelText('Codigo da sala'), {
      target: { value: 'abcd-efgh' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar na sala' }));

    expect(joinClassroomByCode).toHaveBeenCalledWith(
      'aluno@sina.dev',
      'ABCD-EFGH'
    );
  });
});
