import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExerciciosPage from '../page';

vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => ({ status: 'authenticated' }),
}));

const api = vi.hoisted(() => ({
  startExerciseSession: vi.fn(),
  fetchNextQuestion: vi.fn(),
  submitExerciseAnswer: vi.fn(),
  fetchSessionResult: vi.fn(),
}));
vi.mock('@/lib/exercises', async () => {
  const actual = await vi.importActual<typeof import('@/lib/exercises')>('@/lib/exercises');
  return { ...actual, ...api };
});

const speak = vi.fn();
const cancel = vi.fn();

class FakeUtterance {
  text: string;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function question(limit: number) {
  return {
    id: 'q1',
    materia_id: 'calculo',
    nivel: 'basico',
    enunciado: 'A derivada de $x^2$ é $2x$.',
    enunciado_falado: 'A derivada de x ao quadrado é dois x.',
    codigo: null,
    linguagem: null,
    numero_questao: 1,
    total_questoes: 2,
    tempo_limite_segundos: limit,
    tempo_restante_segundos: limit,
  };
}

async function openQuestion(limit = 0) {
  api.startExerciseSession.mockResolvedValue({ id: 's1', total_questoes: 2 });
  api.fetchNextQuestion.mockResolvedValue(question(limit));
  render(<ExerciciosPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Treino Acessível' }));
  return screen.findByRole('heading', { level: 2, name: /Questão 1 de 2/ });
}

describe('quiz with a screen reader', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    speak.mockReset();
    cancel.mockReset();
    vi.stubGlobal('speechSynthesis', { speak, cancel });
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves focus to the question and names it with the spoken version', async () => {
    const heading = await openQuestion();

    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading).toHaveAccessibleName(
      /Questão 1 de 2\. A derivada de x ao quadrado é dois x\./
    );
    expect(screen.getByText(/Leitura por extenso:/).parentElement).toHaveTextContent(
      'A derivada de x ao quadrado é dois x.'
    );
  });

  it('shows no countdown when the session has no time limit', async () => {
    await openQuestion(0);

    expect(screen.getByText('Sem limite de tempo')).toBeInTheDocument();
    expect(screen.queryByText(/Tempo restante/)).toBeNull();
  });

  it('keeps the countdown silent and warns once when 5 seconds are left', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openQuestion(13);

    const timer = screen.getByText(/Tempo restante/);
    expect(timer.closest('[aria-live]')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    const warning = screen.getByText('Faltam 5 segundos para responder.');
    expect(warning).toHaveAttribute('aria-live', 'polite');
  });

  it('answers through a labelled radio group and a confirm button', async () => {
    await openQuestion();
    api.submitExerciseAnswer.mockReturnValue(new Promise(() => undefined));

    const confirm = screen.getByRole('button', { name: 'Confirmar resposta' });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Sua resposta' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Falso' }));
    expect(screen.getByRole('radio', { name: 'Falso' })).toBeChecked();
    expect(api.submitExerciseAnswer).not.toHaveBeenCalled();

    fireEvent.click(confirm);

    expect(api.submitExerciseAnswer).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ exercicio_id: 'q1', resposta_aluno: false })
    );
  });

  it('moves focus to the next button once the feedback is shown', async () => {
    await openQuestion();
    api.submitExerciseAnswer.mockResolvedValue({
      exercicio_id: 'q1',
      resposta_aluno: true,
      resposta_correta: true,
      acertou: true,
      tempo_expirado: false,
      explicacao: 'Regra da potência.',
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Verdadeiro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar resposta' }));

    const next = await screen.findByRole('button', { name: 'Avançar para a Próxima' });
    await waitFor(() => expect(document.activeElement).toBe(next));
  });

  it('reads the question and the alternatives aloud and lets the student stop', async () => {
    await openQuestion();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvir pergunta e alternativas' }));

    const utterance = speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance.text).toBe(
      'A derivada de x ao quadrado é dois x. Alternativas: Verdadeiro ou Falso.'
    );
    expect(utterance.lang).toBe('pt-BR');

    act(() => utterance.onstart?.());
    fireEvent.click(screen.getByRole('button', { name: 'Parar leitura' }));

    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ouvir pergunta e alternativas' })).toBeInTheDocument();
  });

  it('moves focus to the final result and states the score', async () => {
    api.startExerciseSession.mockResolvedValue({ id: 's1', total_questoes: 2 });
    api.fetchNextQuestion.mockResolvedValue(null);
    api.fetchSessionResult.mockResolvedValue({
      sessao_id: 's1',
      total_questoes: 2,
      total_respondidas: 2,
      total_acertos: 1,
      percentual_acerto: 50,
      tempo_total_segundos: 20,
      detalhes: [],
    });
    render(<ExerciciosPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Treino Acessível' }));

    const heading = await screen.findByRole('heading', { name: /Rodada Concluída/ });
    expect(heading).toHaveTextContent('Você acertou 1 de 2.');
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});
