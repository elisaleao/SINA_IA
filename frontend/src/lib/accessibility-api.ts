import { API_BASE_URL, apiClient } from "./http";

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

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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

  const response = await apiClient.stream("/api/accessibility/process-stream", {
    method: "POST",
    body,
    signal,
  });

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
