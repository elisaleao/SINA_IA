import type { Page, Route } from '@playwright/test';

export const API_URL = 'http://localhost:8000';

export const PROFILE = {
  id: 'u1',
  email: 'aluna@sina.dev',
  full_name: 'Aluna Teste',
  role: 'aluno',
  is_active: true,
  version_id: 1,
  created_at: '2026-09-24T10:00:00Z',
  updated_at: '2026-09-24T10:00:00Z',
  accessibility_preferences: null,
  llm_key_configurada: false,
};

type Role = 'aluno' | 'professor' | 'admin';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function mockApi(page: Page, options: { role?: Role } = {}) {
  await page.route(`${API_URL}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/users/me') {
      return options.role
        ? json(route, { ...PROFILE, role: options.role })
        : json(route, { detail: 'Não autenticado.' }, 401);
    }
    if (pathname === '/auth/refresh') {
      return json(route, { detail: 'Sessão expirada.' }, 401);
    }
    if (route.request().method() === 'GET') return json(route, []);
    return json(route, {});
  });
}

export async function signIn(page: Page, role: Role = 'aluno') {
  await mockApi(page, { role });
  await page.addInitScript(() => {
    window.localStorage.setItem('sina_access_token', 'access-e2e');
    window.localStorage.setItem('sina_refresh_token', 'refresh-e2e');
  });
}
