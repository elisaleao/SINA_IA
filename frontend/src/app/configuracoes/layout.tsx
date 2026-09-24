'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { appRoutes } from '@/lib/routes';

const SECTIONS = [
  { href: appRoutes.profileSettings, label: 'Perfil' },
  { href: appRoutes.accessibilitySettings, label: 'Acessibilidade' },
  { href: appRoutes.aiKeySettings, label: 'Chave de IA' },
];

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 md:flex-row lg:px-8">
      <aside className="md:w-56 md:shrink-0">
        <nav aria-label="Configurações">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-700">
            Configurações
          </h2>
          <ul className="flex flex-col gap-2">
            {SECTIONS.map((section) => {
              const current = pathname === section.href;
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={current ? 'page' : undefined}
                    className={`flex min-h-[44px] items-center rounded-md border-l-4 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      current
                        ? 'border-blue-700 bg-blue-50 font-bold text-blue-900'
                        : 'border-transparent font-semibold text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
