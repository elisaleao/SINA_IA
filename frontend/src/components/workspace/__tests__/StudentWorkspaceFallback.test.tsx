import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentWorkspace } from '../StudentWorkspace';

vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => ({
    user: {
      id: 'u1',
      email: 'aluno@sina.dev',
      full_name: 'Aluno',
      role: 'aluno',
      is_active: true,
      accessibility_preferences: null,
      llm_key_configurada: true,
    },
  }),
}));

const room = {
  id: 'room-1',
  title: 'Turma de Física',
  description: 'Física 1',
  teacherName: 'Professora',
  teacherEmail: 'prof@sina.dev',
  studentEmails: ['aluno@sina.dev'],
  files: [{ id: 'f1', title: 'Cinemática', meta: 'PDF', documentId: 'doc-1' }],
  accessCode: 'ABCD-EFGH',
  accessCodeExpiresAt: '2099-01-01T00:00:00Z',
  createdAt: '2026-09-23T00:00:00Z',
};

vi.mock('@/lib/classrooms-storage', () => ({
  getStudentClassrooms: vi.fn(() => [room]),
  joinClassroomByCode: vi.fn(),
  subscribeToClassrooms: vi.fn(() => () => undefined),
}));

const generateStudyContent = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({
  generateStudyContent,
  getAudioUrl: vi.fn(() => null),
}));

async function generateSummary(chavePessoalFalhou: boolean) {
  generateStudyContent.mockResolvedValueOnce({
    document_id: 'doc-1',
    generation_type: 'summary',
    text_content: 'Resumo da aula',
    spoken_content: 'Resumo da aula',
    audio_url: null,
    chave_pessoal_falhou: chavePessoalFalhou,
  });
  render(<StudentWorkspace />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir menu lateral' }));
  fireEvent.click(screen.getByText('Turma de Física'));
  fireEvent.click(screen.getByText('Cinemática'));
  fireEvent.click(screen.getByRole('button', { name: 'Resumo Adaptado' }));
  await screen.findByText('Resumo da aula');
}

describe('StudentWorkspace fallback notice', () => {
  beforeEach(() => {
    generateStudyContent.mockReset();
  });

  it('warns when the personal key failed during generation', async () => {
    await generateSummary(true);

    const notice = screen.getByText(/sua chave do Gemini falhou/);
    expect(notice.closest('[role="status"]')).not.toBeNull();
  });

  it('does not warn when the personal key was not involved', async () => {
    await generateSummary(false);

    expect(screen.queryByText(/sua chave do Gemini falhou/)).toBeNull();
  });
});
