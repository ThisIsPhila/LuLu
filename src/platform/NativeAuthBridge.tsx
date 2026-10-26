import { useEffect, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { browserSessionPersistence, getRedirectResult, GoogleAuthProvider, setPersistence, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, authReady } from '../services/backend/firebase';
import { backendEndpoint } from '../services/backend/request';

type RelayStage = 'working' | 'choose' | 'returning' | 'error';
type NativeOperation = 'register' | 'login' | 'stepup' | 'google-login';
type RelayRequest = { exchangeId: string; state: string; requestId: string; operation: NativeOperation };
const relayStorageKey = 'lulu.native.google.pending.v1';

function opaque(value: string | null): value is string {
  return !!value && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

async function bridgeRequest<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${backendEndpoint}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The LuLu authentication service could not complete this request.');
  return result as T;
}

function returnToApp(params: { requestId: string; state: string; operation: string; status: string }) {
  const callback = new URL('lulu://auth-callback');
  for (const [key, value] of Object.entries(params)) callback.searchParams.set(key, value);
  window.location.assign(callback.toString());
}

function otherPasskeyAddress(request: RelayRequest): URL | null {
  if (request.operation !== 'login' && request.operation !== 'stepup') return null;
  const otherOrigin = window.location.origin === 'https://khora-lulu-2026.web.app'
    ? 'https://lulu.thisisphila.co.za'
    : window.location.origin === 'https://lulu.thisisphila.co.za' ? 'https://khora-lulu-2026.web.app' : null;
  if (!otherOrigin) return null;
  const url = new URL('/native-auth-bridge', otherOrigin);
  for (const [key, value] of Object.entries(request)) url.searchParams.set(key, value);
  return url;
}

function readRelayRequest(): RelayRequest | null {
  const params = new URLSearchParams(window.location.search);
  const exchangeId = params.get('exchangeId');
  const state = params.get('state');
  const requestId = params.get('requestId');
  const operation = params.get('operation');
  if (!exchangeId || !/^[0-9a-f-]{36}$/i.test(exchangeId) || !requestId || !/^[0-9a-f-]{36}$/i.test(requestId) ||
      !opaque(state) || !['register','login','stepup','google-login'].includes(operation ?? '')) return null;
  return { exchangeId, state, requestId, operation: operation as NativeOperation };
}

function readPendingGoogle(): RelayRequest | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(relayStorageKey) ?? 'null') as Partial<RelayRequest> | null;
    if (!value || value.operation !== 'google-login' || !value.exchangeId || !/^[0-9a-f-]{36}$/i.test(value.exchangeId) ||
        !value.requestId || !/^[0-9a-f-]{36}$/i.test(value.requestId) || !opaque(value.state ?? null)) return null;
    return value as RelayRequest;
  } catch { return null; }
}

function initialRelayRequest(): RelayRequest | null {
  const params = new URLSearchParams(window.location.search);
  if (params.has('exchangeId')) return readRelayRequest();
  return readPendingGoogle();
}

