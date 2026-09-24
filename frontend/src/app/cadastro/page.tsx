'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session/SessionProvider';
import { registerUser, UserRole } from '@/lib/auth';
import { appRoutes } from '@/lib/routes';

export default function CadastroPage() {
  const router = useRouter();
  const { reload } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('aluno');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      await registerUser({
        full_name: fullName,
        email,
        password,
        role,
      });
      await reload();
      router.push(appRoutes.dashboard);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao realizar cadastro.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Criar sua conta no SINA_IA
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Educação inclusiva, universal e focada na sua aprendizagem
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          {errorMessage && (
            <div
              id="cadastro-error"
              role="alert"
              aria-live="assertive"
              className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-700"
              >
                Nome completo
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-slate-900"
                  placeholder="Seu nome ou como prefere ser chamado"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                E-mail educacional ou pessoal
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-slate-900"
                  placeholder="voce@exemplo.edu.br"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Senha segura (mínimo de 8 caracteres)
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">
                  Perfil de uso
                </legend>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                    <input
                      id="role-aluno"
                      name="role"
                      type="radio"
                      checked={role === 'aluno'}
                      onChange={() => setRole('aluno')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <label
                      htmlFor="role-aluno"
                      className="ml-3 block text-sm font-medium text-slate-700"
                    >
                      Estudante / Aluno
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="role-professor"
                      name="role"
                      type="radio"
                      checked={role === 'professor'}
                      onChange={() => setRole('professor')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <label
                      htmlFor="role-professor"
                      className="ml-3 block text-sm font-medium text-slate-700"
                    >
                      Professor / Educador
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Cadastrando...' : 'Concluir Cadastro'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <p className="text-sm text-slate-600">
              Já tem uma conta cadastrada?{' '}
              <Link
                href="/entrar"
                className="font-medium text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

