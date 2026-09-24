'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RequireRole } from '@/components/session/RequireRole';
import { useSession } from '@/components/session/SessionProvider';
import { ApiError } from '@/lib/http';
import { removeLlmKey, saveLlmKey } from '@/lib/llm-key';
import { appRoutes } from '@/lib/routes';

type Feedback = { kind: 'success' | 'error'; text: string } | null;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Não foi possível falar com o servidor. Tente de novo em instantes.';
}

function LlmKeySettings() {
  const { user, reload } = useSession();
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const configured = user?.llm_key_configurada ?? false;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      await reload();
      setApiKey('');
      setFeedback({ kind: 'success', text: success });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void run(() => saveLlmKey(apiKey.trim()), 'Chave testada e salva.');
  };

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Navegação estrutural">
        <Link
          href={appRoutes.dashboard}
          className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Voltar ao Painel
        </Link>
      </nav>

      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Chave de IA
        </h1>
        <p className="mt-2 text-base text-stone-600">
          Use a sua própria chave do Google Gemini para processar seus materiais com a sua cota.
          Sem chave, a plataforma usa uma IA gratuita.
        </p>
      </header>

      <section aria-labelledby="estado-chave-title" className="p-6 rounded-2xl bg-stone-50 border border-stone-200">
        <h2 id="estado-chave-title" className="text-base font-bold text-stone-900 mb-1">
          Situação atual
        </h2>
        <p className="text-sm text-stone-800">
          {configured
            ? 'Chave pessoal configurada. Suas chamadas usam o Gemini com a sua chave.'
            : 'Nenhuma chave configurada. Suas chamadas usam a IA gratuita.'}
        </p>
      </section>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          className={`p-4 rounded-xl border text-sm font-bold ${
            feedback.kind === 'error'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {feedback.kind === 'error' ? 'Erro: ' : '✓ '}
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={busy}>
        <div>
          <label htmlFor="gemini-api-key" className="block text-sm font-bold text-stone-900">
            {configured ? 'Trocar a chave do Gemini' : 'Chave da API do Gemini'}
          </label>
          <p id="gemini-api-key-ajuda" className="mt-1 text-sm text-stone-600">
            Gere a chave em{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
            >
              aistudio.google.com/apikey
            </a>
            . Ela é testada antes de salvar e fica cifrada. Ninguém consegue vê-la depois, nem você.
          </p>
          <input
            id="gemini-api-key"
            type="password"
            autoComplete="off"
            maxLength={512}
            required
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            aria-describedby="gemini-api-key-ajuda"
            className="mt-2 block w-full min-h-[44px] rounded-md border border-stone-400 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={busy || !apiKey.trim()}
            className="min-h-[44px] rounded-full bg-blue-700 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
          >
            {busy ? 'Testando…' : 'Testar e salvar'}
          </button>
          {configured && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(removeLlmKey, 'Chave removida. Suas chamadas voltam a usar a IA gratuita.')}
              className="min-h-[44px] rounded-full border border-red-700 px-6 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50"
            >
              Remover chave
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function ChaveIaPage() {
  return (
    <RequireRole allow={['aluno', 'professor', 'admin']}>
      <LlmKeySettings />
    </RequireRole>
  );
}
