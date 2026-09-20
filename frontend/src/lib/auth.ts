import { API_BASE_URL, AccessibilityConfig } from './api';

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
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  accessibility_preferences: AccessibilityPreferences | null;
};

const ACCESS_TOKEN_KEY = 'sina_access_token';
const REFRESH_TOKEN_KEY = 'sina_refresh_token';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(tokens: TokenResponse): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function loginUser(credentials: LoginCredentials): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(errorData.detail || 'Falha ao autenticar. Verifique seus dados.');
  }

  const data = (await response.json()) as TokenResponse;
  storeTokens(data);
  return data;
}

export async function registerUser(credentials: RegisterCredentials): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(errorData.detail || 'Falha ao realizar cadastro.');
  }

  const data = (await response.json()) as TokenResponse;
  storeTokens(data);
  return data;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredTokens();
    }
    throw new Error('Não foi possível obter os dados do perfil.');
  }

  return (await response.json()) as UserProfile;
}

export async function logoutUser(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignora erro de rede no logout
    }
  }
  clearStoredTokens();
}

