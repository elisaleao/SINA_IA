export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type GenerationType = "summary" | "quiz" | "study_guide";

export type TeacherConfig = {
  pedagogical_level?: "basico" | "intermediario" | "avancado" | string;
  math_detail_level?: "direto" | "passo_a_passo" | "explicativo" | string;
  tone?: "formal" | "socrático" | "encorajador" | string;
};

export type GenerateRequest = {
  document_id: string;
  generation_type: GenerationType;
  teacher_config?: TeacherConfig;
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
};

/**
 * Uploads a document to the backend for OCR and processing.
 */
export async function uploadDocument(file: File): Promise<DocumentProcessResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Requests generation of summaries, quizzes, or study guides from a processed document.
 */
export async function generateStudyContent(request: GenerateRequest): Promise<GenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/content/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: request.document_id,
      generation_type: request.generation_type,
      teacher_config: request.teacher_config || {
        pedagogical_level: "intermediario",
        math_detail_level: "passo_a_passo",
        tone: "encorajador",
      },
      generate_audio: request.generate_audio ?? true,
      voice: request.voice || "pt-BR-AntonioNeural",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Helper to build the full audio URL path.
 */
export function getAudioUrl(audioPath: string | null): string | null {
  if (!audioPath) return null;
  if (audioPath.startsWith("http")) return audioPath;
  return `${API_BASE_URL}${audioPath}`;
}
