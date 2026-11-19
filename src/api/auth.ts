import { ApiError, apiRequest } from './http';
import type { LoginRequest, RegisterRequest, UserProfile } from './types';

/** Returns null when there is no signed-in session. */
export async function fetchMe(signal?: AbortSignal): Promise<UserProfile | null> {
  try {
    return await apiRequest<UserProfile>('/api/me', { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function login(request: LoginRequest): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/auth/login', { method: 'POST', body: request });
}

export function register(request: RegisterRequest): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/auth/register', { method: 'POST', body: request });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', { method: 'POST' });
}
