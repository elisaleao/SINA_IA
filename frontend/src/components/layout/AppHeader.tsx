"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { systemName } from "@/lib/content";
import { appRoutes } from "@/lib/routes";

export function AppHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === appRoutes.home;
  const isStudentArea = pathname.startsWith(appRoutes.student);
  const isTeacherArea = pathname.startsWith(appRoutes.teacher);
  const displaySystemName = isStudentArea
    ? `${systemName} - ALUNO`
    : isTeacherArea
      ? `${systemName} - PROFESSOR`
      : systemName;

  return (
    <header className="border-b border-stone-200 bg-[#fffaf1]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        <Link
          href={appRoutes.home}
          aria-label="Plataforma Inclusiva de Aprendizagem. Ir para a pagina inicial"
          className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl"
        >
          {displaySystemName}
        </Link>
        <nav aria-label="Acessos do cabecalho" className="flex items-center gap-3">
          {isHomePage ? null : (
            <Link
              href={appRoutes.home}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-900 hover:text-stone-950"
            >
              Voltar ao inicio
            </Link>
          )}
          <Link
            href={appRoutes.login}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-900 hover:text-stone-950"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
