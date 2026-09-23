import React from 'react';
import Link from 'next/link';

export function FallbackNotice() {
  return (
    <div
      role="status"
      className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
    >
      <strong>⚠ Aviso:</strong> sua chave do Gemini falhou nesta chamada, então usamos a IA
      gratuita para concluir.{' '}
      <Link
        href="/configuracoes/chave-ia"
        className="font-semibold underline focus:outline-none focus:ring-2 focus:ring-amber-600 rounded"
      >
        Conferir a chave
      </Link>
    </div>
  );
}
