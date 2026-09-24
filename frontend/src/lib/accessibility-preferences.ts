import type { AccessibilityPreferencesUpdate } from './api-schema';
import { getStoredAccessToken, updateUserPreferences } from './auth';

export type FontSizeOption = 'normal' | 'large' | 'larger';
export type LineSpacingOption = 'normal' | 'relaxed';

export interface GlobalAccessibilitySettings {
  fontSize: FontSizeOption;
  highContrast: boolean;
  lineSpacing: LineSpacingOption;
  dyslexiaFont: boolean;
  autoAudio: boolean;
  vlibrasActive: boolean;
  reducedMotion: boolean;
}

export const STORAGE_KEY = 'sina_global_accessibility';

export function getDefaultAccessibilitySettings(): GlobalAccessibilitySettings {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const prefersHighContrast =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-contrast: more)').matches;

  return {
    fontSize: 'normal',
    highContrast: Boolean(prefersHighContrast),
    lineSpacing: 'normal',
    dyslexiaFont: false,
    autoAudio: false,
    vlibrasActive: false,
    reducedMotion: Boolean(prefersReducedMotion),
  };
}

export type SharedAccessibilitySettings = Omit<GlobalAccessibilitySettings, 'reducedMotion'>;

export type ServerAccessibilityPreferences = Pick<
  AccessibilityPreferencesUpdate,
  'font_size' | 'high_contrast' | 'line_spacing' | 'dyslexia_font' | 'auto_audio' | 'vlibras_active'
>;

export function toServerPreferences(
  settings: SharedAccessibilitySettings
): ServerAccessibilityPreferences {
  return {
    font_size: settings.fontSize,
    high_contrast: settings.highContrast,
    line_spacing: settings.lineSpacing,
    dyslexia_font: settings.dyslexiaFont,
    auto_audio: settings.autoAudio,
    vlibras_active: settings.vlibrasActive,
  };
}

export function fromServerPreferences(
  prefs: ServerAccessibilityPreferences
): Partial<SharedAccessibilitySettings> {
  const mapped: Partial<SharedAccessibilitySettings> = {};
  if (prefs.font_size != null) mapped.fontSize = prefs.font_size;
  if (prefs.high_contrast != null) mapped.highContrast = prefs.high_contrast;
  if (prefs.line_spacing != null) mapped.lineSpacing = prefs.line_spacing;
  if (prefs.dyslexia_font != null) mapped.dyslexiaFont = prefs.dyslexia_font;
  if (prefs.auto_audio != null) mapped.autoAudio = prefs.auto_audio;
  if (prefs.vlibras_active != null) mapped.vlibrasActive = prefs.vlibras_active;
  return mapped;
}

export interface PreferenciasRepo {
  getPreferences(): Promise<GlobalAccessibilitySettings>;
  savePreferences(
    prefs: Partial<GlobalAccessibilitySettings>
  ): Promise<GlobalAccessibilitySettings>;
}

export class LocalStoragePreferenciasRepo implements PreferenciasRepo {
  async getPreferences(): Promise<GlobalAccessibilitySettings> {
    const defaults = getDefaultAccessibilitySettings();
    if (typeof window === 'undefined') return defaults;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaults;
      const parsed = JSON.parse(stored) as Partial<GlobalAccessibilitySettings>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  async savePreferences(
    prefs: Partial<GlobalAccessibilitySettings>
  ): Promise<GlobalAccessibilitySettings> {
    const current = await this.getPreferences();
    const updated: GlobalAccessibilitySettings = { ...current, ...prefs };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao salvar preferências no localStorage:', err);
      }
    }
    return updated;
  }
}

export class ApiPreferenciasRepo implements PreferenciasRepo {
  private localRepo = new LocalStoragePreferenciasRepo();

  async getPreferences(): Promise<GlobalAccessibilitySettings> {
    // Retorna primeiro do cache local
    return this.localRepo.getPreferences();
  }

  async savePreferences(
    prefs: Partial<GlobalAccessibilitySettings>
  ): Promise<GlobalAccessibilitySettings> {
    const updated = await this.localRepo.savePreferences(prefs);

    const token = getStoredAccessToken();
    if (token) {
      try {
        await updateUserPreferences(toServerPreferences(updated));
      } catch (err) {
        console.warn('Falha ao sincronizar preferências com a API:', err);
      }
    }

    return updated;
  }
}

export function getPreferenciasRepo(): PreferenciasRepo {
  if (typeof window !== 'undefined' && getStoredAccessToken()) {
    return new ApiPreferenciasRepo();
  }
  return new LocalStoragePreferenciasRepo();
}

export function applyAccessibilitySettingsToDom(
  settings: GlobalAccessibilitySettings
): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-font-size', settings.fontSize);
  root.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal');
  root.setAttribute('data-line-height', settings.lineSpacing);
  root.setAttribute('data-dyslexia', settings.dyslexiaFont ? 'true' : 'false');
  root.setAttribute('data-auto-audio', settings.autoAudio ? 'true' : 'false');
  root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false');
}