export function NativeAuthBridge() {
  const [request] = useState<RelayRequest | null>(initialRelayRequest);
  const [stage, setStage] = useState<RelayStage>('working');
  const [message, setMessage] = useState('Connecting securely to LuLu…');
  const [attempt, setAttempt] = useState(0);
  const [failedStatus, setFailedStatus] = useState<'error' | 'cancelled'>('error');
  const otherAddress = request ? otherPasskeyAddress(request) : null;

  useEffect(() => {
    const incoming = readRelayRequest();
    if (incoming) {
      window.history.replaceState(null, '', window.location.pathname);
      if (incoming.operation === 'google-login') sessionStorage.setItem(relayStorageKey, JSON.stringify(incoming));
    }
  }, []);

  useEffect(() => {
    if (!request) {
      setStage('error'); setMessage('This LuLu sign-in link is invalid or expired. Return to LuLu and try again.');
      return;
    }
    if (request.operation === 'google-login') {
      let active = true;
      void (async () => {
        try {
          await authReady;
          await setPersistence(auth, browserSessionPersistence);
          const result = await getRedirectResult(auth);
          if (!result) {
            if (active) { setStage('choose'); setMessage('Continue securely with your Google account.'); }
            return;
          }
          const idToken = await result.user.getIdToken(true);
          await bridgeRequest('/native/exchange/provider-complete', { exchangeId: request.exchangeId, state: request.state, idToken });
          await signOut(auth).catch(() => {});
          sessionStorage.removeItem(relayStorageKey);
          if (active) { setStage('returning'); setMessage('Signed in. Returning to LuLu…'); }
          returnToApp({ requestId: request.requestId, state: request.state, operation: request.operation, status: 'success' });
        } catch (error) {
          if (!active) return;
          sessionStorage.removeItem(relayStorageKey);
          setStage('returning'); setMessage(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
          returnToApp({ requestId: request.requestId, state: request.state, operation: request.operation, status: 'error' });
        }
      })();
      return () => { active = false; };
    }

    if (!['register','login','stepup'].includes(request.operation)) {
      setStage('error'); setMessage('This LuLu sign-in link is invalid or expired. Return to LuLu and try again.');
      return;
    }
    let active = true;
    setStage('working');
    setMessage('Opening your LuLu passkey…');
    void (async () => {
      let operation = request.operation;
      try {
        const handoff = await bridgeRequest<{ options: any; challengeId: string; operation: string }>('/native/exchange/options', { exchangeId: request.exchangeId, state: request.state });
        if (handoff.operation !== request.operation || typeof handoff.challengeId !== 'string') throw new Error('Invalid authentication request.');
        operation = handoff.operation as NativeOperation;
        const credential = operation === 'register'
          ? await startRegistration({ optionsJSON: handoff.options })
          : await startAuthentication({ optionsJSON: handoff.options });
        await bridgeRequest('/native/exchange/complete', { exchangeId: request.exchangeId, state: request.state, challengeId: handoff.challengeId, response: credential });
        if (active) { setStage('returning'); setMessage('Verified. Returning to LuLu…'); }
        returnToApp({ requestId: request.requestId, state: request.state, operation, status: 'success' });
      } catch (error) {
        if (!active) return;
        const cancelled = error instanceof Error && error.name === 'NotAllowedError';
        setStage('error');
        setFailedStatus(cancelled ? 'cancelled' : 'error');
        setMessage(cancelled ? 'The passkey prompt was cancelled or no matching passkey was found. You can try again or return to LuLu.' : error instanceof Error ? error.message : 'Sign-in could not be completed. Return to LuLu and try again.');
      }
    })();
    return () => { active = false; };
  }, [request, attempt]);

  async function startGoogleSignIn() {
    if (!request || stage === 'working') return;
    try {
      setStage('working'); setMessage('Opening Google sign-in…');
      await authReady;
      await setPersistence(auth, browserSessionPersistence);
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (error) {
      sessionStorage.removeItem(relayStorageKey);
      setStage('returning'); setMessage(error instanceof Error ? error.message : 'Google sign-in could not be started.');
      returnToApp({ requestId: request.requestId, state: request.state, operation: request.operation, status: 'error' });
    }
  }

  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 28, background: '#f4f0e6', color: '#282820', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
    <section aria-live="polite" style={{ maxWidth: 420, width: '100%' }}>
      <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 20px', background: '#dce4d8', display: 'grid', placeItems: 'center', fontWeight: 700 }}>L</div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, margin: '0 0 12px' }}>LuLu sign-in</h1>
      <p>{message}</p>
      {request?.operation === 'google-login' && stage === 'choose' && <button type="button" onClick={() => void startGoogleSignIn()} style={{ minHeight: 48, padding: '0 22px', border: '1px solid #d9d1c3', borderRadius: 999, color: '#343830', background: '#fffefa', fontWeight: 700 }}>Continue with Google</button>}
      {stage === 'error' && request && <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {request.operation !== 'google-login' && <button type="button" onClick={() => setAttempt(value => value + 1)}>Try passkey again</button>}
        <button type="button" onClick={() => returnToApp({ requestId: request.requestId, state: request.state, operation: request.operation, status: failedStatus })}>Return to LuLu</button>
      </div>}
      {stage === 'error' && otherAddress && <p><a href={otherAddress.toString()} rel="noreferrer" style={{ color: '#405b45' }}>Use a passkey saved on {otherAddress.hostname}</a></p>}
      {stage === 'error' && !request && <a href="https://khora-lulu-2026.web.app" style={{ color: '#405b45' }}>Open LuLu</a>}
    </section>
  </main>;
}
