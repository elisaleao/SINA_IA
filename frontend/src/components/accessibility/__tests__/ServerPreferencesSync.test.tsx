import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  status: 'authenticated',
  user: {
    accessibility_preferences: {
      font_size: 'larger',
      high_contrast: true,
      line_spacing: 'relaxed',
      dyslexia_font: true,
      auto_audio: false,
      vlibras_active: false,
    },
  },
}));
vi.mock('@/components/session/SessionProvider', () => ({
  useSession: () => session,
}));

const auth = vi.hoisted(() => ({
  getStoredAccessToken: vi.fn(() => 'access-1'),
  updateUserPreferences: vi.fn(),
}));
vi.mock('@/lib/auth', () => auth);

import {
  AccessibilityProvider,
  useAccessibility,
} from '../AccessibilityProvider';
import { ServerPreferencesSync } from '../ServerPreferencesSync';
import { STORAGE_KEY } from '@/lib/accessibility-preferences';

function FontSize() {
  const { settings } = useAccessibility();
  return <p>fonte:{settings.fontSize}</p>;
}

describe('ServerPreferencesSync', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.updateUserPreferences.mockReset();
  });

  it('replaces the browser preferences with the ones saved in the account', async () => {
    // Someone who set a large font on another computer gets it here too.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fontSize: 'normal', dyslexiaFont: false })
    );

    render(
      <AccessibilityProvider>
        <ServerPreferencesSync />
        <FontSize />
      </AccessibilityProvider>
    );

    expect(await screen.findByText('fonte:larger')).toBeInTheDocument();
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-font-size', 'larger')
    );
    expect(document.documentElement).toHaveAttribute('data-dyslexia', 'true');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      fontSize: 'larger',
      highContrast: true,
      lineSpacing: 'relaxed',
      dyslexiaFont: true,
    });
    expect(auth.updateUserPreferences).not.toHaveBeenCalled();
  });
});
