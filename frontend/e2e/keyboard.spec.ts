import { expect, test, type Locator, type Page } from '@playwright/test';

import { mockApi, signIn } from './support/api';
import { ROUTES } from './support/routes';

async function pressUntilFocused(
  page: Page,
  target: Locator,
  key: 'Tab' | 'Shift+Tab',
  maxPresses = 40
) {
  const handle = await target.elementHandle();
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press(key);
    const focused = await page.evaluate((el) => el === document.activeElement, handle);
    if (focused) return;
  }
  throw new Error(`O alvo não recebeu foco com ${maxPresses} vezes ${key}`);
}

function header(page: Page) {
  return page.getByRole('navigation', { name: 'Navegação Principal do Sistema' });
}

for (const route of ROUTES) {
  test(`${route.path} can be walked by keyboard from the content to the skip link and back`, async ({ page }) => {
    // The page opens with focus on its h1; the header and the skip link must
    // still be reachable with Shift+Tab, and the skip link must take the
    // focus back to the main content.
    if (route.role) await signIn(page, route.role);
    else await mockApi(page);
    await page.goto(route.path);
    await expect(page.locator('h1')).toBeFocused();

    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo principal' });
    await pressUntilFocused(page, skipLink, 'Shift+Tab');
    await page.keyboard.press('Enter');

    await expect(page.locator('#main-content')).toBeFocused();
  });
}

test('a keyboard user reaches another page from the header with Tab and Enter', async ({ page }) => {
  await mockApi(page);
  await page.goto('/entrar');
  await expect(page.locator('h1')).toBeFocused();

  await pressUntilFocused(page, header(page).getByRole('link', { name: 'Exercícios' }), 'Shift+Tab');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/exercicios$/);
  await expect(page.locator('h1')).toBeFocused();
});

test('a signed in keyboard user reaches the settings from the header', async ({ page }) => {
  await signIn(page);
  await page.goto('/inicio');
  await expect(page.locator('h1')).toBeFocused();

  await pressUntilFocused(
    page,
    header(page).getByRole('link', { name: /Configurações/ }),
    'Shift+Tab'
  );
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/configuracoes\/perfil$/);
  await expect(page.locator('h1')).toBeFocused();
});
