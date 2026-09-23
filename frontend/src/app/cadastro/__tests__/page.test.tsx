import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CadastroPage from '../page';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const registerUser = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      token_type: 'bearer',
      expires_in: 900,
    })
  )
);
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>(
    '@/lib/auth'
  );
  return { ...actual, registerUser };
});

describe('CadastroPage', () => {
  beforeEach(() => {
    push.mockReset();
    registerUser.mockClear();
  });

  it('navigates to /inicio after a successful sign up', async () => {
    render(<CadastroPage />);

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Aluna Teste' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: 'aluna@sina.dev' },
    });
    fireEvent.change(screen.getByLabelText(/Senha segura/), {
      target: { value: 'senhaForte123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Concluir Cadastro' })
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith('/inicio'));
  });
});
