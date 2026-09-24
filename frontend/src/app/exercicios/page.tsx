'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from '@/components/session/SessionProvider';
import { RadioCard } from '@/components/ui';
import {
  startExerciseSession,
  fetchNextQuestion,
  submitExerciseAnswer,
  fetchSessionResult,
  ExerciseLevel,
  ExercisePublicQuestion,
  SessionResponse,
  AnswerFeedbackResponse,
  SessionResultResponse,
} from '@/lib/exercises';

type QuizState = 'setup' | 'loading' | 'question' | 'feedback' | 'summary' | 'error';

const MATERIAS = [
  { id: 'calculo', label: 'Cálculo Diferencial e Integral' },
  { id: 'fisica', label: 'Física Geral e Mecânica' },
  { id: 'algoritmos', label: 'Algoritmos e Lógica de Programação' },
  { id: 'estruturas-de-dados', label: 'Estruturas de Dados' },
  { id: 'logica-matematica', label: 'Lógica Matemática' },
];

const NIVEIS: { id: ExerciseLevel | ''; label: string }[] = [
  { id: '', label: 'Todos os níveis' },
  { id: 'basico', label: 'Básico' },
  { id: 'intermediario', label: 'Intermediário' },
  { id: 'avancado', label: 'Avançado' },
];

