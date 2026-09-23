import type { components } from './api-types';
import { apiClient } from './http';

export type LlmKeyStatus = components['schemas']['LLMKeyStatus'];

export async function saveLlmKey(geminiApiKey: string): Promise<LlmKeyStatus> {
  return apiClient.request<LlmKeyStatus>('/users/me/llm-key', {
    method: 'PUT',
    body: { gemini_api_key: geminiApiKey },
  });
}

export async function removeLlmKey(): Promise<void> {
  await apiClient.request<void>('/users/me/llm-key', { method: 'DELETE' });
}
