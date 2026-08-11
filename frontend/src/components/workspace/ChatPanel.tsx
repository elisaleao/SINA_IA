"use client";

import { useId, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  author: string;
  body: string;
  tone: "assistant" | "user";
};

type ChatPanelProps = {
  title: string;
  messages: ChatMessage[];
  placeholder: string;
};

function PaperclipIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 1 1 5.65 5.66l-9.2 9.19a2 2 0 1 1-2.82-2.83l8.48-8.48" />
    </svg>
  );
}

export function ChatPanel({
  title,
  messages,
  placeholder,
}: ChatPanelProps) {
  const headingId = useId();
  const composerHintId = useId();
  const statusId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [screenReaderStatus, setScreenReaderStatus] = useState("");

  const quickPrompts = [
    "Me ajude a organizar meus estudos de hoje",
    "Quais sao as proximas tarefas importantes?",
    "Quero revisar o conteudo antes da proxima aula",
  ];

  function sendMessage(messageText: string) {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage) {
      return;
    }

    setLocalMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        author: "Voce",
        body: trimmedMessage,
        tone: "user",
      },
    ]);
    setDraftMessage("");
    setScreenReaderStatus("Mensagem enviada para o historico da conversa.");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draftMessage);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const totalFiles = event.target.files?.length ?? 0;

    if (totalFiles > 0) {
      setScreenReaderStatus(
        totalFiles === 1
          ? "1 arquivo selecionado para anexo."
          : `${totalFiles} arquivos selecionados para anexo.`,
      );
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={statusId}
      className="grid h-full min-h-0 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.18)]"
    >
      <h2 id={headingId} className="sr-only">
        {title}
      </h2>
      <p id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
        {screenReaderStatus}
      </p>
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-[#faf8f4]">
        <div
          className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5"
          role="log"
          aria-label={`Historico do ${title}`}
          aria-live="polite"
          aria-relevant="additions text"
        >
          <div className="mx-auto flex h-full max-w-4xl flex-col gap-4">
            {localMessages.length > 0 ? (
              localMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.tone === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <article
                    aria-label={`${message.author}: ${message.body}`}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.tone === "assistant"
                        ? "border border-stone-200 bg-white text-stone-800"
                        : "bg-[#1f5f5b] text-white"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        message.tone === "assistant"
                          ? "text-stone-500"
                          : "text-white/70"
                      }`}
                    >
                      {message.author}
                    </p>
                    <p className="mt-2 text-sm leading-7">{message.body}</p>
                  </article>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col justify-end pb-6">
                <div className="mx-auto w-full max-w-4xl">
                  <h3 className="sr-only">Sugestoes de inicio rapido</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        aria-label={`Enviar sugestao: ${prompt}`}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-sm leading-6 text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-3 sm:px-5">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-4xl items-end gap-3 rounded-[1.75rem] border border-stone-300 bg-white px-4 py-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              multiple
              tabIndex={-1}
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              onClick={openFilePicker}
              aria-label="Anexar documentos"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-stone-300 hover:text-stone-800"
            >
              <PaperclipIcon />
            </button>
            <label htmlFor={`${headingId}-message`} className="sr-only">
              {placeholder}
            </label>
            <textarea
              id={`${headingId}-message`}
              rows={1}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(draftMessage);
                }
              }}
              placeholder={placeholder}
              aria-describedby={composerHintId}
              className="max-h-36 min-h-[48px] w-full resize-none bg-transparent px-1 pt-2 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400"
            />
            <p id={composerHintId} className="sr-only">
              Pressione Enter para enviar e Shift mais Enter para quebrar linha.
            </p>
            <button
              type="submit"
              aria-label="Enviar mensagem"
              className="rounded-xl bg-[#1f5f5b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#184946]"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
