import { expect, test } from '@playwright/test';

import { mockApi, signIn } from './support/api';

test('focus moves to the new page h1 after following a header link', async ({ page }) => {
  // Screen reader users hear where they landed instead of starting again
  // from the top of the page.
  await mockApi(page);
  await page.goto('/entrar');

  await page
    .getByRole('navigation', { name: 'Navegação Principal do Sistema' })
    .getByRole('link', { name: 'Exercícios' })
    .click();

  await expect(page).toHaveURL(/\/exercicios$/);
  await expect(page.locator('h1')).toBeFocused();
});

test('focus moves to the h1 after navigating with a session', async ({ page }) => {
  await signIn(page);
  await page.goto('/inicio');

  await page
    .getByRole('navigation', { name: 'Navegação Principal do Sistema' })
    .getByRole('link', { name: 'Quiz' })
    .click();

  await expect(page).toHaveURL(/\/quiz$/);
  await expect(page.locator('h1')).toBeFocused();
});
