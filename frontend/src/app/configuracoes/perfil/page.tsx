'use client';

import React, { useState } from 'react';
import { RequireRole } from '@/components/session/RequireRole';
import { useSession } from '@/components/session/SessionProvider';
import { ApiError } from '@/lib/http';
import { ProfileUpdate, updateProfile } from '@/lib/profile';

type Feedback = { kind: 'success' | 'error'; text: string } | null;

const inputClass =
  'mt-2 block w-full min-h-[44px] rounded-md border border-stone-400 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-600';
const buttonClass =
  'min-h-[44px] rounded-full bg-blue-700 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Não foi possível falar com o servidor. Tente de novo em instantes.';
}

function ProfileSettings() {
  const { user, reload } = useSession();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const save = async (payload: ProfileUpdate, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await updateProfile(payload);
      await reload();
      setCurrentPassword('');
      setNewPassword('');
      setFeedback({ kind: 'success', text: success });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleName = (event: React.FormEvent) => {
    event.preventDefault();
    void save({ full_name: fullName.trim() }, 'Nome atualizado.');
  };

  const handlePassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setFeedback({
        kind: 'error',
        text: 'A nova senha deve ter no mínimo 8 caracteres.',
      });
      return;
    }
    void save(
      { current_password: currentPassword, new_password: newPassword },
      'Senha alterada.'
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Perfil
        </h1>
        <p className="mt-2 text-base text-stone-600">
          E-mail: <strong>{user?.email}</strong>. O e-mail e o perfil de uso não mudam por aqui.
        </p>
      </header>

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

      <form onSubmit={handleName} className="space-y-4" aria-busy={busy}>
        <div>
          <label htmlFor="perfil-nome" className="block text-sm font-bold text-stone-900">
            Nome
          </label>
          <input
            id="perfil-nome"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={busy || fullName.trim().length < 2}
          className={buttonClass}
        >
          Salvar nome
        </button>
      </form>

      <form
        onSubmit={handlePassword}
        className="space-y-4 border-t border-stone-200 pt-6"
        aria-labelledby="senha-title"
        aria-busy={busy}
      >
        <h2 id="senha-title" className="text-xl font-bold text-stone-900">
          Trocar senha
        </h2>
        <div>
          <label htmlFor="senha-atual" className="block text-sm font-bold text-stone-900">
            Senha atual
          </label>
          <input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="senha-nova" className="block text-sm font-bold text-stone-900">
            Nova senha (mínimo de 8 caracteres)
          </label>
          <input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !currentPassword || !newPassword}
          className={buttonClass}
        >
          Trocar senha
        </button>
      </form>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequireRole allow={['aluno', 'professor', 'admin']}>
      <ProfileSettings />
    </RequireRole>
  );
}
