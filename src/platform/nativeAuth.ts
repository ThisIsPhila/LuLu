import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth, authReady } from '../services/backend/firebase';
import { request, type BackendRequestError } from '../services/backend/request';
import type { AppSession } from '../services/backend/passkeys';
import { closeExternalBrowser, onExternalBrowserFinished, openExternalUrl } from './externalBrowser';
import { listenForAppLinks, readLaunchUrl } from './deepLinks';
import { isNativePlatform } from './runtime';

const pendingKey = 'lulu.native.auth.pending.v1';
const callbackScheme = 'lulu:';
const callbackHost = 'auth-callback';
const bridgeUrl = 'https://khora-lulu-2026.web.app/native-auth-bridge';
const authTimeoutMs = 180_000;

type NativeOperation = 'register' | 'login' | 'stepup' | 'google-login';
type PendingNativeAuth = {
  requestId: string;
  state: string;
  proof: string;
  exchangeId: string;
  operation: NativeOperation;
  expiresAt: number;
  callbackUrl?: string;
};
export type NativeAuthResume = { operation: NativeOperation; session?: AppSession; privateUntil?: number };

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function savePending(pending: PendingNativeAuth): Promise<void> {
  await SecureStorage.setItem(pendingKey, JSON.stringify(pending));
}

async function readPending(): Promise<PendingNativeAuth | null> {
  const value = await SecureStorage.getItem(pendingKey);
  if (!value) return null;
  try {
    const pending = JSON.parse(value) as Partial<PendingNativeAuth>;
    if (typeof pending.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(pending.requestId) ||
        !isOpaqueValue(pending.state) || !isOpaqueValue(pending.proof) ||
        typeof pending.exchangeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(pending.exchangeId) ||
        !['register','login','stepup','google-login'].includes(String(pending.operation)) || !Number.isSafeInteger(pending.expiresAt)) return null;
    return pending as PendingNativeAuth;
  } catch { return null; }
}

