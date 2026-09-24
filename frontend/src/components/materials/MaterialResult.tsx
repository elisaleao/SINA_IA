'use client';

import React, { useEffect, useState } from 'react';

import { Tabs } from '@/components/ui';
import { MaterialDetail, fetchMaterialAudio, getMaterial } from '@/lib/materials';

type Chart = { source_label: string; title?: string | null; description: string };
type Audit = { itens?: { problema: string }[] };

const NO_AUDIO = 'Este material ainda não tem áudio.';

function AudioPanel({ materialId, name }: { materialId: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    fetchMaterialAudio(materialId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [materialId]);

  if (failed) return <p>{NO_AUDIO}</p>;
  if (!url) return <p role="status">Carregando o áudio…</p>;
  return (
    <div className="flex flex-col gap-3">
      <p>Ouça o texto acessível deste material.</p>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- o áudio lê o texto acessível, que está na aba ao lado */}
      <audio controls src={url} aria-label={`Áudio do material ${name}`} className="w-full" />
    </div>
  );
}

function textBlock(text: string | null | undefined, empty: string) {
  return (
    <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-200 p-4 leading-7 text-stone-900">
      {text || empty}
    </div>
  );
}

export function MaterialResult({ materialId }: { materialId: string }) {
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('acessivel');

  useEffect(() => {
    let active = true;
    getMaterial(materialId)
      .then((detail) => active && setMaterial(detail))
      .catch((e: unknown) =>
        active && setError(e instanceof Error ? e.message : 'Não foi possível abrir o material.')
      );
    return () => {
      active = false;
    };
  }, [materialId]);

  if (error) return <p role="alert" className="font-bold text-red-900">{error}</p>;
  if (!material) return <p role="status">Abrindo o material…</p>;

  const charts = (material.resultado?.charts ?? []) as Chart[];
  const auditItems = ((material.resultado?.audit ?? {}) as Audit).itens ?? [];

  const tabs = [
    {
      id: 'acessivel',
      label: 'Texto acessível',
      content: textBlock(material.texto_acessivel, 'Sem texto acessível.'),
    },
    {
      id: 'original',
      label: 'Texto original',
      content: textBlock(material.texto_original, 'Sem texto original.'),
    },
    {
      id: 'graficos',
      label: 'Gráficos',
      content: charts.length ? (
        <div className="flex flex-col gap-3">
          {charts.map((chart, index) => (
            <article key={`${chart.source_label}-${index}`} className="rounded-lg border border-stone-200 p-4">
              <h4 className="font-semibold">{chart.title || chart.source_label}</h4>
              {chart.title && <p className="mt-1 text-sm text-stone-600">{chart.source_label}</p>}
              <p className="mt-3 whitespace-pre-wrap leading-7">{chart.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Nenhum gráfico relevante foi identificado.</p>
      ),
    },
    {
      id: 'auditoria',
      label: 'Auditoria',
      content: auditItems.length ? (
        <ul className="list-disc space-y-2 pl-5">
          {auditItems.map((item, index) => (
            <li key={index}>{item.problema}</li>
          ))}
        </ul>
      ) : (
        <p>A auditoria não encontrou perda relevante de informação.</p>
      ),
    },
    {
      id: 'audio',
      label: 'Áudio',
      content: material.audio_url ? <AudioPanel materialId={material.id} name={material.nome_original} /> : <p>{NO_AUDIO}</p>,
    },
  ];

  return (
    <section aria-labelledby="resultado-title" className="flex flex-col gap-4">
      <h2 id="resultado-title" className="text-xl font-bold text-stone-900">
        {material.nome_original}
      </h2>
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} ariaLabel="Resultado do material" />
    </section>
  );
}
