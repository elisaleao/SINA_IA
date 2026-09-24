import type {
  AccessibilityPreferencesResponse,
  AccessibilityPreferencesUpdate,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  TTSEngine,
  UserResponse,
  UserRole,
} from './api-schema';
import { apiClient } from './http';
import { localStorageTokenStore } from './http/token-store';

export type { TokenResponse, TTSEngine, UserRole };
export type LoginCredentials = LoginRequest;
export type RegisterCredentials = RegisterRequest;
export type AccessibilityPreferences = AccessibilityPreferencesResponse;
export type UserProfile = UserResponse;

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
  prefs: AccessibilityPreferencesUpdate
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
