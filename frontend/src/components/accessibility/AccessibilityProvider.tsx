'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  applyAccessibilitySettingsToDom,
  getDefaultAccessibilitySettings,
  getPreferenciasRepo,
  GlobalAccessibilitySettings,
} from '@/lib/accessibility-preferences';

interface AccessibilityContextValue {
  settings: GlobalAccessibilitySettings;
  updateSettings: (
    partial: Partial<GlobalAccessibilitySettings>
  ) => Promise<GlobalAccessibilitySettings>;
  announcement: string;
}

const AccessibilityContext = createContext<
  AccessibilityContextValue | undefined
>(undefined);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<GlobalAccessibilitySettings>(
    getDefaultAccessibilitySettings
  );
  const [announcement, setAnnouncement] = useState<string>('');

  useEffect(() => {
    const repo = getPreferenciasRepo();
    repo.getPreferences().then((initial) => {
      setSettings(initial);
      applyAccessibilitySettingsToDom(initial);
    });
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<GlobalAccessibilitySettings>) => {
      const repo = getPreferenciasRepo();
      const updated = await repo.savePreferences(partial);
      setSettings(updated);
      applyAccessibilitySettingsToDom(updated);

      // Gera mensagem para leitor de tela
      const announcements: string[] = [];
      if (partial.fontSize !== undefined) {
        const labels = {
          normal: 'Tamanho de fonte normal',
          large: 'Tamanho de fonte grande',
          larger: 'Tamanho de fonte muito grande',
        };
        announcements.push(labels[partial.fontSize]);
      }
      if (partial.highContrast !== undefined) {
        announcements.push(
          partial.highContrast ? 'Alto contraste ativado' : 'Alto contraste desativado'
        );
      }
      if (partial.lineSpacing !== undefined) {
        announcements.push(
          partial.lineSpacing === 'relaxed'
            ? 'Espaçamento de linhas ampliado'
            : 'Espaçamento de linhas padrão'
        );
      }
      if (partial.dyslexiaFont !== undefined) {
        announcements.push(
          partial.dyslexiaFont
            ? 'Fonte de apoio à dislexia ativada'
            : 'Fonte padrão ativada'
        );
      }
      if (partial.autoAudio !== undefined) {
        announcements.push(
          partial.autoAudio
            ? 'Áudio automático ativado'
            : 'Áudio automático desativado'
        );
      }
      if (partial.vlibrasActive !== undefined) {
        announcements.push(
          partial.vlibrasActive
            ? 'Tradutor de Libras ativado'
            : 'Tradutor de Libras desativado'
        );
      }

      if (announcements.length > 0) {
        setAnnouncement(announcements.join('. '));
      }

      return updated;
    },
    []
  );

  useEffect(() => {
    const handleVlibrasExternal = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.active === 'boolean') {
        updateSettings({ vlibrasActive: customEvent.detail.active });
      }
    };

    window.addEventListener('sina-vlibras-toggle', handleVlibrasExternal);
    return () => {
      window.removeEventListener('sina-vlibras-toggle', handleVlibrasExternal);
    };
  }, [updateSettings]);

  return (
    <AccessibilityContext.Provider
      value={{ settings, updateSettings, announcement }}
    >
      {children}
      {/* Região global ao vivo para anúncio de leitores de tela */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="accessibility-live-announcer"
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      'useAccessibility deve ser utilizado dentro de um AccessibilityProvider'
    );
  }
  return context;
}

