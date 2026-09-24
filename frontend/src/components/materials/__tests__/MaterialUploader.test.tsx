import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MaterialUploadError } from '@/lib/materials';
import { MaterialUploader } from '../MaterialUploader';

function choose(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

function pdf(name = 'aula.pdf'): File {
  return new File(['a'], name, { type: 'application/pdf' });
}

function chosenItem(name: string): HTMLElement {
  return screen.getByText(name).closest('li') as HTMLElement;
}

describe('MaterialUploader', () => {
  it('lists dropped files the same way as chosen ones', () => {
    const { container } = render(<MaterialUploader onUpload={vi.fn()} />);
    const zone = (container.querySelector('input[type="file"]') as HTMLElement)
      .parentElement as HTMLElement;

    choose(container, [pdf('aula.pdf')]);
    fireEvent.drop(zone, { dataTransfer: { files: [pdf('lista.pdf')] } });

    expect(chosenItem('aula.pdf')).toBeInTheDocument();
    expect(chosenItem('lista.pdf')).toBeInTheDocument();
  });

  it('sends the chosen files with the automatic level by default', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<MaterialUploader onUpload={onUpload} />);
    choose(container, [pdf()]);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Enviado');
    expect(onUpload).toHaveBeenCalledWith([expect.objectContaining({ name: 'aula.pdf' })], undefined);
    expect(screen.queryByText('aula.pdf')).toBeNull();
  });

  it('sends the level the student picked', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<MaterialUploader onUpload={onUpload} />);
    choose(container, [pdf()]);

    fireEvent.click(screen.getByLabelText(/Nível 3/));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await screen.findByRole('status');
    expect(onUpload).toHaveBeenCalledWith(expect.any(Array), 3);
  });

  it('shows that the upload is in progress', async () => {
    const onUpload = vi.fn().mockReturnValue(new Promise(() => undefined));
    const { container } = render(<MaterialUploader onUpload={onUpload} />);
    choose(container, [pdf()]);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });

  it('shows each backend rejection beside the file name', async () => {
    const onUpload = vi.fn().mockRejectedValue(
      new MaterialUploadError('Recusados.', undefined, [
        { arquivo: 'virus.pdf', erro: 'O conteúdo não é um PDF.' },
      ])
    );
    const { container } = render(<MaterialUploader onUpload={onUpload} />);
    choose(container, [pdf('virus.pdf'), pdf('aula.pdf')]);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(
      await within(chosenItem('virus.pdf')).findByText('O conteúdo não é um PDF.')
    ).toBeInTheDocument();
    expect(within(chosenItem('aula.pdf')).queryByText(/não é/)).toBeNull();
  });

  it('shows a general backend rejection as an alert', async () => {
    const onUpload = vi.fn().mockRejectedValue(
      new MaterialUploadError('Envie no máximo 10 arquivos por vez.', 'Envie no máximo 10 arquivos por vez.', [])
    );
    const { container } = render(<MaterialUploader onUpload={onUpload} />);
    choose(container, [pdf()]);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Envie no máximo 10 arquivos por vez.'
    );
  });

  it('flags a file with an unaccepted extension and sends nothing while it is chosen', () => {
    const onUpload = vi.fn();
    const { container } = render(<MaterialUploader onUpload={onUpload} />);
    choose(container, [pdf(), new File(['x'], 'jogo.exe')]);

    expect(within(chosenItem('jogo.exe')).getByText(/Formato não aceito/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onUpload).not.toHaveBeenCalled();

    fireEvent.click(within(chosenItem('jogo.exe')).getByRole('button', { name: /Remover/ }));
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });
});
