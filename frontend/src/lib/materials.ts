import type { components } from './api-types';
import { ApiError, apiClient } from './http';

export type MaterialSummary = components['schemas']['MaterialSummary'];
export type MaterialDetail = components['schemas']['MaterialDetail'];
export type MaterialUploadResponse = components['schemas']['MaterialUploadResponse'];
export type MaterialFileError = { arquivo: string; erro: string };

export class MaterialUploadError extends Error {
  general?: string;
  files: MaterialFileError[];

  constructor(message: string, general: string | undefined, files: MaterialFileError[]) {
    super(message);
    this.name = 'MaterialUploadError';
    this.general = general;
    this.files = files;
  }
}

function toUploadError(error: ApiError): MaterialUploadError {
  const detail = error.detail as { arquivos?: MaterialFileError[] } | string | undefined;
  if (detail && typeof detail === 'object' && Array.isArray(detail.arquivos)) {
    return new MaterialUploadError(error.message, undefined, detail.arquivos);
  }
  return new MaterialUploadError(error.message, error.message, []);
}

export async function uploadMaterials(
  files: File[],
  nivel?: number
): Promise<MaterialSummary[]> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  if (nivel !== undefined) form.append('nivel', String(nivel));
  try {
    const response = await apiClient.request<MaterialUploadResponse>('/api/materiais', {
      method: 'POST',
      body: form,
    });
    return response.materiais;
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) throw toUploadError(error);
    throw error;
  }
}

export async function listMaterials(): Promise<MaterialSummary[]> {
  return apiClient.request<MaterialSummary[]>('/api/materiais');
}

export async function getMaterial(id: string): Promise<MaterialDetail> {
  return apiClient.request<MaterialDetail>(`/api/materiais/${id}`);
}

export async function reprocessMaterial(id: string): Promise<MaterialSummary> {
  return apiClient.request<MaterialSummary>(`/api/materiais/${id}/reprocessar`, {
    method: 'POST',
  });
}

export async function deleteMaterial(id: string): Promise<void> {
  await apiClient.request<void>(`/api/materiais/${id}`, { method: 'DELETE' });
}

export async function fetchMaterialAudio(id: string): Promise<Blob> {
  const response = await apiClient.stream(`/api/materiais/${id}/audio`);
  return response.blob();
}
