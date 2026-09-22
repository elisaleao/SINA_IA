'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { Tabs, EmptyState, Dropzone } from '@/components/ui';
import { appRoutes } from '@/lib/routes';

export default function AmbienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [activeTab, setActiveTab] = useState('materiais');

  const tabs = [
    {
      id: 'materiais',
      label: 'Materiais de Estudo',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-stone-600">
            Envie e organize os arquivos utilizados como fonte de conhecimento deste ambiente.
          </p>
          <Dropzone
            onFilesSelected={() => {
              // Shell da UX1; integração com API na UX4
            }}
          />
        </div>
      ),
    },
    {
      id: 'conversa',
      label: 'Conversa (Chat)',
      content: (
        <div className="space-y-4">
          <EmptyState
            icon="💬"
            title="Nenhum material associado ainda"
            description="Envie um documento na aba 'Materiais' para iniciar uma conversa com o assistente baseada nas suas referências."
            actionText="Ir para Materiais"
            onAction={() => setActiveTab('materiais')}
          />
        </div>
      ),
    },
    {
      id: 'quiz',
      label: 'Quiz Formatividade',
      content: (
        <div className="space-y-4">
          <EmptyState
            icon="⏱"
            title="Pronto para testar seus conhecimentos?"
            description="Responda questões rápidas de Verdadeiro ou Falso geradas a partir do conteúdo deste ambiente."
            actionText="Iniciar Quiz"
            onAction={() => {
              window.location.href = appRoutes.exercises;
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 lg:px-8">
      <nav aria-label="Navegação estrutural">
        <Link
          href={appRoutes.dashboard}
          className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Voltar ao Painel
        </Link>
      </nav>

      <header className="border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Ambiente: {id.replace(/-/g, ' ').toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Espaço de aprendizagem pessoal com contexto de materiais, chat assistivo e quiz.
        </p>
      </header>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Abas do ambiente de estudo"
      />
    </div>
  );
}

