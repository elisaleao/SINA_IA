import { API_BASE_URL, apiClient } from "./http";

export { API_BASE_URL };

export type {
  AccessibilityConfig,
  DocumentProcessResponse,
  GenerateRequest,
  GenerationResponse,
  GenerationType,
  TeacherConfig,
} from "./api-schema";
import type {
  DocumentProcessResponse,
  GenerateRequest,
  GenerationResponse,
} from "./api-schema";

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
