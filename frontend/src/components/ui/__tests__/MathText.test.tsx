import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MathText } from '../MathText';

describe('MathText', () => {
  it('renders inline LaTeX as a formula with MathML for screen readers', () => {
    const { container } = render(<MathText text="A derivada de $x^2$ é $2x$." />);

    expect(container.querySelectorAll('math')).toHaveLength(2);
    expect(container.textContent).not.toContain('$');
    expect(container.textContent).toContain('A derivada de');
  });

  it('renders $$ blocks in display mode', () => {
    const { container } = render(<MathText text="Veja: $$\int_0^1 2x\,dx = 1$$ fim." />);

    expect(container.querySelector('math[display="block"]')).not.toBeNull();
    expect(container.textContent).toContain('fim.');
  });

  it('leaves text without formulas untouched', () => {
    const { container } = render(<MathText text="Sem fórmula nenhuma aqui." />);

    expect(container.querySelector('math')).toBeNull();
    expect(container.textContent).toBe('Sem fórmula nenhuma aqui.');
  });

  it('does not treat money amounts as formulas', () => {
    // Brazilian materials mention R$ often; that must stay plain text.
    const { container } = render(<MathText text="Custa R$ 10 e R$ 20." />);

    expect(container.querySelector('math')).toBeNull();
    expect(container.textContent).toBe('Custa R$ 10 e R$ 20.');
  });

  it('shows the original text when the LaTeX is invalid', () => {
    const { container } = render(<MathText text="Erro: $\frac{1}{$ aqui." />);

    expect(container.textContent).toContain('\\frac{1}{');
    expect(container.querySelector('.katex-error')).toBeNull();
  });

  it('never turns the text into HTML', () => {
    const { container } = render(<MathText text={'<img src=x onerror="alert(1)"> e $x$'} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x');
  });
});
