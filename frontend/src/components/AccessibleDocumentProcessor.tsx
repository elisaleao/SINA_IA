"use client";

import {
  FormEvent,
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";

export type StageName =
  | "upload"
  | "extract"
  | "detect"
  | "convert"
  | "audit"
  | "correct"
  | "tts";

export type StageStatus = "idle" | "active" | "done" | "error";

export interface AuditItem {
  problema: string;
}

export interface AuditReport {
  status: "ok" | "problemas_encontrados";
  itens: AuditItem[];
}

export interface ChartDescription {
  source_label: string;
  title?: string | null;
  description: string;
  confidence: number;
}

export interface ProcessResult {
  filename: string;
  level: 1 | 2 | 3 | 4;
  raw_text: string;
  accessible_text: string;
  math_detection: {
    is_math: boolean;
    score: number;
    density: number;
  };
  charts: ChartDescription[];
  audit: AuditReport;
  text_download_url: string;
  audio_url: string;
}

export type PipelineEvent =
  | {
      type: "stage";
      stage: StageName;
      status: Exclude<StageStatus, "idle">;
      message?: string;
    }
  | { type: "result"; result: ProcessResult }
  | { type: "error"; message: string };

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function processAccessibleDocument(
  file: File,
  level: 1 | 2 | 3 | 4,
  onEvent: (event: PipelineEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const body = new FormData();
  body.append("file", file);
  body.append("level", String(level));

  const response = await fetch(apiUrl("/api/accessibility/process-stream"), {
    method: "POST",
    body,
    signal,
  });

  if (!response.ok) {
    let message = `Falha no processamento (${response.status}).`;
    try {
      const payload = await response.json();
      if (payload?.detail) message = String(payload.detail);
    } catch {
      // mantém a mensagem padrão
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("O navegador não recebeu o fluxo de processamento.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as PipelineEvent);
    }

    if (done) break;
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as PipelineEvent);
  }
}


const STAGE_LABELS: Record<StageName, string> = {
  upload: "Upload",
  extract: "Extração",
  detect: "Classificação e gráficos",
  convert: "Conversão acessível",
  audit: "Auditoria",
  correct: "Correção",
  tts: "Áudio",
};

const LEVELS = [
  { value: 1, title: "Nível 1", description: "Fidelidade máxima" },
  { value: 2, title: "Nível 2", description: "Linguagem simplificada" },
  { value: 3, title: "Nível 3", description: "Linguagem muito simples" },
  { value: 4, title: "Nível 4", description: "Resumo acessível" },
] as const;

type TabId = "raw" | "charts" | "accessible" | "audit" | "audio";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "raw", label: "Texto extraído" },
  { id: "charts", label: "Gráficos" },
  { id: "accessible", label: "Texto acessível" },
  { id: "audit", label: "Auditoria" },
  { id: "audio", label: "Áudio" },
];


function initialStages(): Record<StageName, StageStatus> {
  return {
    upload: "idle",
    extract: "idle",
    detect: "idle",
    convert: "idle",
    audit: "idle",
    correct: "idle",
    tts: "idle",
  };
}

function statusText(status: StageStatus): string {
  if (status === "active") return "em andamento";
  if (status === "done") return "concluído";
  if (status === "error") return "erro";
  return "aguardando";
}

function ChartCard({ chart }: { chart: ChartDescription }) {
  return (
    <article className="rounded-lg border p-4">
      <h4 className="font-semibold">
        {chart.title || chart.source_label}
      </h4>
      {chart.title && (
        <p className="mt-1 text-sm text-zinc-500">{chart.source_label}</p>
      )}
      <p className="mt-3 whitespace-pre-wrap leading-7">{chart.description}</p>
    </article>
  );
}


