import { auth, authReady } from './firebase';

// Hosting has no same-site rewrite for africa-south1; this endpoint enforces its own origin policy.
export const backendEndpoint = 'https://africa-south1-khora-lulu-2026.cloudfunctions.net/api';

export class BackendRequestError extends Error {
  constructor(message: string, public readonly recoveryAction?: 'sign-in', public readonly status?: number) {
    super(message);
    this.name = 'BackendRequestError';
  }
}

export async function request<T>(path: string, data: unknown = {}): Promise<T> {
  await authReady;
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(backendEndpoint + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({ error: 'The backend is unavailable. Please try again.' }));
  if (!response.ok) throw new BackendRequestError(result.error || 'The request could not be completed.', result.recoveryAction === 'sign-in' ? 'sign-in' : undefined, response.status);
  return result as T;
}
