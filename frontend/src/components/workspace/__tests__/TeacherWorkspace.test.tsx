import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeacherWorkspace } from '../TeacherWorkspace';
import type { UserProfile } from '@/lib/auth';

const session = vi.hoisted(() => ({
  user: null as UserProfile | null,
}));

vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => session,
}));

const createClassroom = vi.hoisted(() => vi.fn(() => ({ id: 'room-1' })));
vi.mock('@/lib/classrooms-storage', () => ({
  addClassroomFiles: vi.fn(),
  createClassroom,
  getTeacherClassrooms: vi.fn(() => []),
  refreshClassroomAccessCode: vi.fn(),
  subscribeToClassrooms: vi.fn(() => () => undefined),
}));

vi.mock('@/lib/api', () => ({ uploadDocument: vi.fn() }));

describe('TeacherWorkspace', () => {
  beforeEach(() => {
    createClassroom.mockClear();
    session.user = {
      id: 'u1',
      email: 'professora@sina.dev',
      full_name: 'Professora Ana',
      role: 'professor',
      is_active: true,
      accessibility_preferences: null,
      version_id: 1,
      created_at: '2026-09-24T10:00:00Z',
      updated_at: '2026-09-24T10:00:00Z',
      llm_key_configurada: false,
    };
  });

  it('creates a classroom using the email from the session', async () => {
    render(<TeacherWorkspace />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.click(
      screen.getByRole('button', { name: 'Expandir menu lateral' })
    );
    fireEvent.click(screen.getByText('Adicionar sala de aula'));
    fireEvent.change(screen.getByLabelText('Nome da sala'), {
      target: { value: 'Turma 2B' },
    });
    fireEvent.change(screen.getByLabelText('Descricao da sala'), {
      target: { value: 'Turma de calculo.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Criar sala de aula' })
    );

    expect(createClassroom).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherName: 'Professora Ana',
        teacherEmail: 'professora@sina.dev',
      })
    );
  });
});
