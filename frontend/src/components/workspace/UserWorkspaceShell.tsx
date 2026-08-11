"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/workspace/ChatPanel";
import {
  type SidebarSection,
} from "@/lib/workspace-content";

type UserWorkspaceShellProps = {
  roleLabel: string;
  roleDescription: string;
  chatTitle: string;
  sections: SidebarSection[];
  accentClassName: string;
};

export function UserWorkspaceShell({
  roleLabel,
  roleDescription,
  chatTitle,
  sections,
  accentClassName,
}: UserWorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const defaultMessages: Array<{
    id: string;
    author: string;
    body: string;
    tone: "assistant" | "user";
  }> = [];

  return (
    <main className="h-[calc(100vh-81px)] w-full overflow-hidden">
      <section
        className={`grid h-full w-full flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ${
          isSidebarOpen
            ? "lg:grid-cols-[320px_minmax(0,1fr)]"
            : "lg:grid-cols-[72px_minmax(0,1fr)]"
        }`}
      >
        <aside className="flex h-full flex-col overflow-hidden border-r border-stone-200 bg-white px-3 py-4 shadow-[18px_0_40px_-32px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-end pb-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-label={isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-300 text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              <span className="flex flex-col gap-[3px]" aria-hidden="true">
                <span className="block h-[2px] w-4 rounded-full bg-current" />
                <span className="block h-[2px] w-4 rounded-full bg-current" />
                <span className="block h-[2px] w-4 rounded-full bg-current" />
              </span>
            </button>
          </div>

          {isSidebarOpen ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className={`rounded-[1.5rem] px-4 py-4 text-white ${accentClassName}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                  {roleLabel}
                </p>
                <p className="mt-3 text-lg font-semibold">{chatTitle}</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{roleDescription}</p>
              </div>

              <div className="mt-5 grid gap-5">
                {sections.map((section) => (
                  <section key={section.title} className="grid gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {section.title}
                    </h2>
                    <div className="grid gap-3">
                      {section.items.map((item) => (
                        <article
                          key={item.title}
                          className="rounded-[1.25rem] border border-stone-200 bg-[#fffaf1] px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-stone-900">
                              {item.title}
                            </h3>
                            {item.badge ? (
                              <span className="rounded-full bg-stone-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            {item.description}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <section className="grid h-full overflow-hidden">
          <ChatPanel
            key={`${roleLabel}-${chatTitle}`}
            title={chatTitle}
            messages={defaultMessages}
            placeholder="Escreva sua mensagem"
          />
        </section>
      </section>
    </main>
  );
}
