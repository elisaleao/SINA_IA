import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { mockApi, signIn } from './support/api';

type Role = 'aluno' | 'professor';

const HOME_TITLE = 'SINA_IA — Plataforma Educacional Inclusiva e Adaptativa';

const ROUTES: { path: string; title: string; role?: Role }[] = [
  { path: '/', title: HOME_TITLE },
  { path: '/entrar', title: 'Entrar | SINA_IA' },
  { path: '/cadastro', title: 'Criar conta | SINA_IA' },
  { path: '/boas-vindas', title: 'Boas-vindas | SINA_IA' },
  { path: '/inicio', title: 'Meu painel de estudos | SINA_IA' },
  { path: '/quiz', title: 'Hub de testes rápidos | SINA_IA' },
  { path: '/exercicios', title: 'Quiz de verdadeiro ou falso | SINA_IA' },
  { path: '/conhecer-mais', title: 'Conhecer mais | SINA_IA' },
  { path: '/materias/calculo', title: 'Cálculo Diferencial e Integral | SINA_IA' },
  { path: '/ambientes/exemplo', title: 'Ambiente de estudo | SINA_IA' },
  {
    path: '/configuracoes/acessibilidade',
    title: 'Preferências de acessibilidade | SINA_IA',
  },
  { path: '/processar', title: 'Meus materiais | SINA_IA', role: 'aluno' },
  { path: '/configuracoes/perfil', title: 'Perfil | SINA_IA', role: 'aluno' },
  { path: '/configuracoes/chave-ia', title: 'Chave de IA | SINA_IA', role: 'aluno' },
  { path: '/aluno', title: 'Área do aluno | SINA_IA', role: 'aluno' },
  { path: '/aluno/chat', title: 'Conversa do aluno | SINA_IA', role: 'aluno' },
  { path: '/professor', title: 'Área do professor | SINA_IA', role: 'professor' },
  {
    path: '/professor/chat',
    title: 'Conversa do professor | SINA_IA',
    role: 'professor',
  },
];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

async function expectSingleH1(page: Page) {
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));
  expect(summary).toEqual([]);
}

test('every route has a title of its own', () => {
  const titles = ROUTES.map((route) => route.title);
  expect(new Set(titles).size).toBe(titles.length);
});

for (const route of ROUTES) {
  test(`${route.path} opens with its title, one h1 and no axe violations`, async ({ page }) => {
    if (route.role) await signIn(page, route.role);
    else await mockApi(page);

    const response = await page.goto(route.path);

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(route.title);
    await expectSingleH1(page);
    await expectNoAxeViolations(page);
  });
}

for (const route of ROUTES.filter((r) => r.role)) {
  test(`${route.path} sends a visitor without a session to the sign in page`, async ({ page }) => {
    await mockApi(page);

    await page.goto(route.path);

    await expect(page).toHaveURL(/\/entrar$/);
  });
}

test('/login leads to the sign in page', async ({ page }) => {
  await mockApi(page);

  await page.goto('/login');

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page).toHaveTitle('Entrar | SINA_IA');
});

test('/configuracoes leads to the profile settings', async ({ page }) => {
  await signIn(page);

  await page.goto('/configuracoes');

  await expect(page).toHaveURL(/\/configuracoes\/perfil$/);
  await expect(page).toHaveTitle('Perfil | SINA_IA');
});
