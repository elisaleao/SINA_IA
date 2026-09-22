'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Pequeno timeout para dar tempo do novo conteúdo e h1 renderizarem no DOM
    const timer = setTimeout(() => {
      const h1 =
        document.querySelector<HTMLElement>('main h1') ||
        document.querySelector<HTMLElement>('h1');

      if (h1) {
        if (!h1.hasAttribute('tabindex')) {
          h1.setAttribute('tabindex', '-1');
        }
        h1.focus({ preventScroll: false });
        setAnnouncement(h1.textContent || document.title || 'Página carregada');
      } else {
        setAnnouncement(document.title || 'Página carregada');
      }
    }, 50);

    return () => clearTimeout(timer);
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

