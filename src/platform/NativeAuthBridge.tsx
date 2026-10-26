import { useEffect, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { backendEndpoint } from '../services/backend/request';

type RelayStage = 'working' | 'returning' | 'error';

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
  if (!response.ok) throw new Error('The LuLu authentication service could not complete this request.');
  return result as T;
}

function returnToApp(params: { requestId: string; state: string; operation: string; status: string }) {
  const callback = new URL('lulu://auth-callback');
  for (const [key, value] of Object.entries(params)) callback.searchParams.set(key, value);
  window.location.assign(callback.toString());
}

export function NativeAuthBridge() {
  const [stage, setStage] = useState<RelayStage>('working');
  const [message, setMessage] = useState('Connecting securely to LuLu…');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const exchangeId = params.get('exchangeId');
    const state = params.get('state');
    const requestId = params.get('requestId');
    const requestedOperation = params.get('operation');
    if (!exchangeId || !/^[0-9a-f-]{36}$/i.test(exchangeId) || !requestId || !/^[0-9a-f-]{36}$/i.test(requestId) || !opaque(state) ||
        !['register','login','stepup'].includes(requestedOperation ?? '')) {
      setStage('error'); setMessage('This LuLu sign-in link is invalid or expired. Return to LuLu and try again.');
      return;
    }
    // Remove the rendezvous values from the browser address bar before WebAuthn.
    window.history.replaceState(null, '', window.location.pathname);

    void (async () => {
      let operation = requestedOperation!;
      try {
        const handoff = await bridgeRequest<{ options: any; challengeId: string; operation: string }>('/native/exchange/options', { exchangeId, state });
        if (handoff.operation !== requestedOperation || typeof handoff.challengeId !== 'string') throw new Error('Invalid authentication request.');
        operation = handoff.operation;
        const credential = operation === 'register'
          ? await startRegistration({ optionsJSON: handoff.options })
          : await startAuthentication({ optionsJSON: handoff.options });
        await bridgeRequest('/native/exchange/complete', { exchangeId, state, challengeId: handoff.challengeId, response: credential });
        if (active) { setStage('returning'); setMessage('Verified. Returning to LuLu…'); }
        returnToApp({ requestId, state, operation, status: 'success' });
      } catch (error) {
        if (!active) return;
        const cancelled = error instanceof Error && error.name === 'NotAllowedError';
        setStage('returning');
        setMessage(cancelled ? 'Passkey verification was cancelled. Returning to LuLu…' : 'Sign-in could not be completed. Returning to LuLu…');
        returnToApp({ requestId, state, operation, status: cancelled ? 'cancelled' : 'error' });
      }
    })();
    return () => { active = false; };
  }, []);

  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 28, background: '#f4f0e6', color: '#282820', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
    <section aria-live="polite" style={{ maxWidth: 420 }}>
      <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 20px', background: '#dce4d8', display: 'grid', placeItems: 'center', fontWeight: 700 }}>L</div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, margin: '0 0 12px' }}>LuLu sign-in</h1>
      <p>{message}</p>
      {stage === 'error' && <a href="https://khora-lulu-2026.web.app" style={{ color: '#405b45' }}>Open LuLu</a>}
    </section>
  </main>;
}
