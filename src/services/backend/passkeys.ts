import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth, authReady } from './firebase';
import { request, BackendRequestError } from './request';
import { beginNativeAuthentication, resumeNativeAuthentication, restoreNativeSession } from '../../platform/nativeAuth';
import { isNativePlatform } from '../../platform/runtime';

export type AppSession = { uid: string; expiresAt: number; privateUntil: number; resumePrivate?: boolean };
export { BackendRequestError, request } from './request';

export async function authenticate(create: boolean): Promise<AppSession> {
  if (isNativePlatform()) {
    await authReady;
    const result = await beginNativeAuthentication(create ? 'register' : 'login');
    if (!result?.session) throw new DOMException('Authentication was cancelled.', 'NotAllowedError');
    return result.session;
  }
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
  if (isNativePlatform()) {
    const result = await beginNativeAuthentication('stepup');
    if (!result?.privateUntil) throw new DOMException('Private verification was cancelled.', 'NotAllowedError');
    return result.privateUntil;
  }
  const {options,challengeId} = await request<any>('/auth/stepup/options');
  const response = await startAuthentication({optionsJSON: options});
  const result = await request<{privateUntil:number}>('/auth/stepup/verify',{challengeId,response});
  return result.privateUntil;
}
export async function restorePendingNativeAuth() { return resumeNativeAuthentication(); }
export async function restoreNativeAppSession() { return restoreNativeSession(); }
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
