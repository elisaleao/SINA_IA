'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/http';
import {
  MaterialSummary,
  deleteMaterial,
  listMaterials,
  reprocessMaterial,
  uploadMaterials,
} from '@/lib/materials';

const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

export const STATUS_LABEL: Record<MaterialSummary['status'], string> = {
  enviado: 'Enviado',
  processando: 'Processando',
  pronto: 'Pronto',
  erro: 'Erro',
};

function inProgress(material: MaterialSummary): boolean {
  return material.status === 'enviado' || material.status === 'processando';
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function useMaterials() {
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const current = useRef<MaterialSummary[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delay = useRef(MIN_DELAY_MS);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const pollRef = useRef<() => Promise<void>>(async () => undefined);

  const apply = useCallback((next: MaterialSummary[]) => {
    current.current = next;
    setMaterials(next);
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!mounted.current || inFlight.current) return;
    if (!current.current.some(inProgress)) return;
    timer.current = setTimeout(() => void pollRef.current(), delay.current);
  }, []);

  const follow = useCallback(() => {
    delay.current = MIN_DELAY_MS;
    schedule();
  }, [schedule]);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await listMaterials();
      if (!mounted.current) return;
      const changed = next.filter((material) => {
        const previous = current.current.find((old) => old.id === material.id);
        return previous !== undefined && previous.status !== material.status;
      });
      if (changed.length > 0) {
        setAnnouncement(
          changed
            .map((m) => `Material ${m.nome_original}: ${STATUS_LABEL[m.status]}`)
            .join('. ')
        );
        delay.current = MIN_DELAY_MS;
      } else {
        delay.current = Math.min(delay.current * 2, MAX_DELAY_MS);
      }
      apply(next);
    } catch {
      delay.current = Math.min(delay.current * 2, MAX_DELAY_MS);
    } finally {
      inFlight.current = false;
    }
    schedule();
  }, [apply, schedule]);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    mounted.current = true;
    delay.current = MIN_DELAY_MS / 2;
    void poll();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  const drop = useCallback(
    (id: string) => apply(current.current.filter((m) => m.id !== id)),
    [apply]
  );

  const upload = useCallback(
    async (files: File[], nivel?: number) => {
      const created = await uploadMaterials(files, nivel);
      const ids = new Set(created.map((m) => m.id));
      apply([...created, ...current.current.filter((m) => !ids.has(m.id))]);
      follow();
    },
    [apply, follow]
  );

  const retry = useCallback(
    async (id: string) => {
      try {
        const updated = await reprocessMaterial(id);
        apply(current.current.map((m) => (m.id === id ? updated : m)));
        follow();
      } catch (error) {
        if (isNotFound(error)) drop(id);
        else throw error;
      }
    },
    [apply, drop, follow]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteMaterial(id);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      drop(id);
    },
    [drop]
  );

  return { materials, announcement, upload, retry, remove, refresh: poll };
}
