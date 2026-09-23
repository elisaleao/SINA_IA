import { AccessibilityConfig } from './api';
import { apiClient } from './http';
import { localStorageTokenStore } from './http/token-store';

export type UserRole = 'aluno' | 'professor' | 'admin';

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  accessibility_preferences?: AccessibilityConfig;
};

export type AccessibilityPreferences = {
  id: string;
  user_id: string;
  profile: string;
  plain_language: boolean;
  include_glossary: boolean;
  highlight_key_points: boolean;
  font_family: string;
  font_size: string;
  line_spacing: string;
  high_contrast: boolean;
  vlibras_active: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  accessibility_preferences: AccessibilityPreferences | null;
  llm_key_configurada: boolean;
};

const VLIBRAS_STORAGE_KEY = 'sina_vlibras_ativo';

export function getStoredAccessToken(): string | null {
  return localStorageTokenStore.getAccessToken();
}

export function getStoredRefreshToken(): string | null {
  return localStorageTokenStore.getRefreshToken();
}

export function getStoredVLibrasActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(VLIBRAS_STORAGE_KEY) === 'true';
}

export function setStoredVLibrasActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VLIBRAS_STORAGE_KEY, active ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('sina-vlibras-toggle', { detail: { active } }));
}

export function storeTokens(tokens: TokenResponse): void {
  localStorageTokenStore.setTokens(tokens.access_token, tokens.refresh_token);
}

export function clearStoredTokens(): void {
  localStorageTokenStore.clear();
}

export async function loginUser(credentials: LoginCredentials): Promise<TokenResponse> {
  const data = await apiClient.request<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: credentials,
  });
  storeTokens(data);
  return data;
}

export async function registerUser(credentials: RegisterCredentials): Promise<TokenResponse> {
  const data = await apiClient.request<TokenResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: credentials,
  });
  storeTokens(data);
  return data;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }
  return apiClient.request<UserProfile>('/users/me');
}

export async function logoutUser(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  clearStoredTokens();
  if (!refreshToken) return;

  await apiClient
    .request('/auth/logout', {
      method: 'POST',
      auth: false,
      body: { refresh_token: refreshToken },
    })
    .catch(() => undefined);
}

export async function updateUserPreferences(
  prefs: Partial<AccessibilityPreferences>
): Promise<AccessibilityPreferences> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }
  return apiClient.request<AccessibilityPreferences>('/users/me/preferences', {
    method: 'PATCH',
    body: prefs,
  });
}
