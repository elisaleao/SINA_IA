import React from 'react';
import Link from 'next/link';
import { appRoutes } from '@/lib/routes';

export function AppFooter() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-stone-200 bg-[#fffaf1] py-8 text-stone-600 text-sm mt-auto"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 lg:px-8">
        <p className="text-center sm:text-left text-xs text-stone-500">
          © {new Date().getFullYear()} SINA_IA — Plataforma Educacional Universalmente Acessível.
          Conforme WCAG 2.2 AAA & UDL.
        </p>

        <nav aria-label="Links de rodapé" className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <Link
            href={appRoutes.home}
            className="hover:text-stone-900 transition underline underline-offset-4"
          >
            Início
          </Link>
          <Link
            href={appRoutes.accessibilitySettings}
            className="hover:text-stone-900 transition underline underline-offset-4"
          >
            Acessibilidade e Privacidade
          </Link>
          <Link
            href={appRoutes.learnMore}
            className="hover:text-stone-900 transition underline underline-offset-4"
          >
            Conhecer mais
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default AppFooter;

