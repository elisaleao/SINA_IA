import type { components } from './api-types';
import { apiClient } from './http';

export type ProfileUpdate = components['schemas']['ProfileUpdate'];

export async function updateProfile(payload: ProfileUpdate): Promise<void> {
  await apiClient.request<unknown>('/users/me', {
    method: 'PATCH',
    body: payload,
  });
}
