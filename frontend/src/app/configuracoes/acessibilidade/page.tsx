'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';
import { appRoutes } from '@/lib/routes';
import { RadioCard, CheckboxCard } from '@/components/ui';

export default function ConfiguracoesAcessibilidadePage() {
  const { settings, updateSettings } = useAccessibility();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = () => {
    setSuccessMessage('Preferências salvas com sucesso!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleReset = () => {
    updateSettings({
      fontSize: 'normal',
      highContrast: false,
      lineSpacing: 'normal',
      dyslexiaFont: false,
      autoAudio: false,
      vlibrasActive: false,
    });
    setSuccessMessage('Preferências restauradas para o padrão!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8 lg:px-8">
      <nav aria-label="Navegação estrutural">
        <Link
          href={appRoutes.dashboard}
          className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Voltar ao Painel
        </Link>
      </nav>

      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Configurações de Acessibilidade e Leitura
        </h1>
        <p className="mt-2 text-base text-stone-600">
          Personalize as adaptações sensoriais, cognitivas e motoras da interface.
          Suas escolhas são preservadas neste dispositivo e na sua conta.
        </p>
      </header>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-sm"
        >
          ✓ {successMessage}
        </div>
      )}

      {/* Seção 1: Tipografia e Tamanho do Texto */}
      <section aria-labelledby="secao-tipografia-title" className="space-y-4">
        <h2 id="secao-tipografia-title" className="text-xl font-bold text-stone-900">
          Tamanho do Texto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RadioCard
            id="font-normal"
            name="fontSize"
            value="normal"
            checked={settings.fontSize === 'normal'}
            onChange={() => updateSettings({ fontSize: 'normal' })}
            title="Normal (100%)"
            description="Tamanho padrão de leitura"
          />
          <RadioCard
            id="font-large"
            name="fontSize"
            value="large"
            checked={settings.fontSize === 'large'}
            onChange={() => updateSettings({ fontSize: 'large' })}
            title="Grande (115%)"
            description="Recomendado para baixa visão"
          />
          <RadioCard
            id="font-larger"
            name="fontSize"
            value="larger"
            checked={settings.fontSize === 'larger'}
            onChange={() => updateSettings({ fontSize: 'larger' })}
            title="Maior (130%)"
            description="Máxima legibilidade visual"
          />
        </div>
      </section>

      {/* Seção 2: Ajustes Visuais e Contraste */}
      <section aria-labelledby="secao-visual-title" className="space-y-4 pt-4 border-t border-stone-200">
        <h2 id="secao-visual-title" className="text-xl font-bold text-stone-900">
          Ajustes Visuais e Cognitivos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CheckboxCard
            id="check-contrast"
            name="highContrast"
            checked={settings.highContrast}
            onChange={(checked) => updateSettings({ highContrast: checked })}
            title="Modo Alto Contraste"
            description="Fundo preto com elementos brutos de alto contraste para máxima visibilidade (WCAG AAA)."
          />

          <CheckboxCard
            id="check-spacing"
            name="lineSpacing"
            checked={settings.lineSpacing === 'relaxed'}
            onChange={(checked) =>
              updateSettings({ lineSpacing: checked ? 'relaxed' : 'normal' })
            }
            title="Espaçamento Ampliado"
            description="Aumenta a distância entre linhas e parágrafos para reduzir sobrecarga de leitura (TDAH)."
          />

          <CheckboxCard
            id="check-dyslexia"
            name="dyslexiaFont"
            checked={settings.dyslexiaFont}
            onChange={(checked) => updateSettings({ dyslexiaFont: checked })}
            title="Apoio à Dislexia"
            description="Espaçamento entre caracteres ampliado para facilitar a distinção fonológica das palavras."
          />

          <CheckboxCard
            id="check-audio"
            name="autoAudio"
            checked={settings.autoAudio}
            onChange={(checked) => updateSettings({ autoAudio: checked })}
            title="Áudio Automático"
            description="Inicia a leitura em voz alta ao abrir materiais e enunciados de exercícios."
          />
        </div>
      </section>

      {/* Nota de Privacidade / LGPD */}
      <section aria-labelledby="secao-privacidade-title" className="p-6 rounded-2xl bg-stone-50 border border-stone-200">
        <h2 id="secao-privacidade-title" className="text-base font-bold text-stone-900 mb-1">
          Privacidade e Proteção de Dados (LGPD)
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          Suas preferências de acessibilidade são armazenadas exclusivamente para melhorar sua usabilidade
          na plataforma, sem coletar dados de diagnóstico médico ou fins publicitários.
        </p>
      </section>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200">
        <button
          type="button"
          onClick={handleReset}
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors cursor-pointer"
        >
          Restaurar Padrões
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors cursor-pointer"
        >
          Salvar Preferências
        </button>
      </div>
    </div>
  );
}

