import { API_BASE_URL, apiClient } from "./http";

export { API_BASE_URL };

export type GenerationType = "summary" | "quiz" | "study_guide";

export type TeacherConfig = {
  pedagogical_level?: "basico" | "intermediario" | "avancado" | string;
  math_detail_level?: "direto" | "passo_a_passo" | "explicativo" | string;
  tone?: "formal" | "socrático" | "encorajador" | string;
};

export type AccessibilityConfig = {
  profile?: "visual" | "dyslexia" | "adhd" | "cognitive" | "universal";
  plain_language?: boolean;
  include_glossary?: boolean;
  highlight_key_points?: boolean;
  vlibras_active?: boolean;
};

export type GenerateRequest = {
  document_id: string;
  generation_type: GenerationType;
  teacher_config?: TeacherConfig;
  accessibility_config?: AccessibilityConfig;
  generate_audio?: boolean;
  voice?: string;
};

export type DocumentProcessResponse = {
  document_id: string;
  filename: string;
  extracted_markdown: string;
  accessible_text: string;
  equations_found: string[];
};

export type GenerationResponse = {
  document_id: string;
  generation_type: string;
  text_content: string;
  spoken_content: string;
  audio_url: string | null;
  accessibility_profile?: string | null;
  chave_pessoal_falhou?: boolean;
};

/**
 * Uploads a document to the backend for OCR and processing.
 */
export async function uploadDocument(file: File): Promise<DocumentProcessResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient.request<DocumentProcessResponse>("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

/**
 * Requests generation of summaries, quizzes, or study guides from a processed document.
 */
export async function generateStudyContent(request: GenerateRequest): Promise<GenerationResponse> {
  return apiClient.request<GenerationResponse>("/api/content/generate", {
    method: "POST",
    body: {
      document_id: request.document_id,
      generation_type: request.generation_type,
      teacher_config: request.teacher_config || {
        pedagogical_level: "intermediario",
        math_detail_level: "passo_a_passo",
        tone: "encorajador",
      },
      accessibility_config: request.accessibility_config,
      generate_audio: request.generate_audio ?? true,
      voice: request.voice || "pt-BR-AntonioNeural",
    },
  });
}

/**
 * Helper to build the full audio URL path.
 */
export function getAudioUrl(audioPath: string | null): string | null {
  if (!audioPath) return null;
  if (audioPath.startsWith("http")) return audioPath;
  return `${API_BASE_URL}${audioPath}`;
}
