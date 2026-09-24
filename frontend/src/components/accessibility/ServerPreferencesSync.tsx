'use client';

import { useEffect } from 'react';

import { useSession } from '@/components/session/SessionProvider';
import { fromServerPreferences } from '@/lib/accessibility-preferences';
import { useAccessibility } from './AccessibilityProvider';

export function ServerPreferencesSync() {
  const { user } = useSession();
  const { hydrate } = useAccessibility();
  const prefs = user?.accessibility_preferences;

  useEffect(() => {
    if (prefs) hydrate(fromServerPreferences(prefs));
  }, [prefs, hydrate]);

  return null;
}