export default function AccessibleDocumentProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(2);
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<Record<StageName, StageStatus>>(
    initialStages,
  );
  const [announcement, setAnnouncement] = useState(
    "Aguardando um documento.",
  );
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [tab, setTab] = useState<TabId>("raw");

  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    raw: null,
    charts: null,
    accessible: null,
    audit: null,
    audio: null,
  });

  const stageEntries = useMemo(
    () => Object.entries(STAGE_LABELS) as Array<[StageName, string]>,
    [],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || running) return;

    setRunning(true);
    setError("");
    setResult(null);
    setTab("raw");
    setStages(initialStages());
    setAnnouncement(`Processando ${file.name}.`);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await processAccessibleDocument(
        file,
        level,
        (pipelineEvent: PipelineEvent) => {
          if (pipelineEvent.type === "stage") {
            setStages((current) => ({
              ...current,
              [pipelineEvent.stage]: pipelineEvent.status,
            }));
            setAnnouncement(
              pipelineEvent.message ??
                `${STAGE_LABELS[pipelineEvent.stage]}: ${statusText(
                  pipelineEvent.status,
                )}.`,
            );
            return;
          }

          if (pipelineEvent.type === "error") {
            throw new Error(pipelineEvent.message);
          }

          setResult(pipelineEvent.result);
          setAnnouncement(
            "Processamento concluído. O texto acessível e o áudio estão disponíveis.",
          );
          window.requestAnimationFrame(() => resultsRef.current?.focus());
        },
        controller.signal,
      );
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setAnnouncement("Processamento cancelado.");
      } else {
        const message =
          caught instanceof Error ? caught.message : "Erro inesperado.";
        setError(message);
        setAnnouncement(`Erro: ${message}`);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = TABS.findIndex((item) => item.id === tab);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    const next = TABS[nextIndex].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      id="processador-acessivel"
      className="mx-auto w-full max-w-5xl space-y-6"
      aria-labelledby="processor-title"
    >
      <a
        href="#form-documento"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-black"
      >
        Pular para o envio de documento
      </a>

      <header>
        <h2 id="processor-title" className="text-2xl font-bold">
          Converter material para leitura acessível
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Envie PDF, DOCX, TXT ou imagem. O sistema extrai o conteúdo, adapta
          matemática e gráficos, audita o resultado e gera áudio.
        </p>
      </header>

      <form
        id="form-documento"
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border p-5"
        aria-busy={running}
      >
        <div>
          <label htmlFor="document-file" className="block font-semibold">
            Documento
          </label>
          <p id="document-help" className="mt-1 text-sm text-zinc-500">
            Formatos: PDF, DOCX, TXT, PNG, JPG/JPEG e WEBP. Limite padrão: 20 MB.
          </p>
          <input
            id="document-file"
            type="file"
            className="mt-3 block w-full"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
            aria-describedby="document-help"
            disabled={running}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setResult(null);
              setError("");
              setAnnouncement(
                next ? `Arquivo selecionado: ${next.name}.` : "Nenhum arquivo.",
              );
            }}
          />
        </div>

        <fieldset>
          <legend className="font-semibold">Nível de adaptação</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((item) => (
              <label
                key={item.value}
                className="cursor-pointer rounded-lg border p-3 has-[:checked]:ring-2"
              >
                <input
                  className="mr-2"
                  type="radio"
                  name="adaptation-level"
                  value={item.value}
                  checked={level === item.value}
                  disabled={running}
                  onChange={() => setLevel(item.value)}
                />
                <span className="font-medium">{item.title}</span>
                <span className="mt-1 block text-sm text-zinc-500">
                  {item.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!file || running}
            className="rounded-lg bg-black px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {running ? "Processando…" : "Processar documento"}
          </button>

          {running && (
            <button
              type="button"
              className="rounded-lg border px-4 py-2"
              onClick={() => abortRef.current?.abort()}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="rounded-xl border p-5" aria-labelledby="pipeline-title">
        <h3 id="pipeline-title" className="font-semibold">
          Status do processamento
        </h3>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stageEntries.map(([stage, label]) => (
            <li key={stage} className="rounded-lg border p-3">
              <span className="block font-medium">{label}</span>
              <span className="text-sm text-zinc-500">
                {statusText(stages[stage])}
              </span>
            </li>
          ))}
        </ol>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border p-3 font-medium">
            {error}
          </p>
        )}
      </section>

      {result && (
        <div
          ref={resultsRef}
          tabIndex={-1}
          className="rounded-xl border p-5 outline-none focus-visible:ring-2"
          aria-labelledby="results-title"
        >
          <h3 id="results-title" className="text-xl font-bold">
            Resultado
          </h3>

          <p className="mt-2 text-sm text-zinc-500">
            {result.math_detection.is_math
              ? "Conteúdo matemático detectado e adaptado."
              : "Nenhum conteúdo matemático relevante foi detectado pela heurística."}
          </p>

          <div
            role="tablist"
            aria-label="Resultados do processamento"
            className="mt-5 flex flex-wrap gap-2 border-b"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                ref={(element) => {
                  tabRefs.current[item.id] = element;
                }}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                className="rounded-t px-3 py-2 aria-selected:font-bold aria-selected:underline"
                onClick={() => setTab(item.id)}
                onKeyDown={handleTabKeyDown}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            id="panel-raw"
            role="tabpanel"
            aria-labelledby="tab-raw"
            hidden={tab !== "raw"}
            className="mt-4"
          >
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border p-4 font-sans leading-7">
              {result.raw_text}
            </pre>
          </div>

          <div
            id="panel-charts"
            role="tabpanel"
            aria-labelledby="tab-charts"
            hidden={tab !== "charts"}
            className="mt-4 space-y-3"
          >
            {result.charts.length ? (
              result.charts.map((chart: ChartDescription, index: number) => (
                <ChartCard key={`${chart.source_label}-${index}`} chart={chart} />
              ))
            ) : (
              <p>Nenhum gráfico relevante foi identificado.</p>
            )}
          </div>

          <div
            id="panel-accessible"
            role="tabpanel"
            aria-labelledby="tab-accessible"
            hidden={tab !== "accessible"}
            className="mt-4"
          >
            <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border p-4 leading-7">
              {result.accessible_text}
            </div>
            <a
              className="mt-4 inline-block rounded-lg border px-4 py-2 font-semibold"
              href={apiUrl(result.text_download_url)}
            >
              Baixar texto acessível (.txt)
            </a>
          </div>

          <div
            id="panel-audit"
            role="tabpanel"
            aria-labelledby="tab-audit"
            hidden={tab !== "audit"}
            className="mt-4"
          >
            {result.audit.itens.length ? (
              <ul className="list-disc space-y-2 pl-5">
                {result.audit.itens.map((item: AuditItem, index: number) => (
                  <li key={index}>{item.problema}</li>
                ))}
              </ul>
            ) : (
              <p>
                A auditoria não encontrou perda relevante de informação.
              </p>
            )}
          </div>

          <div
            id="panel-audio"
            role="tabpanel"
            aria-labelledby="tab-audio"
            hidden={tab !== "audio"}
            className="mt-4"
          >
            <label htmlFor="accessible-audio" className="block font-semibold">
              Áudio do documento acessível
            </label>
            <audio
              id="accessible-audio"
              className="mt-3 w-full"
              controls
              preload="metadata"
              src={apiUrl(result.audio_url)}
            >
              Seu navegador não oferece suporte ao elemento de áudio.
            </audio>
            <a
              className="mt-4 inline-block rounded-lg border px-4 py-2 font-semibold"
              href={apiUrl(result.audio_url)}
            >
              Baixar áudio (.mp3)
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
