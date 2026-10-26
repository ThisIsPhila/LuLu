import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCustomToken, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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
async function finishProviderSignIn(): Promise<AppSession> {
  const {customToken} = await request<{customToken:string}>('/auth/provider/session');
  if (!customToken) throw new Error('LuLu could not establish your account session. Please try again.');
  await signInWithCustomToken(auth, customToken);
  return request<AppSession>('/session');
}
export async function authenticateWithEmail(email: string, password: string, create: boolean): Promise<AppSession> {
  await authReady;
  const normalizedEmail = email.trim();
  if (create) await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  else await signInWithEmailAndPassword(auth, normalizedEmail, password);
  return finishProviderSignIn();
}
export async function authenticateWithGoogle(): Promise<AppSession> {
  await authReady;
  if (isNativePlatform()) {
    const result = await beginNativeAuthentication('google-login');
    if (!result?.session) throw new DOMException('Authentication was cancelled.', 'NotAllowedError');
    return result.session;
  }
  await signInWithPopup(auth, new GoogleAuthProvider());
  return finishProviderSignIn();
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
  const code = error && typeof error === 'object' && 'code' in error ? String((error as {code?:unknown}).code) : '';
  if (code === 'auth/operation-not-allowed') return 'This sign-in method is not enabled for LuLu yet.';
  if (code === 'auth/email-already-in-use') return 'An account already uses that email. Sign in instead.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/weak-password') return 'Choose a password with at least six characters.';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'That email and password could not be verified.';
  if (code === 'auth/account-exists-with-different-credential') return 'This email already uses another sign-in method. Sign in with that method first.';
  if (error instanceof Error && /invalid domain/i.test(error.message)) return 'This local address cannot open a passkey prompt. Use localhost for local testing.';
  return error instanceof Error ? error.message : 'Please try again.';
}
