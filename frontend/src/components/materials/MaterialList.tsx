'use client';

import React, { useEffect, useRef, useState } from 'react';

import { EmptyState, FallbackNotice, StatusBadge, StatusVariant } from '@/components/ui';
import type { MaterialSummary } from '@/lib/materials';
import { STATUS_LABEL } from './useMaterials';

const STATUS_VARIANT: Record<MaterialSummary['status'], StatusVariant> = {
  enviado: 'info',
  processando: 'warning',
  pronto: 'success',
  erro: 'error',
};

const actionClass =
  'min-h-[44px] rounded-full border px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600';

function formatSize(bytes: number | null | undefined): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export interface MaterialListProps {
  materials: MaterialSummary[];
  announcement: string;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}

export function MaterialList({
  materials,
  announcement,
  onRetry,
  onRemove,
  onOpen,
}: MaterialListProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  return (
    <section aria-labelledby="lista-materiais-title" className="flex flex-col gap-4">
      <h2 id="lista-materiais-title" className="text-xl font-bold text-stone-900">
        Materiais enviados
      </h2>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {materials.length === 0 ? (
        <EmptyState
          title="Envie seu primeiro material"
          description="Os arquivos enviados aparecem aqui com o status de cada um."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {materials.map((material) => {
            const size = formatSize(material.tamanho_bytes);
            const name = material.nome_original;
            return (
              <li key={material.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-stone-900">{name}</span>
                    {size && <span className="text-sm text-stone-600">{size}</span>}
                  </div>
                  <StatusBadge
                    status={STATUS_VARIANT[material.status]}
                    label={STATUS_LABEL[material.status]}
                  />
                </div>

                {material.reaproveitado && (
                  <p className="mt-2 text-sm text-stone-700">
                    Resultado reaproveitado de um envio anterior
                  </p>
                )}
                {material.chave_pessoal_falhou && <FallbackNotice />}
                {material.status === 'erro' && material.erro_mensagem && (
                  <p className="mt-2 text-sm font-bold text-red-900">{material.erro_mensagem}</p>
                )}

                {confirming === material.id ? (
                  <div role="group" aria-label={`Confirmar exclusão de ${name}`} className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">Apagar {name}?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        onRemove(material.id);
                      }}
                      className={`${actionClass} border-red-700 text-red-800 hover:bg-red-50`}
                    >
                      Sim, apagar
                    </button>
                    <button
                      type="button"
                      ref={cancelRef}
                      onClick={() => setConfirming(null)}
                      className={`${actionClass} border-stone-400 text-stone-800 hover:bg-stone-100`}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {material.status === 'pronto' && (
                      <button
                        type="button"
                        onClick={() => onOpen(material.id)}
                        aria-label={`Abrir ${name}`}
                        className={`${actionClass} border-blue-700 bg-blue-700 text-white hover:bg-blue-800`}
                      >
                        Abrir
                      </button>
                    )}
                    {material.status === 'erro' && (
                      <button
                        type="button"
                        onClick={() => onRetry(material.id)}
                        aria-label={`Tentar de novo ${name}`}
                        className={`${actionClass} border-blue-700 text-blue-800 hover:bg-blue-50`}
                      >
                        Tentar de novo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirming(material.id)}
                      aria-label={`Apagar ${name}`}
                      className={`${actionClass} border-stone-400 text-stone-800 hover:bg-stone-100`}
                    >
                      Apagar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
