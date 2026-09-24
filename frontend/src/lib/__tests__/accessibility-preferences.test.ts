import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getStoredAccessToken: vi.fn<() => string | null>(),
  updateUserPreferences: vi.fn(),
}));
vi.mock('../auth', () => auth);

import {
  ApiPreferenciasRepo,
  STORAGE_KEY,
  fromServerPreferences,
  getPreferenciasRepo,
  LocalStoragePreferenciasRepo,
  toServerPreferences,
  type GlobalAccessibilitySettings,
} from '../accessibility-preferences';

const LOCAL: GlobalAccessibilitySettings = {
  fontSize: 'larger',
  highContrast: true,
  lineSpacing: 'relaxed',
  dyslexiaFont: true,
  autoAudio: false,
  vlibrasActive: true,
  reducedMotion: true,
};

const SERVER = {
  font_size: 'larger',
  high_contrast: true,
  line_spacing: 'relaxed',
  dyslexia_font: true,
  auto_audio: false,
  vlibras_active: true,
} as const;

describe('accessibility preferences sync', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.getStoredAccessToken.mockReset();
    auth.updateUserPreferences.mockReset();
  });

  it('maps the six shared preferences to the server names', () => {
    expect(toServerPreferences(LOCAL)).toEqual(SERVER);
  });

  it('maps the six server preferences back and keeps reduced motion local', () => {
    expect(fromServerPreferences(SERVER)).toEqual({
      fontSize: 'larger',
      highContrast: true,
      lineSpacing: 'relaxed',
      dyslexiaFont: true,
      autoAudio: false,
      vlibrasActive: true,
    });
  });

  it('sends every shared preference to the server when there is a session', async () => {
    auth.getStoredAccessToken.mockReturnValue('access-1');
    auth.updateUserPreferences.mockResolvedValue({});

    await new ApiPreferenciasRepo().savePreferences(LOCAL);

    expect(auth.updateUserPreferences).toHaveBeenCalledWith(SERVER);
  });

  it('uses only the browser storage without a session', async () => {
    auth.getStoredAccessToken.mockReturnValue(null);

    const repo = getPreferenciasRepo();
    await repo.savePreferences({ dyslexiaFont: true });

    expect(repo).toBeInstanceOf(LocalStoragePreferenciasRepo);
    expect(auth.updateUserPreferences).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').dyslexiaFont).toBe(true);
  });

  it('keeps the local value when the server fails', async () => {
    auth.getStoredAccessToken.mockReturnValue('access-1');
    auth.updateUserPreferences.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const saved = await new ApiPreferenciasRepo().savePreferences({ autoAudio: true });

    expect(saved.autoAudio).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').autoAudio).toBe(true);
  });
});
