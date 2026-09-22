'use client';

import React from 'react';
import { useAccessibility } from './AccessibilityProvider';

export function AccessibilityBar() {
  const { settings, updateSettings } = useAccessibility();

  const handleNextFontSize = () => {
    const sequence: Array<'normal' | 'large' | 'larger'> = [
      'normal',
      'large',
      'larger',
    ];
    const currentIndex = sequence.indexOf(settings.fontSize);
    const next = sequence[(currentIndex + 1) % sequence.length];
    updateSettings({ fontSize: next });
  };

  const handleToggleContrast = () => {
    updateSettings({ highContrast: !settings.highContrast });
  };

  const handleToggleLineSpacing = () => {
    updateSettings({
      lineSpacing: settings.lineSpacing === 'relaxed' ? 'normal' : 'relaxed',
    });
  };

  const handleToggleDyslexia = () => {
    updateSettings({ dyslexiaFont: !settings.dyslexiaFont });
  };

  const handleToggleAutoAudio = () => {
    updateSettings({ autoAudio: !settings.autoAudio });
  };

  const handleToggleVLibras = () => {
    const nextState = !settings.vlibrasActive;
    updateSettings({ vlibrasActive: nextState });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sina-vlibras-toggle', {
          detail: { active: nextState },
        })
      );
    }
  };

  const fontSizeLabels: Record<'normal' | 'large' | 'larger', string> = {
    normal: 'A (Normal)',
    large: 'A+ (Grande)',
    larger: 'A++ (Maior)',
  };

  return (
    <nav
      aria-label="Barra de Acessibilidade e Ajustes de Leitura"
      className="bg-stone-100 border-b border-stone-300 py-1.5 px-4 sm:px-6 lg:px-8 text-xs text-stone-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold uppercase tracking-wider text-stone-600 mr-1 text-[11px]">
            Acessibilidade:
          </span>

          {/* Tamanho da Fonte */}
          <button
            type="button"
            onClick={handleNextFontSize}
            aria-label={`Alterar tamanho do texto. Atual: ${fontSizeLabels[settings.fontSize]}`}
            className="inline-flex min-h-[44px] items-center gap-1 px-3 py-1 rounded-md border border-stone-300 bg-white hover:bg-stone-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <span aria-hidden="true">🔤</span>
            <span>{fontSizeLabels[settings.fontSize]}</span>
          </button>

          {/* Alto Contraste */}
          <button
            type="button"
            onClick={handleToggleContrast}
            aria-pressed={settings.highContrast}
            aria-label={
              settings.highContrast
                ? 'Desativar modo de alto contraste'
                : 'Ativar modo de alto contraste'
            }
            className={`inline-flex min-h-[44px] items-center gap-1 px-3 py-1 rounded-md border font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer ${
              settings.highContrast
                ? 'bg-black text-white border-black'
                : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span aria-hidden="true">◐</span>
            <span>Contraste</span>
          </button>

          {/* Espaçamento entre Linhas */}
          <button
            type="button"
            onClick={handleToggleLineSpacing}
            aria-pressed={settings.lineSpacing === 'relaxed'}
            aria-label={
              settings.lineSpacing === 'relaxed'
                ? 'Desativar espaçamento estendido entre linhas'
                : 'Ativar espaçamento estendido entre linhas'
            }
            className={`inline-flex min-h-[44px] items-center gap-1 px-3 py-1 rounded-md border font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer ${
              settings.lineSpacing === 'relaxed'
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span aria-hidden="true">≡</span>
            <span>Espaçamento</span>
          </button>

          {/* Fonte Dislexia */}
          <button
            type="button"
            onClick={handleToggleDyslexia}
            aria-pressed={settings.dyslexiaFont}
            aria-label={
              settings.dyslexiaFont
                ? 'Desativar tipografia de apoio à dislexia'
                : 'Ativar tipografia de apoio à dislexia'
            }
            className={`inline-flex min-h-[44px] items-center gap-1 px-3 py-1 rounded-md border font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer ${
              settings.dyslexiaFont
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span aria-hidden="true">📖</span>
            <span>Dislexia</span>
          </button>

          {/* Áudio Automático */}
          <button
            type="button"
            onClick={handleToggleAutoAudio}
            aria-pressed={settings.autoAudio}
            aria-label={
              settings.autoAudio
                ? 'Desativar leitura de áudio automática'
                : 'Ativar leitura de áudio automática'
            }
            className={`inline-flex min-h-[44px] items-center gap-1 px-3 py-1 rounded-md border font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer ${
              settings.autoAudio
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span aria-hidden="true">🔊</span>
            <span>Áudio {settings.autoAudio ? 'Ligado' : 'Desligado'}</span>
          </button>
        </div>

        {/* VLibras Widget Opt-in */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleToggleVLibras}
            aria-pressed={settings.vlibrasActive}
            aria-label={
              settings.vlibrasActive
                ? 'Desativar tradutor de Libras (VLibras)'
                : 'Ativar tradutor de Libras (VLibras)'
            }
            className={`inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1 rounded-full border transition-all font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer ${
              settings.vlibrasActive
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span aria-hidden="true" className="text-sm">🤟</span>
            <span>VLibras {settings.vlibrasActive ? 'Ativo' : 'Desativado'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default AccessibilityBar;
