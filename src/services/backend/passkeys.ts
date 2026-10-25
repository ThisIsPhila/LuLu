import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth, authReady } from './firebase';

export type AppSession = { uid: string; expiresAt: number; privateUntil: number };
// Hosting currently rejects a same-site rewrite to africa-south1; use the CORS-restricted function URL.
const endpoint = 'https://africa-south1-khora-lulu-2026.cloudfunctions.net/api';
export class BackendRequestError extends Error {
  constructor(message: string, public readonly recoveryAction?: 'sign-in') {
    super(message);
    this.name = 'BackendRequestError';
  }
}
export async function request<T>(path: string, data: unknown = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(endpoint + path, {
    method: 'POST', headers: {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
    body: JSON.stringify(data), cache: 'no-store',
  });
  const result = await response.json().catch(() => ({error: 'The backend is unavailable. Please try again.'}));
  if (!response.ok) throw new BackendRequestError(result.error || 'The request could not be completed.', result.recoveryAction === 'sign-in' ? 'sign-in' : undefined);
  return result as T;
}
export async function authenticate(create: boolean): Promise<AppSession> {
  if (!browserSupportsWebAuthn()) throw new Error('Passkeys are unavailable in this browser. Open LuLu in a browser that supports passkeys.');
  await authReady;
  const operation = create ? 'register' : 'login';
  const {options,challengeId} = await request<any>(`/auth/${operation}/options`);
  const response = create ? await startRegistration({optionsJSON: options}) : await startAuthentication({optionsJSON: options});
  const {customToken} = await request<{customToken:string}>(`/auth/${operation}/verify`, {challengeId,response});
  await signInWithCustomToken(auth, customToken);
  return request<AppSession>('/session');
}
export async function unlockPrivate(): Promise<number> {
  const {options,challengeId} = await request<any>('/auth/stepup/options');
  const response = await startAuthentication({optionsJSON: options});
  const result = await request<{privateUntil:number}>('/auth/stepup/verify',{challengeId,response});
  return result.privateUntil;
}
export async function logout() {
  try { await request('/auth/logout'); }
  finally { await signOut(auth); }
}
export async function lockPrivate() { await request('/auth/lock'); }
export function authError(error: unknown) {
  if (error instanceof Error && error.name === 'NotAllowedError') return 'Passkey verification was cancelled or timed out. You can try again.';
  if (error instanceof Error && /invalid domain/i.test(error.message)) return 'This local address cannot open a passkey prompt. Use localhost for local testing.';
  return error instanceof Error ? error.message : 'Please try again.';
}
