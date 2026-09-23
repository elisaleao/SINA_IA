'use client';

import Link from 'next/link';
import { appRoutes } from '@/lib/routes';
import { useSession } from './SessionProvider';

export function LlmKeyNotice() {
  const { status, user } = useSession();

  if (status !== 'authenticated' || !user || user.llm_key_configurada) {
    return null;
  }

  return (
    <aside
      aria-labelledby="aviso-chave-ia-title"
      className="flex flex-col gap-3 rounded-2xl border border-blue-300 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="aviso-chave-ia-title" className="text-base font-bold text-blue-950">
          Você está usando a IA gratuita
        </h2>
        <p className="mt-1 text-sm text-blue-950">
          Com a sua chave do Google Gemini, seus materiais são processados com a sua própria cota.
        </p>
      </div>
      <Link
        href={appRoutes.aiKeySettings}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      >
        Configurar chave de IA
      </Link>
    </aside>
  );
}
