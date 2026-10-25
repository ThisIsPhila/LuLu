import { useEffect, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, ScanFace, X } from 'lucide-react';
import { authError } from '../services/backend/passkeys';
import './ProtectedGateModal.css';

type Props = { isOpen: boolean; onClose: () => void; onVerify: () => Promise<void> };

export function ProtectedGateModal({ isOpen, onClose, onVerify }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setError(''); ref.current?.showModal(); }
    else ref.current?.close();
  }, [isOpen]);

  async function verify() {
    setBusy(true);
    setError('');
    try { await onVerify(); }
    catch (cause) { setError(authError(cause)); }
    finally { setBusy(false); }
  }

  if (!isOpen) return null;
  return <dialog ref={ref} className="protected-gate-dialog" aria-labelledby="protected-gate-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="protected-gate-visual">
      <img src="/media/brand/lulu-wordmark-white.png" alt="LuLu" />
      <button type="button" className="protected-gate-close" onClick={onClose} aria-label="Close protected access"><X size={18} aria-hidden="true" /></button>
    </div>
    <div className="protected-gate-body">
      <span className="protected-gate-kicker">Your private space</span>
      <h2 id="protected-gate-title">Open protected writing.</h2>
      <p>Verify with a passkey to open a private session for up to ten minutes.</p>
      {error && <div className="protected-gate-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span><strong>Couldn’t verify your passkey</strong>{error}</span></div>}
      <button className="protected-gate-action" type="button" disabled={busy} onClick={() => void verify()}>
        {busy ? <LoaderCircle className="protected-gate-spinner" size={19} aria-hidden="true" /> : <ScanFace className="protected-gate-scan" size={19} strokeWidth={1.8} aria-hidden="true" />}
        {busy ? 'Waiting for your device…' : 'Continue with passkey'}
      </button>
      <p className="protected-gate-note">Your browser will offer the verification methods available for your passkey.</p>
    </div>
  </dialog>;
}
