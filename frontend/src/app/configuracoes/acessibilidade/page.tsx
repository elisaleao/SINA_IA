'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';
import { useSession } from '@/components/session/SessionProvider';
import { appRoutes } from '@/lib/routes';
import { updateUserPreferences, type TTSEngine } from '@/lib/auth';
import { RadioCard, CheckboxCard } from '@/components/ui';

type VoiceFeedback = { type: 'success' | 'error'; message: string };

export default function ConfiguracoesAcessibilidadePage() {
  const { settings, updateSettings } = useAccessibility();
  const { status: sessionStatus, user, reload } = useSession();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const sessionTtsEngine = user?.accessibility_preferences?.tts_engine ?? 'online';
  const [ttsEngineOverride, setTtsEngineOverride] = useState<TTSEngine | null>(null);
  const [lastSessionTtsEngine, setLastSessionTtsEngine] = useState(sessionTtsEngine);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<VoiceFeedback | null>(null);

  if (sessionTtsEngine !== lastSessionTtsEngine) {
    setLastSessionTtsEngine(sessionTtsEngine);
    setTtsEngineOverride(null);
  }

  const ttsEngine = ttsEngineOverride ?? sessionTtsEngine;

  const handleVoiceEngineChange = async (value: string) => {
    const nextEngine = value as TTSEngine;
    const previousEngine = ttsEngine;
    setTtsEngineOverride(nextEngine);
    setSavingVoice(true);
    setVoiceFeedback(null);
    try {
      await updateUserPreferences({ tts_engine: nextEngine });
      await reload();
      setVoiceFeedback({
        type: 'success',
        message: 'Voz dos áudios atualizada com sucesso.',
      });
    } catch (error) {
      setTtsEngineOverride(previousEngine);
      setVoiceFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a voz escolhida.',
      });
    } finally {
      setSavingVoice(false);
    }
  };

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
    <div className="flex flex-col gap-8">
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

      {/* Seção 3: Voz dos Áudios */}
      <section aria-labelledby="secao-voz-title" className="space-y-4 pt-4 border-t border-stone-200">
        <h2 id="secao-voz-title" className="text-xl font-bold text-stone-900">
          Voz dos áudios
        </h2>
        {sessionStatus === 'authenticated' ? (
          <fieldset className="space-y-3">
            <legend className="sr-only">Voz dos áudios</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RadioCard
                id="voice-engine-online"
                name="ttsEngine"
                value="online"
                checked={ttsEngine === 'online'}
                onChange={handleVoiceEngineChange}
                disabled={savingVoice}
                title="Voz online"
                description="Voz neural da Microsoft, precisa de internet."
              />
              <RadioCard
                id="voice-engine-local"
                name="ttsEngine"
                value="local"
                checked={ttsEngine === 'local'}
                onChange={handleVoiceEngineChange}
                disabled={savingVoice}
                title="Voz local"
                description="Voz do servidor (Piper), funciona sem internet e não envia o texto para fora."
              />
            </div>
            <p className="text-xs text-stone-600">
              Se a voz escolhida falhar, a outra é usada automaticamente.
            </p>
            {voiceFeedback && (
              <div
                role={voiceFeedback.type === 'success' ? 'status' : 'alert'}
                aria-live={voiceFeedback.type === 'success' ? 'polite' : 'assertive'}
                className={
                  voiceFeedback.type === 'success'
                    ? 'p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold'
                    : 'p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold'
                }
              >
                {voiceFeedback.message}
              </div>
            )}
          </fieldset>
        ) : (
          <p className="text-sm text-stone-600">
            Entre na sua conta para escolher a voz dos áudios.{' '}
            <Link
              href={appRoutes.login}
              className="font-semibold text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
            >
              Fazer login
            </Link>
          </p>
        )}
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

