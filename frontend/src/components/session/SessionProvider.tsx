'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchUserProfile,
  getStoredAccessToken,
  logoutUser,
  type UserProfile,
  type UserRole,
} from '@/lib/auth';
import { apiClient } from '@/lib/http';
import { purgeLegacyLocalData } from '@/lib/legacy-storage';
import { appRoutes } from '@/lib/routes';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface SessionContextValue {
  status: SessionStatus;
  user: UserProfile | null;
  role: UserRole | null;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

async function loadProfile(): Promise<UserProfile | null> {
  if (!getStoredAccessToken()) return null;
  return fetchUserProfile().catch(() => null);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);

  const applyProfile = useCallback((profile: UserProfile | null) => {
    setUser(profile);
    setStatus(profile ? 'authenticated' : 'anonymous');
  }, []);

  const reload = useCallback(async () => {
    applyProfile(await loadProfile());
  }, [applyProfile]);

  const signOut = useCallback(async () => {
    await logoutUser();
    applyProfile(null);
    router.push(appRoutes.home);
  }, [applyProfile, router]);

  useEffect(() => {
    purgeLegacyLocalData();
    void loadProfile().then(applyProfile);
  }, [applyProfile]);

  useEffect(() => {
    const unsubscribe = apiClient.onSessionExpired(() => {
      applyProfile(null);
      router.push(appRoutes.login);
    });
    return () => {
      unsubscribe();
    };
  }, [applyProfile, router]);

  const value = useMemo(
    () => ({ status, user, role: user?.role ?? null, reload, signOut }),
    [status, user, reload, signOut]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession deve ser usado dentro de SessionProvider.');
  }
  return context;
}
