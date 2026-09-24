import { expect, test } from '@playwright/test';

import { mockApi } from './support/api';

test('the sign in page opens with its title and a single h1', async ({ page }) => {
  await mockApi(page);

  await page.goto('/entrar');

  await expect(page).toHaveTitle('Entrar | SINA_IA');
  await expect(page.locator('h1')).toHaveCount(1);
});
