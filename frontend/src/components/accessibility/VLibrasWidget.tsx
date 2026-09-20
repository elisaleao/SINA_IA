'use client';

import React, { useEffect, useState } from 'react';
import { getStoredVLibrasActive } from '@/lib/auth';

const VLIBRAS_SCRIPT_ID = 'vlibras-plugin-script';


function cleanVLibrasDOM() {
  if (typeof document === 'undefined') return;

  // Remove containers criados pelo script do VLibras
  const elementsToRemove = document.querySelectorAll(
    '[vw], [vw-access-button], [vw-plugin-wrapper], .vlibras-element'
  );
  elementsToRemove.forEach((el) => {
    try {
      el.parentNode?.removeChild(el);
    } catch {
      // Ignora caso nó já tenha sido desalocado pelo navegador
    }
  });

  const script = document.getElementById(VLIBRAS_SCRIPT_ID);
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
}

export function VLibrasWidget() {
  const [isActive, setIsActive] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? getStoredVLibrasActive() : false;
  });

  // Escuta evento customizado de alternância do VLibras
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.active === 'boolean') {
        setIsActive(customEvent.detail.active);
      }
    };

    window.addEventListener('sina-vlibras-toggle', handleToggle);
    return () => {
      window.removeEventListener('sina-vlibras-toggle', handleToggle);
    };
  }, []);

  // Gerencia o ciclo de vida do script e dos nós DOM do VLibras
  useEffect(() => {
    if (!isActive) {
      // Limpeza completa do DOM quando inativo para evitar memory leaks
      cleanVLibrasDOM();
      return;
    }

    let isMounted = true;

    function initWidget() {
      if (!isMounted) return;
      try {
        if (window.VLibras && window.VLibras.Widget) {
          new window.VLibras.Widget('https://vlibras.gov.br/app');
        }
      } catch (err) {
        console.error('Erro ao inicializar o widget VLibras:', err);
      }
    }

    // Carrega o script sob demanda se ainda não estiver presente no documento
    let script = document.getElementById(VLIBRAS_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = VLIBRAS_SCRIPT_ID;
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.async = true;
      script.onload = () => {
        initWidget();
      };
      script.onerror = () => {
        console.error('Falha ao baixar o script oficial do VLibras.');
      };
      document.body.appendChild(script);
    } else {
      initWidget();
    }

    return () => {
      isMounted = false;
      cleanVLibrasDOM();
    };
  }, [isActive]);


  if (!isActive) {
    return null;
  }

  return (
    <div
      vw="true"
      className="enabled"
      aria-label="Widget assistivo VLibras em Língua de Sinais"
    >
      <div vw-access-button="true" className="active" />
      <div vw-plugin-wrapper="true">
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}

export default VLibrasWidget;
