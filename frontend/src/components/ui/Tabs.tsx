'use client';

import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Navegação por abas',
}: TabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
        targetIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        targetIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const targetTab = tabs[targetIndex];
    if (targetTab) {
      onChange(targetTab.id);
      // Foca no botão da aba selecionada
      if (tabListRef.current) {
        const buttons = tabListRef.current.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]'
        );
        buttons[targetIndex]?.focus();
      }
    }
  };

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="w-full flex flex-col">
      {/* Lista de Abas */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center gap-1 border-b border-stone-200 overflow-x-auto pb-1"
      >
        {tabs.map((tab, idx) => {
          const isSelected = tab.id === (currentTab?.id ?? '');

          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`min-h-[44px] px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all border-b-2 -mb-[2px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                isSelected
                  ? 'border-blue-600 text-blue-900 bg-blue-50/70 shadow-sm'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Painel da Aba Ativa */}
      {currentTab && (
        <div
          role="tabpanel"
          id={`tabpanel-${currentTab.id}`}
          aria-labelledby={`tab-${currentTab.id}`}
          tabIndex={0}
          className="pt-6 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-lg"
        >
          {currentTab.content}
        </div>
      )}
    </div>
  );
}

export default Tabs;

