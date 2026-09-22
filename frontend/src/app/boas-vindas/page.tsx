import { Metadata } from 'next';
import Link from 'next/link';
import { appRoutes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Boas-vindas ao SINA_IA | Configuração Acessível',
  description:
    'Bem-vindo à plataforma educacional inclusiva. Configure suas preferências de estudo e acessibilidade personalizada.',
};

export default function BoasVindasPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 sm:p-12 shadow-sm text-center">
        <span aria-hidden="true" className="text-5xl mb-4 block">
          🌱
        </span>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl mb-4">
          Boas-vindas ao SINA_IA
        </h1>
        <p className="text-base text-stone-600 leading-relaxed mb-8 max-w-xl mx-auto">
          Preparamos uma experiência de aprendizado adaptada ao seu ritmo e às suas necessidades.
          Você pode personalizar suas preferências visuais, auditivas e cognitivas a qualquer momento.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={appRoutes.dashboard}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center px-8 py-3 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
          >
            Acessar Meu Painel
          </Link>

          <Link
            href={appRoutes.accessibilitySettings}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center px-8 py-3 rounded-xl text-base font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 focus:outline-none focus:ring-4 focus:ring-stone-200 transition-colors"
          >
            Ajustar Acessibilidade
          </Link>
        </div>
      </div>
    </div>
  );
}

