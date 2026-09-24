'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const RETRY_MS = 50;
const MAX_ATTEMPTS = 40;

export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let attempts = 0;
    const findHeading = () =>
      document.querySelector<HTMLElement>('main h1') ||
      document.querySelector<HTMLElement>('h1');

    // O h1 de rotas protegidas só aparece depois que a sessão carrega
    const timer = setInterval(() => {
      attempts += 1;
      const h1 = findHeading();
      if (!h1 && attempts < MAX_ATTEMPTS) return;
      clearInterval(timer);

      if (h1) {
        if (!h1.hasAttribute('tabindex')) {
          h1.setAttribute('tabindex', '-1');
        }
        h1.focus({ preventScroll: false });
        setAnnouncement(h1.textContent || document.title || 'Página carregada');
      } else {
        setAnnouncement(document.title || 'Página carregada');
      }
    }, RETRY_MS);

    return () => clearInterval(timer);
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      id="route-announcer"
    >
      {announcement}
    </div>
  );
}

export default RouteAnnouncer;

