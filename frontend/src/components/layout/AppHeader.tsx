'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { systemName } from '@/lib/content';
import { appRoutes } from '@/lib/routes';
import { getStoredAccessToken, logoutUser } from '@/lib/auth';

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  // Lido do localStorage a cada render (inclusive após navegação); no servidor é sempre false.
  const isAuthenticated = useSyncExternalStore(
    subscribeToStorage,
    () => Boolean(getStoredAccessToken()),
    () => false
  );

  const handleLogout = async () => {
    await logoutUser();
    router.push(appRoutes.home);
  };

  const isStudentArea = pathname.startsWith(appRoutes.student);
  const isTeacherArea = pathname.startsWith(appRoutes.teacher);
  const displaySystemName = isStudentArea
    ? `${systemName} - ALUNO`
    : isTeacherArea
      ? `${systemName} - PROFESSOR`
      : systemName;

  return (
    <header className="border-b border-stone-200 bg-[#fffaf1]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 lg:px-8">
        <Link
          href={isAuthenticated ? appRoutes.dashboard : appRoutes.home}
          aria-label={`${systemName}. Ir para a página inicial`}
          className="text-lg font-bold tracking-tight text-stone-900 sm:text-xl min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md"
        >
          {displaySystemName}
        </Link>

        <nav
          aria-label="Navegação Principal do Sistema"
          className="flex flex-wrap items-center gap-2"
        >
          {isAuthenticated ? (
            <Link
              href={appRoutes.dashboard}
              aria-current={pathname === appRoutes.dashboard ? 'page' : undefined}
              className={`min-h-[44px] inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                pathname === appRoutes.dashboard
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-stone-300 text-stone-800 hover:border-stone-900 hover:text-stone-950'
              }`}
            >
              Meu Painel
            </Link>
          ) : (
            <Link
              href={appRoutes.home}
              aria-current={pathname === appRoutes.home ? 'page' : undefined}
              className={`min-h-[44px] inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                pathname === appRoutes.home
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-stone-300 text-stone-800 hover:border-stone-900 hover:text-stone-950'
              }`}
            >
              Início
            </Link>
          )}

          <Link
            href={appRoutes.exercises}
            aria-current={pathname === appRoutes.exercises ? 'page' : undefined}
            className={`min-h-[44px] inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              pathname === appRoutes.exercises
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-stone-300 text-stone-800 hover:border-stone-900 hover:text-stone-950'
            }`}
          >
            Exercícios
          </Link>

          <Link
            href={appRoutes.quizHub}
            aria-current={pathname === appRoutes.quizHub ? 'page' : undefined}
            className={`min-h-[44px] inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              pathname === appRoutes.quizHub
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-stone-300 text-stone-800 hover:border-stone-900 hover:text-stone-950'
            }`}
          >
            Quiz
          </Link>

          <Link
            href={appRoutes.processDocument}
            aria-current={pathname === appRoutes.processDocument ? 'page' : undefined}
            className={`min-h-[44px] inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              pathname === appRoutes.processDocument
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-stone-300 text-stone-800 hover:border-stone-900 hover:text-stone-950'
            }`}
          >
            Processar Documento
          </Link>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 hover:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              Sair
            </button>
          ) : (
            <Link
              href={appRoutes.login}
              className="min-h-[44px] inline-flex items-center rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;
