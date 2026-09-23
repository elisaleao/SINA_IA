'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from '@/components/session/SessionProvider';
import { systemName } from '@/lib/content';
import { appRoutes } from '@/lib/routes';

export function AppHeader() {
  const pathname = usePathname();
  const { status, signOut } = useSession();
  const isAuthenticated = status === 'authenticated';

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
              onClick={() => void signOut()}
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
