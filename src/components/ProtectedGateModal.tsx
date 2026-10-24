import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, X, ShieldCheck, KeyRound } from 'lucide-react';

type ProtectedGateProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const ProtectedGateModal: React.FC<ProtectedGateProps> = ({ isOpen, onClose, onSuccess }) => {
  const [authStatus, setAuthStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [usePinFallback, setUsePinFallback] = useState(false);
  const [pin, setPin] = useState('');
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setAuthStatus('idle');
      setUsePinFallback(false);
      setPin('');
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Fallback for browsers without closedby support (Modern Web Guidance)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleDialogClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isContent) {
        onClose();
      }
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleDialogClick);
      return () => dialog.removeEventListener('click', handleDialogClick);
    }
  }, [onClose]);

  const handleUsePasskey = async () => {
    setAuthStatus('scanning');

    // Simulate authentic passkey biometric check
    setTimeout(() => {
      setAuthStatus('verified');
      setTimeout(() => {
        onSuccess();
      }, 700);
    }, 1100);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setAuthStatus('verified');
      setTimeout(() => {
        onSuccess();
      }, 600);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="protected-gate-dialog"
      {...({ closedby: 'any' } as any)}
      aria-labelledby="protected-gate-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="protected-gate-content">
        <button
          className="protected-gate-close"
          onClick={onClose}
          aria-label="Close protected gate"
        >
          <X size={18} />
        </button>

        {/* 3D Liquid Pearl / Iridescent Sphere (Direction from Screen C) */}
        <div className="pearl-container" aria-hidden="true">
          <div className={`liquid-pearl ${authStatus}`}>
            <div className="pearl-highlight" />
            <div className="pearl-inner-glow" />
            <div className="pearl-reflection" />
          </div>
          {authStatus === 'scanning' && <div className="pearl-scan-ring" />}
        </div>

        <div className="protected-gate-body">
          <h2 id="protected-gate-title" className="protected-gate-title">
            {authStatus === 'verified'
              ? 'Session Authenticated'
              : 'Enter protected writing'}
          </h2>
          <p className="protected-gate-subtitle">
            {authStatus === 'scanning'
              ? 'Scanning biometric passkey...'
              : authStatus === 'verified'
              ? 'Private identity environment active.'
              : 'Access your private environment with your passkey.'}
          </p>

          {!usePinFallback ? (
            <div className="protected-gate-actions">
              <button
                type="button"
                className={`passkey-button ${authStatus}`}
                onClick={handleUsePasskey}
                disabled={authStatus !== 'idle'}
              >
                {authStatus === 'verified' ? (
                  <>
                    <ShieldCheck size={18} />
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <Fingerprint size={19} className={authStatus === 'scanning' ? 'scanning-icon' : ''} />
                    <span>{authStatus === 'scanning' ? 'Verifying...' : 'Use Passkey'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="secondary-link-button"
                onClick={() => setUsePinFallback(true)}
              >
                <KeyRound size={14} />
                <span>Use device PIN or pattern</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="pin-fallback-form">
              <input
                type="password"
                placeholder="Enter 4-digit PIN"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                className="pin-input"
              />
              <button type="submit" className="passkey-button" disabled={pin.length < 4}>
                Unlock
              </button>
              <button
                type="button"
                className="secondary-link-button"
                onClick={() => setUsePinFallback(false)}
              >
                Return to Passkey
              </button>
            </form>
          )}

          <div className="protected-security-note">
            <span>Passkey-mediated local access</span>
            <span>•</span>
            <span>Real mappings stay device-side</span>
          </div>
        </div>
      </div>
    </dialog>
  );
};