export default function ExerciciosPage() {
  const [quizState, setQuizState] = useState<QuizState>('setup');
  const [selectedMateria, setSelectedMateria] = useState<string>('calculo');
  const [selectedNivel, setSelectedNivel] = useState<ExerciseLevel | ''>('');
  const [totalQuestoes, setTotalQuestoes] = useState<number>(3);
  const [currentSession, setCurrentSession] = useState<SessionResponse | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ExercisePublicQuestion | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedbackResponse | null>(null);
  const [summary, setSummary] = useState<SessionResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  const { status } = useSession();
  const isAuthenticated = status !== 'anonymous';

  // Controle de tempo
  const [tempoRestante, setTempoRestante] = useState<number>(13);
  const [tempoTotalQuestao, setTempoTotalQuestao] = useState<number>(13);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Leitor de voz
  const [isPlayingSpeech, setIsPlayingSpeech] = useState<boolean>(false);


  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    if (!currentSession || !currentQuestion || isSubmitting) return;
    stopTimer();
    setIsSubmitting(true);

    try {
      const resp = await submitExerciseAnswer(currentSession.id, {
        exercicio_id: currentQuestion.id,
        resposta_aluno: false,
        tempo_gasto_segundos: tempoTotalQuestao + 1,
      });
      setFeedback(resp);
      setQuizState('feedback');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao registrar tempo limite.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [currentSession, currentQuestion, isSubmitting, stopTimer, tempoTotalQuestao]);

  // Inicia contagem regressiva
  useEffect(() => {
    if (quizState === 'question' && tempoRestante > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTempoRestante((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current as NodeJS.Timeout);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => stopTimer();
  }, [quizState, tempoRestante, handleTimeout, stopTimer]);

  useEffect(() => {
    if (quizState === 'question') questionHeadingRef.current?.focus();
    if (quizState === 'summary') summaryHeadingRef.current?.focus();
  }, [quizState, currentQuestion]);

  const handleStart = async () => {
    setErrorMessage(null);
    setQuizState('loading');

    try {
      const session = await startExerciseSession(
        selectedMateria,
        totalQuestoes,
        selectedNivel || undefined
      );
      setCurrentSession(session);
      await loadNextQuestion(session.id);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar a sessão de exercícios.'
      );
      // Volta à configuração para a pessoa escolher outro filtro.
      setQuizState('setup');
    }
  };

  const loadNextQuestion = async (sessionId: string) => {
    setQuizState('loading');
    stopTimer();
    setFeedback(null);
    setSelectedAnswer(null);

    try {
      const q = await fetchNextQuestion(sessionId);
      if (!q) {
        // Todas as questões foram respondidas
        const res = await fetchSessionResult(sessionId);
        setSummary(res);
        setQuizState('summary');
        return;
      }

      setCurrentQuestion(q);
      setTempoTotalQuestao(q.tempo_limite_segundos);
      setTempoRestante(q.tempo_limite_segundos);
      startTimeRef.current = Date.now();
      setQuizState('question');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao buscar próxima questão.'
      );
      setQuizState('error');
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlayingSpeech(false);
  };

  const handleAnswer = async (userChoice: boolean) => {
    if (!currentSession || !currentQuestion || isSubmitting) return;
    stopTimer();
    stopSpeech();
    setIsSubmitting(true);

    const elapsedSeconds = Math.max(
      0.5,
      (Date.now() - startTimeRef.current) / 1000
    );

    try {
      const resp = await submitExerciseAnswer(currentSession.id, {
        exercicio_id: currentQuestion.id,
        resposta_aluno: userChoice,
        tempo_gasto_segundos: Math.round(elapsedSeconds * 10) / 10,
      });
      setFeedback(resp);
      setQuizState('feedback');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao enviar sua resposta.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedAnswer !== null) void handleAnswer(selectedAnswer);
  };

  const handleSpeakQuestion = () => {
    if (!currentQuestion) return;
    const textToSpeak = `${
      currentQuestion.enunciado_falado || currentQuestion.enunciado
    } Alternativas: Verdadeiro ou Falso.`;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'pt-BR';
      utterance.onstart = () => setIsPlayingSpeech(true);
      utterance.onend = () => setIsPlayingSpeech(false);
      utterance.onerror = () => setIsPlayingSpeech(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextFromFeedback = async () => {
    if (currentSession) {
      await loadNextQuestion(currentSession.id);
    }
  };

  const handleReset = () => {
    stopTimer();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentSession(null);
    setCurrentQuestion(null);
    setFeedback(null);
    setSummary(null);
    setErrorMessage(null);
    setQuizState('setup');
  };

  return (
    <div
      className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full"
      role="region"
      aria-label="Módulo de Exercícios e Quiz Acessível"
    >
      <header className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Quiz Adaptativo e Acessível
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Fixação de conceitos em formato Verdadeiro ou Falso, com suporte a leitores
          de tela, equações descritas e tempo dinâmico.
        </p>
      </header>

      {!isAuthenticated && (
        <div
          role="status"
          className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div>
            <strong>Atenção:</strong> Para registrar seu histórico e usar tempos
            personalizados de acessibilidade (TDAH e cognição), faça login.
          </div>
          <Link
            href="/entrar"
            className="px-3 py-1.5 bg-amber-600 text-white font-medium rounded hover:bg-amber-700 text-xs uppercase tracking-wider"
          >
            Fazer Login
          </Link>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 flex justify-between items-center"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-4"
            aria-label="Fechar mensagem de erro"
          >
            ✕
          </button>
        </div>
      )}

      {/* TELA DE CONFIGURAÇÃO */}
      {quizState === 'setup' && (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Configure sua Rodada de Treino
          </h2>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="materia-select"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Escolha a Disciplina
              </label>
              <select
                id="materia-select"
                value={selectedMateria}
                onChange={(e) => setSelectedMateria(e.target.value)}
                className="block w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                {MATERIAS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="nivel-select"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Nível de dificuldade
              </label>
              <select
                id="nivel-select"
                value={selectedNivel}
                onChange={(e) => setSelectedNivel(e.target.value as ExerciseLevel | '')}
                className="block w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                {NIVEIS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="questoes-count"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Quantidade de Questões
              </label>
              <select
                id="questoes-count"
                value={totalQuestoes}
                onChange={(e) => setTotalQuestoes(Number(e.target.value))}
                className="block w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value={3}>3 questões (Rápido)</option>
                <option value={5}>5 questões (Padrão)</option>
                <option value={10}>10 questões (Completo)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="w-full mt-4 py-3.5 px-6 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold text-base shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors"
            >
              Iniciar Treino Acessível
            </button>
          </div>
        </div>
      )}

      {/* CARREGAMENTO */}
      {quizState === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow border border-slate-200"
        >
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-700 font-medium">Carregando conteúdo didático...</p>
        </div>
      )}

      {/* TELA DA QUESTÃO */}
      {quizState === 'question' && currentQuestion && (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow border border-slate-200">
          {/* Barra de Progresso e Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div
              role="progressbar"
              aria-valuenow={currentQuestion.numero_questao}
              aria-valuemin={1}
              aria-valuemax={currentQuestion.total_questoes}
              className="text-sm font-semibold text-slate-500 uppercase tracking-wider"
            >
              Questão {currentQuestion.numero_questao} de {currentQuestion.total_questoes}
            </div>

            {tempoTotalQuestao > 0 ? (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
                  tempoRestante <= 5
                    ? 'bg-red-100 text-red-700 animate-pulse'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                <span aria-hidden="true">⏱</span>
                <span>Tempo restante: {tempoRestante}s</span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-600">Sem limite de tempo</p>
            )}
          </div>
          <p aria-live="polite" className="sr-only">
            {tempoTotalQuestao > 0 && tempoRestante === 5
              ? 'Faltam 5 segundos para responder.'
              : ''}
          </p>

          {/* Enunciado */}
          <div className="my-6">
            <h2
              ref={questionHeadingRef}
              tabIndex={-1}
              className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
            >
              <span className="sr-only">
                Questão {currentQuestion.numero_questao} de {currentQuestion.total_questoes}.{' '}
                {currentQuestion.enunciado_falado || currentQuestion.enunciado}
              </span>
              <span aria-hidden="true">{currentQuestion.enunciado}</span>
            </h2>

            {currentQuestion.enunciado_falado &&
              currentQuestion.enunciado_falado !== currentQuestion.enunciado && (
                <p aria-hidden="true" className="mt-3 text-base text-slate-700">
                  <strong>Leitura por extenso:</strong> {currentQuestion.enunciado_falado}
                </p>
              )}

            <div className="mt-4">
              <button
                type="button"
                onClick={isPlayingSpeech ? stopSpeech : handleSpeakQuestion}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
              >
                <span aria-hidden="true">{isPlayingSpeech ? '⏹' : '🔈'}</span>
                <span>{isPlayingSpeech ? 'Parar leitura' : 'Ouvir pergunta e alternativas'}</span>
              </button>
            </div>
          </div>

          {/* Bloco de Código se houver */}
          {currentQuestion.codigo && (
            <div className="mb-6 rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-sm overflow-x-auto">
              <pre>
                <code>{currentQuestion.codigo}</code>
              </pre>
            </div>
          )}

          <form
            className="mt-8"
            onSubmit={handleConfirm}
          >
            <fieldset>
              <legend className="text-base font-bold text-slate-900 mb-3">
                Sua resposta
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RadioCard
                  id="resposta-verdadeiro"
                  name="resposta"
                  value="true"
                  checked={selectedAnswer === true}
                  onChange={() => setSelectedAnswer(true)}
                  title="Verdadeiro"
                  disabled={isSubmitting}
                />
                <RadioCard
                  id="resposta-falso"
                  name="resposta"
                  value="false"
                  checked={selectedAnswer === false}
                  onChange={() => setSelectedAnswer(false)}
                  title="Falso"
                  disabled={isSubmitting}
                />
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={isSubmitting || selectedAnswer === null}
              className="mt-6 w-full min-h-[44px] py-3.5 px-6 rounded-lg text-white bg-blue-700 hover:bg-blue-800 font-bold text-base shadow focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Enviando…' : 'Confirmar resposta'}
            </button>
          </form>
        </div>
      )}

      {/* FEEDBACK IMEDIATO APÓS A RESPOSTA */}
      {quizState === 'feedback' && feedback && (
        <div
          role="alert"
          aria-live="assertive"
          className={`bg-white p-6 sm:p-8 rounded-xl shadow-md border-2 ${
            feedback.acertou ? 'border-emerald-500' : 'border-rose-500'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xl ${
                feedback.acertou ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {feedback.acertou ? '✓' : '✕'}
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {feedback.tempo_expirado
                  ? 'Tempo Expirado!'
                  : feedback.acertou
                  ? 'Parabéns, você acertou!'
                  : 'Resposta Incorreta'}
              </h2>
              <p className="text-sm text-slate-600">
                Gabarito oficial:{' '}
                <strong>
                  {feedback.resposta_correta ? 'VERDADEIRO' : 'FALSO'}
                </strong>
              </p>
            </div>
          </div>

          <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
              Explicação Formativa
            </h3>
            <p className="text-base text-slate-800 leading-relaxed">
              {feedback.explicacao}
            </p>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleNextFromFeedback}
            className="w-full py-3.5 px-6 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold text-base shadow focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors"
          >
            Avançar para a Próxima
          </button>
        </div>
      )}

      {/* PLACAR E RESUMO FINAL */}
      {quizState === 'summary' && summary && (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow border border-slate-200">
          <div className="text-center mb-8">
            <h2
              ref={summaryHeadingRef}
              tabIndex={-1}
              className="text-3xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
            >
              Rodada Concluída! Você acertou {summary.total_acertos} de{' '}
              {summary.total_respondidas}.
            </h2>
            <p className="text-slate-600 mt-1">
              Confira seu desempenho formativo abaixo:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-center">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <span className="block text-2xl font-black text-blue-700">
                {summary.total_acertos} / {summary.total_respondidas}
              </span>
              <span className="text-xs font-semibold text-slate-600 uppercase">
                Acertos
              </span>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="block text-2xl font-black text-emerald-700">
                {summary.percentual_acerto}%
              </span>
              <span className="text-xs font-semibold text-slate-600 uppercase">
                Aproveitamento
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block text-2xl font-black text-slate-700">
                {summary.tempo_total_segundos}s
              </span>
              <span className="text-xs font-semibold text-slate-600 uppercase">
                Tempo Total
              </span>
            </div>
          </div>

          {/* Histórico das questões respondidas */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
              Revisão das Questões
            </h3>
            {summary.detalhes.map((item, idx) => (
              <div
                key={item.exercicio_id}
                className={`p-4 rounded-lg border ${
                  item.acertou
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-700">
                    Questão {idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.acertou
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-rose-200 text-rose-800'
                    }`}
                  >
                    {item.acertou ? 'Acertou' : 'Errou'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Sua resposta: {item.resposta_aluno ? 'Verdadeiro' : 'Falso'} |
                  Gabarito: {item.resposta_correta ? 'Verdadeiro' : 'Falso'}
                </p>
                <p className="text-xs text-slate-700 italic">{item.explicacao}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 px-6 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold shadow text-center focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors"
            >
              Fazer Outra Rodada
            </button>
            <Link
              href="/"
              className="flex-1 py-3 px-6 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold border border-slate-300 text-center focus:outline-none focus:ring-4 focus:ring-slate-200 transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      )}

      {/* ERRO FATAL */}
      {quizState === 'error' && (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow border border-slate-200 text-center">
          <p className="text-slate-700 mb-6 font-medium">
            Ocorreu uma falha ao processar o módulo de quiz.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="py-2.5 px-6 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}
