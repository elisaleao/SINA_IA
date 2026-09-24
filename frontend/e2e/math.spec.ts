import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { API_URL, signIn } from './support/api';

const QUESTION = {
  id: 'q1',
  materia_id: 'calculo',
  nivel: 'basico',
  enunciado: 'A derivada de $f(x) = x^2$ é $2x$, e $$\\int_0^1 2x\\,dx = 1$$',
  enunciado_falado: 'A derivada de f de x igual a x ao quadrado é dois x.',
  codigo: null,
  linguagem: null,
  numero_questao: 1,
  total_questoes: 1,
  tempo_limite_segundos: 0,
  tempo_restante_segundos: 0,
};

test('quiz formulas render as math and pass axe', async ({ page }) => {
  await signIn(page);
  await page.route(`${API_URL}/api/exercicios/sessoes`, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 's1', total_questoes: 1, tempo_limite_segundos: 0 }),
    })
  );
  await page.route(`${API_URL}/api/exercicios/sessoes/s1/proxima`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(QUESTION) })
  );
  await page.goto('/exercicios');

  await page.getByRole('button', { name: 'Iniciar Treino Acessível' }).click();

  const question = page.getByRole('heading', { level: 2, name: /Questão 1 de 1/ });
  await expect(question).toBeFocused();
  await expect(question.locator('.katex')).toHaveCount(3);
  await expect(question.locator('[aria-hidden="true"]').first()).not.toContainText('$');

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
});
