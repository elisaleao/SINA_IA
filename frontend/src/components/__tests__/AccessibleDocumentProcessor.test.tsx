import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PipelineEvent, ProcessResult } from '@/lib/accessibility-api';

const processAccessibleDocument = vi.hoisted(() => vi.fn());

vi.mock('@/lib/accessibility-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/accessibility-api')>(
    '@/lib/accessibility-api'
  );
  return { ...actual, processAccessibleDocument };
});

import AccessibleDocumentProcessor from '../AccessibleDocumentProcessor';

function result(chavePessoalFalhou: boolean): ProcessResult {
  return {
    filename: 'aula.txt',
    level: 2,
    raw_text: 'Texto original',
    accessible_text: 'Texto acessível',
    math_detection: { is_math: false, score: 0, density: 0 },
    charts: [],
    audit: { status: 'ok', itens: [] },
    text_download_url: '/api/accessibility/files/a.txt',
    audio_url: '/api/accessibility/files/a.mp3',
    chave_pessoal_falhou: chavePessoalFalhou,
  };
}

async function processWith(processed: ProcessResult) {
  processAccessibleDocument.mockImplementationOnce(
    async (_file: File, _level: number, onEvent: (event: PipelineEvent) => void) => {
      onEvent({ type: 'result', result: processed });
    }
  );
  render(<AccessibleDocumentProcessor />);
  fireEvent.change(screen.getByLabelText('Documento'), {
    target: { files: [new File(['texto'], 'aula.txt', { type: 'text/plain' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Processar documento' }));
  await screen.findByRole('heading', { name: 'Resultado' });
}

describe('AccessibleDocumentProcessor fallback notice', () => {
  beforeEach(() => {
    processAccessibleDocument.mockReset();
  });

  it('warns when the personal key failed and the free ai finished the job', async () => {
    await processWith(result(true));

    const notice = screen.getByText(/sua chave do Gemini falhou/);
    expect(notice.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Conferir a chave' })).toHaveAttribute(
      'href',
      '/configuracoes/chave-ia'
    );
  });

  it('does not warn when the personal key was not involved', async () => {
    await processWith(result(false));

    expect(screen.queryByText(/sua chave do Gemini falhou/)).toBeNull();
  });
});
