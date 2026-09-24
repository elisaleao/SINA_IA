'use client';

import React, { useState } from 'react';

import { Dropzone, RadioCard } from '@/components/ui';
import { MaterialUploadError } from '@/lib/materials';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.webp'];

const LEVELS = [
  { value: '', title: 'Automático pelo meu perfil', description: 'Usa o nível das suas preferências' },
  { value: '1', title: 'Nível 1', description: 'Fidelidade máxima' },
  { value: '2', title: 'Nível 2', description: 'Linguagem simplificada' },
  { value: '3', title: 'Nível 3', description: 'Linguagem muito simples' },
  { value: '4', title: 'Nível 4', description: 'Resumo acessível' },
];

function extensionError(file: File): string | undefined {
  const name = file.name.toLowerCase();
  if (ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return undefined;
  return 'Formato não aceito. Use PDF, DOCX, TXT, PNG, JPG ou WEBP.';
}

export interface MaterialUploaderProps {
  onUpload: (files: File[], nivel?: number) => Promise<void>;
}

export function MaterialUploader({ onUpload }: MaterialUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [nivel, setNivel] = useState('');
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorFor = (file: File) => extensionError(file) ?? serverErrors[file.name];
  const hasLocalError = files.some((file) => extensionError(file) !== undefined);

  const handleSelected = (selected: FileList | File[]) => {
    setFiles((previous) => [...previous, ...Array.from(selected)]);
    setServerErrors({});
    setGeneral(null);
    setSuccess(null);
  };

  const handleRemove = (index: number) => {
    setFiles((previous) => previous.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (files.length === 0 || hasLocalError) return;
    setBusy(true);
    setServerErrors({});
    setGeneral(null);
    setSuccess(null);
    try {
      await onUpload(files, nivel ? Number(nivel) : undefined);
      setFiles([]);
      setSuccess('Enviado! Acompanhe o status de cada material na lista.');
    } catch (error) {
      if (error instanceof MaterialUploadError && !error.general) {
        setServerErrors(Object.fromEntries(error.files.map((f) => [f.arquivo, f.erro])));
      } else {
        setGeneral(error instanceof Error ? error.message : 'Não foi possível enviar agora.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" aria-busy={busy}>
      <Dropzone onFilesSelected={handleSelected} disabled={busy} id="materiais-dropzone" />

      {files.length > 0 && (
        <section aria-labelledby="escolhidos-title">
          <h3 id="escolhidos-title" className="text-sm font-bold text-stone-900 mb-2">
            Arquivos escolhidos
          </h3>
          <ul className="flex flex-col gap-2">
            {files.map((file, index) => {
              const error = errorFor(file);
              return (
                <li
                  key={`${file.name}-${index}`}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
                    error ? 'border-red-300 bg-red-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-stone-900">{file.name}</span>
                    {error && (
                      <span className="font-bold text-red-900">
                        <span aria-hidden="true">✕ </span>
                        {error}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    disabled={busy}
                    aria-label={`Remover ${file.name}`}
                    className="min-h-[44px] rounded-full border border-stone-400 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <fieldset>
        <legend className="text-sm font-bold text-stone-900 mb-2">Nível de adaptação</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEVELS.map((level) => (
            <RadioCard
              key={level.value || 'auto'}
              id={`nivel-material-${level.value || 'auto'}`}
              name="nivel-material"
              value={level.value}
              checked={nivel === level.value}
              onChange={setNivel}
              title={level.title}
              description={level.description}
              disabled={busy}
            />
          ))}
        </div>
      </fieldset>

      {general && (
        <div role="alert" className="p-4 rounded-xl border border-red-300 bg-red-50 text-sm font-bold text-red-900">
          Erro: {general}
        </div>
      )}
      {success && (
        <div role="status" className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-900">
          ✓ {success}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || files.length === 0 || hasLocalError}
        className="min-h-[44px] self-start rounded-full bg-blue-700 px-8 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
      >
        {busy ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  );
}
