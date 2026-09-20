'use client';

import React, { useState, useEffect } from 'react';
import {
  getStoredAccessToken,
  getStoredVLibrasActive,
  setStoredVLibrasActive,
  updateUserPreferences,
} from '@/lib/auth';

export function AccessibilityBar() {
  const [vlibrasActive, setVlibrasActive] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? getStoredVLibrasActive() : false;
  });
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');

  useEffect(() => {
    const handleToggleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.active === 'boolean') {
        setVlibrasActive(customEvent.detail.active);
      }
    };

    window.addEventListener('sina-vlibras-toggle', handleToggleEvent);
    return () => {
      window.removeEventListener('sina-vlibras-toggle', handleToggleEvent);
    };
  }, []);

  const handleToggleVLibras = async () => {
    const nextState = !vlibrasActive;
    setVlibrasActive(nextState);
    setStoredVLibrasActive(nextState);

    const announcement = nextState
      ? 'Tradutor de Libras (VLibras) ativado.'
      : 'Tradutor de Libras (VLibras) desativado.';
    setStatusAnnouncement(announcement);

    // Se o usuário estiver autenticado, sincroniza a preferência no banco
    const token = getStoredAccessToken();
    if (token) {
      try {
        await updateUserPreferences({ vlibras_active: nextState });
      } catch (err) {
        console.error('Falha ao sincronizar preferência do VLibras no servidor:', err);
      }
    }
  };

  return (
    <div
      role="region"
      aria-label="Ferramentas de Acessibilidade"
      className="bg-stone-100 border-b border-stone-200 py-1.5 px-4 sm:px-6 lg:px-8 text-xs text-stone-700 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-stone-500">
          Acessibilidade:
        </span>
        <button
          type="button"
          onClick={handleToggleVLibras}
          aria-pressed={vlibrasActive}
          aria-label={
            vlibrasActive
              ? 'Desativar tradutor de Libras (VLibras)'
              : 'Ativar tradutor de Libras (VLibras)'
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            vlibrasActive
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
              : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50 hover:border-stone-400'
          }`}
        >
          <span aria-hidden="true" className="text-sm">🤟</span>
          <span>VLibras {vlibrasActive ? 'Ativo' : 'Desativado'}</span>
        </button>
      </div>

      {/* Região ao vivo para leitores de tela NVDA / JAWS */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="vlibras-announcement"
      >
        {statusAnnouncement}
      </div>
    </div>
  );
}

export default AccessibilityBar;