function isOpaqueValue(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

function callbackMatches(urlText: string, pending: PendingNativeAuth): URL | null {
  let url: URL;
  try { url = new URL(urlText); } catch { return null; }
  if (url.protocol !== callbackScheme || url.hostname !== callbackHost || url.pathname !== '' ||
      url.searchParams.get('requestId') !== pending.requestId || url.searchParams.get('state') !== pending.state ||
      url.searchParams.get('operation') !== pending.operation || !['success','cancelled','error'].includes(url.searchParams.get('status') ?? '')) return null;
  return url;
}

async function cancelPending(pending: PendingNativeAuth): Promise<void> {
  await request('/native/exchange/cancel', {
    exchangeId: pending.exchangeId, requestId: pending.requestId, state: pending.state,
    proof: pending.proof, operation: pending.operation,
  }).catch(() => {});
  await SecureStorage.removeItem(pendingKey).catch(() => {});
}

async function redeemPending(pending: PendingNativeAuth, callback: URL): Promise<NativeAuthResume | null> {
  if (callback.searchParams.get('status') === 'cancelled') {
    await cancelPending(pending);
    return null;
  }
  if (callback.searchParams.get('status') !== 'success') {
    await cancelPending(pending);
    throw new Error('The LuLu authentication relay could not complete sign-in.');
  }
  await savePending({ ...pending, callbackUrl: callback.toString() });
  const result = await request<{ customToken?: string; privateUntil?: number }>('/native/exchange/redeem', {
    exchangeId: pending.exchangeId, requestId: pending.requestId, state: pending.state,
    proof: pending.proof, operation: pending.operation,
  });
  if (pending.operation === 'stepup') {
    if (!Number.isSafeInteger(result.privateUntil) || !result.privateUntil || result.privateUntil <= Date.now()) throw new Error('Private verification has expired. Please try again.');
    const session = await request<AppSession>('/session');
    await SecureStorage.removeItem(pendingKey);
    return { operation: pending.operation, privateUntil: result.privateUntil, session: { ...session, resumePrivate: true } };
  }
  if (!result.customToken) throw new Error('The authentication handoff did not return a sign-in result.');
  await signInWithCustomToken(auth, result.customToken);
  const session = await request<AppSession>('/session');
  await SecureStorage.removeItem(pendingKey);
  return { operation: pending.operation, session };
}

export async function beginNativeAuthentication(operation: NativeOperation): Promise<NativeAuthResume | null> {
  if (!isNativePlatform()) throw new Error('Native passkey handoff is only available in the iOS and Android apps.');
  await authReady;
  const requestId = crypto.randomUUID();
  const state = randomToken();
  const proof = randomToken();
  const created = await request<{ exchangeId: string; expiresAt: number }>('/native/exchange/create', { requestId, state, proof, operation });
  if (typeof created.exchangeId !== 'string' || !Number.isSafeInteger(created.expiresAt) || created.expiresAt <= Date.now()) {
    throw new Error('The authentication handoff could not be started.');
  }
  const pending: PendingNativeAuth = { requestId, state, proof, exchangeId: created.exchangeId, operation, expiresAt: created.expiresAt };
  await savePending(pending);

  let stopListening = () => {};
  let stopBrowserFinished = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const callbackPromise = new Promise<URL>((resolve, reject) => {
      let callbackReceived = false;
      stopListening = listenForAppLinks(url => {
        const callback = callbackMatches(url, pending);
        if (callback) { callbackReceived = true; resolve(callback); }
      });
      stopBrowserFinished = onExternalBrowserFinished(() => {
        // Some OSes close the system browser just before delivering appUrlOpen.
        // Give the deep-link event a brief lead, then treat a real close as cancel.
        setTimeout(() => { if (!callbackReceived) reject(new DOMException('Authentication was cancelled.', 'NotAllowedError')); }, 1200);
      });
      timer = setTimeout(() => reject(new DOMException('Authentication timed out.', 'NotAllowedError')), authTimeoutMs);
    });
    const url = new URL(bridgeUrl);
    url.searchParams.set('exchangeId', pending.exchangeId);
    url.searchParams.set('state', pending.state);
    url.searchParams.set('requestId', pending.requestId);
    url.searchParams.set('operation', pending.operation);
    await openExternalUrl(url.toString());
    const callback = await callbackPromise;
    await closeExternalBrowser();
    return await redeemPending(pending, callback);
  } catch (error) {
    await closeExternalBrowser();
    await cancelPending(pending);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    stopBrowserFinished();
    stopListening();
  }
}

/** Redeem a callback captured by the OS when the app process was not resident. */
export async function resumeNativeAuthentication(): Promise<NativeAuthResume | null> {
  if (!isNativePlatform()) return null;
  const pending = await readPending();
  if (!pending) return null;
  if (pending.expiresAt <= Date.now()) { await cancelPending(pending); return null; }
  const callback = pending.callbackUrl ? callbackMatches(pending.callbackUrl, pending) : null;
  const launch = callback ?? callbackMatches((await readLaunchUrl()) ?? '', pending);
  if (!launch) return null;
  return redeemPending(pending, launch);
}

/** Restore the backend session after Capacitor recreates its WebView. */
export async function restoreNativeSession(): Promise<AppSession | null> {
  if (!isNativePlatform()) return null;
  await authReady;
  if (!auth.currentUser) return null;
  try {
    const session=await request<AppSession>('/session');
    const locked=await request<{success?:boolean}>('/auth/lock');
    if(locked.success!==true)throw new Error('LuLu could not confirm that the private session was locked.');
    return {...session,privateUntil:0};
  }
  catch (error) {
    if (error instanceof Error && error.name === 'BackendRequestError' && [401, 403].includes((error as BackendRequestError).status ?? 0)) {
      await signOut(auth);
      return null;
    }
    throw error;
  }
}
