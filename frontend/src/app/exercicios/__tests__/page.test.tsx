import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExerciciosPage from '../page';

vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => ({ status: 'authenticated' }),
}));

const startExerciseSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/exercises', async () => {
  const actual = await vi.importActual<typeof import('@/lib/exercises')>(
    '@/lib/exercises'
  );
  return { ...actual, startExerciseSession };
});

describe('ExerciciosPage level filter', () => {
  beforeEach(() => {
    startExerciseSession.mockReset();
  });

  it('starts the session with the subject and level the student chose', async () => {
    startExerciseSession.mockReturnValueOnce(new Promise(() => undefined));
    render(<ExerciciosPage />);

    fireEvent.change(screen.getByLabelText('Nível de dificuldade'), {
      target: { value: 'avancado' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Treino Acessível' }));

    expect(startExerciseSession).toHaveBeenCalledWith('calculo', 3, 'avancado');
  });

  it('keeps the setup open with the reason when the filter has no questions', async () => {
    // The student must be able to pick another filter, not hit a dead end.
    startExerciseSession.mockRejectedValueOnce(
      new Error('Não há questões para essa matéria e nível. Escolha outro filtro.')
    );
    render(<ExerciciosPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Treino Acessível' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não há questões para essa matéria e nível.'
    );
    expect(screen.getByLabelText('Nível de dificuldade')).toBeInTheDocument();
  });
});
