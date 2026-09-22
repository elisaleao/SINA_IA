'use client';

import dynamic from 'next/dynamic';

// `ssr: false` só é permitido em Client Components (Next 16). O widget lê
// localStorage e injeta o script do VLibras, então não deve ser pré-renderizado.
const VLibrasWidget = dynamic(
  () => import('@/components/accessibility/VLibrasWidget'),
  { ssr: false }
);

export function VLibrasWidgetLoader() {
  return <VLibrasWidget />;
}
