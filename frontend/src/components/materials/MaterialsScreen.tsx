'use client';

import React, { useState } from 'react';

import { MaterialList } from './MaterialList';
import { MaterialResult } from './MaterialResult';
import { MaterialUploader } from './MaterialUploader';
import { useMaterials } from './useMaterials';

export function MaterialsScreen() {
  const { materials, announcement, upload, retry, remove } = useMaterials();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guard = (action: (id: string) => Promise<void>) => (id: string) => {
    setError(null);
    action(id).catch((e: unknown) =>
      setError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.')
    );
  };

  const handleRemove = (id: string) => {
    if (openId === id) setOpenId(null);
    guard(remove)(id);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Meus materiais
        </h1>
        <p className="mt-2 text-base text-stone-600">
          Envie seus arquivos de estudo. Cada um vira texto acessível, descrição de gráficos e
          áudio, e fica salvo para você voltar quando quiser.
        </p>
      </header>

      <MaterialUploader onUpload={upload} />

      {error && (
        <p role="alert" className="p-4 rounded-xl border border-red-300 bg-red-50 text-sm font-bold text-red-900">
          Erro: {error}
        </p>
      )}

      <MaterialList
        materials={materials}
        announcement={announcement}
        onRetry={guard(retry)}
        onRemove={handleRemove}
        onOpen={setOpenId}
      />

      {openId && (
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="min-h-[44px] self-end rounded-full border border-stone-400 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Fechar resultado
          </button>
          <MaterialResult key={openId} materialId={openId} />
        </div>
      )}
    </div>
  );
}
