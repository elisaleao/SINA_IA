import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dropzone } from '../Dropzone';

function names(files: FileList | File[]): string[] {
  return Array.from(files).map((file) => file.name);
}

function browserLikeInput(input: HTMLInputElement) {
  let value = '';
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => value,
    set: (next: string) => {
      value = next;
    },
  });
  return (file: File) => {
    const path = `C:\\fakepath\\${file.name}`;
    if (value === path) return;
    value = path;
    fireEvent.change(input, { target: { files: [file] } });
  };
}

describe('Dropzone', () => {
  it('treats the same file chosen twice in a row as two selections', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<Dropzone onFilesSelected={onFilesSelected} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const choose = browserLikeInput(input);
    const file = new File(['a'], 'aula.pdf', { type: 'application/pdf' });

    choose(file);
    choose(file);

    expect(onFilesSelected).toHaveBeenCalledTimes(2);
    expect(names(onFilesSelected.mock.calls[1][0])).toEqual(['aula.pdf']);
  });

  it('describes the accepted formats and the 20 MB limit on the button', () => {
    render(<Dropzone onFilesSelected={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Escolher arquivos' });
    const description = document.getElementById(
      button.getAttribute('aria-describedby') ?? ''
    );

    expect(description).not.toBeNull();
    for (const format of ['PDF', 'DOCX', 'TXT', 'PNG', 'JPG', 'WEBP', '20 MB']) {
      expect(description).toHaveTextContent(format);
    }
  });

  it('delivers dropped files the same way as chosen files', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<Dropzone onFilesSelected={onFilesSelected} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File(['a'], 'aula.pdf'), new File(['b'], 'notas.txt')];

    fireEvent.change(input, { target: { files } });
    fireEvent.drop(input.parentElement as HTMLElement, { dataTransfer: { files } });

    expect(names(onFilesSelected.mock.calls[0][0])).toEqual(['aula.pdf', 'notas.txt']);
    expect(names(onFilesSelected.mock.calls[1][0])).toEqual(['aula.pdf', 'notas.txt']);
  });
});
