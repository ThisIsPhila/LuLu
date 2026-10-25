import { useState } from 'react';
import { ArrowRight, ChevronLeft, CircleAlert, Info, LoaderCircle, ScanFace, ShieldCheck } from 'lucide-react';
import './OnboardingAuth.css';

export type OnboardingAuthScreen = 'welcome' | 'signin' | 'create';
export type AuthFailureReason =
  | 'credential-missing'
  | 'challenge-expired'
  | 'verification-failed'
  | 'network'
  | 'recovery-required'
  | 'unsupported'
  | 'local-origin'
  | 'unknown';

/** A success result must only be returned after the host has verified a server session. */
export type AuthActionResult =
  | { status: 'authenticated' }
  | { status: 'cancelled' }
  | { status: 'error'; reason: AuthFailureReason; message?: string; recoveryAction?: 'sign-in' };

export type OnboardingAuthProps = {
  initialScreen?: OnboardingAuthScreen;
  /** Set when the host has checked whether passkeys can be used in this browser context. */
  passkeySupport?: 'supported' | 'unsupported';
  onRegister: () => Promise<AuthActionResult>;
  onSignIn: () => Promise<AuthActionResult>;
  onHelpSigningIn?: () => void;
  /** Called immediately after the host reports a verified server session. */
  onAuthenticated: () => void;
};

type Screen = OnboardingAuthScreen | 'orientation-one' | 'orientation-two';
type Action = 'register' | 'signin';

const reasonCopy: Record<AuthFailureReason, string> = {
  'credential-missing': 'We couldn’t find a passkey for this account on this device. Try another device or get help signing in.',
  'challenge-expired': 'That sign-in request expired. Please try again.',
  'verification-failed': 'We couldn’t verify that passkey. Please try again or get help signing in.',
  network: 'LuLu couldn’t reach the sign-in service. Check your connection and try again.',
  'recovery-required': 'This account needs help to recover access. Get in touch with your account support path.',
  unsupported: 'Passkeys aren’t available in this browser or context. Try a supported browser on a secure connection.',
  'local-origin': 'Passkeys in the local preview need the localhost address.',
  unknown: 'Something interrupted the sign-in. Please try again.',
};

function detectPasskeySupport() {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && Boolean(window.isSecureContext);
}

export function OnboardingAuth({
  initialScreen = 'welcome',
  passkeySupport,
  onRegister,
  onSignIn,
  onHelpSigningIn,
  onAuthenticated,
}: OnboardingAuthProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState('');
  const [failureReason, setFailureReason] = useState<AuthFailureReason | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [recoveryAction, setRecoveryAction] = useState<'sign-in' | null>(null);
  const canUsePasskeys = passkeySupport ? passkeySupport === 'supported' : detectPasskeySupport();

  async function runAuth(action: Action) {
    if (!canUsePasskeys || busy) return;
    setBusy(action);
    setMessage('');
    setFailureReason(null);
    setWasCancelled(false);
    setRecoveryAction(null);
    try {
      const result = await (action === 'register' ? onRegister() : onSignIn());
      if (result.status === 'authenticated') {
        onAuthenticated();
      } else if (result.status === 'cancelled') {
        setWasCancelled(true);
      } else {
        setMessage(result.message?.trim() || reasonCopy[result.reason]);
        setFailureReason(result.reason);
        setRecoveryAction(result.recoveryAction ?? null);
      }
    } catch {
      setMessage(reasonCopy.unknown);
    } finally {
      setBusy(null);
    }
  }

  const goSignin = () => { setMessage(''); setFailureReason(null); setWasCancelled(false); setRecoveryAction(null); setScreen('signin'); };
  const goCreate = () => { setMessage(''); setFailureReason(null); setWasCancelled(false); setRecoveryAction(null); setScreen('create'); };
  const headerBack = () => {
    setMessage('');
    setFailureReason(null);
    setWasCancelled(false);
    setRecoveryAction(null);
    if (screen === 'signin') setScreen('welcome');
    else if (screen === 'create') setScreen('orientation-two');
    else if (screen === 'orientation-two') setScreen('orientation-one');
    else setScreen('welcome');
  };

  return (
    <main className={`onboarding-auth oa-screen-${screen}`}>
      <div className="oa-shell">
        <section className="oa-cover" aria-label="LuLu journal">
          <div className="oa-cover-image" aria-hidden="true" />
          <header className="oa-header">
            {screen !== 'welcome' ? (
              <button className="oa-back" type="button" onClick={headerBack} aria-label="Go back">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            ) : <span className="oa-header-spacer" />}
            <img className="oa-wordmark" src="/media/brand/lulu-wordmark-white.png" alt="LuLu" />
            <span className="oa-header-spacer" />
          </header>
          <div className="oa-cover-caption">
            <span className="oa-kicker">A place for your words</span>
            <p>Keep a passing thought,<br />a quiet morning, a whole story.</p>
          </div>
        </section>

        <section className="oa-panel" aria-live="polite">
          {screen === 'welcome' && <>
            <span className="oa-kicker">A place to begin</span>
            <h1>Your story,<br />held gently.</h1>
            <p className="oa-intro">An ordinary journal for the moments that make a life. A little room to breathe, whenever you need it.</p>
            <div className="oa-actions">
              <button className="oa-primary" type="button" onClick={() => setScreen('orientation-one')}>
                Begin with LuLu <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button className="oa-secondary" type="button" onClick={goSignin}>I already have an account</button>
            </div>
          </>}

          {(screen === 'orientation-one' || screen === 'orientation-two') && <Orientation
            step={screen === 'orientation-one' ? 1 : 2}
            onSkip={goCreate}
            onNext={() => setScreen(screen === 'orientation-one' ? 'orientation-two' : 'create')}
          />}

          {screen === 'create' && <>
            <span className="oa-kicker">Your way in</span>
            <h1>Create your<br />passkey.</h1>
            <p className="oa-intro">Use a passkey to return to your journal. Your browser or device handles Face ID, Touch ID, a device PIN, or a security key.</p>
            <PasskeyAction
              action="register" busy={busy} message={message} failureReason={failureReason} wasCancelled={wasCancelled}
              canUsePasskeys={canUsePasskeys} onTry={() => void runAuth('register')}
              onHelp={onHelpSigningIn} secondaryLabel={recoveryAction === 'sign-in' ? 'Sign in with existing passkey' : 'I already have an account'} onSecondary={goSignin}
            />
          </>}

          {screen === 'signin' && <>
            <span className="oa-kicker">Welcome back</span>
            <h1>Pick up where<br />you left off.</h1>
            <p className="oa-intro">Continue with a passkey on this device or choose another device or security key in your browser’s prompt.</p>
            <PasskeyAction
              action="signin" busy={busy} message={message} failureReason={failureReason} wasCancelled={wasCancelled}
              canUsePasskeys={canUsePasskeys} onTry={() => void runAuth('signin')}
              onHelp={onHelpSigningIn} secondaryLabel="I’m new to LuLu" onSecondary={goCreate}
            />
          </>}

          {(screen === 'create' || screen === 'signin') && <div className="oa-footnote"><ShieldCheck size={15} aria-hidden="true" /><span>Your device handles passkey verification. LuLu does not receive your face or fingerprint.</span></div>}
        </section>
      </div>
    </main>
  );
}

function Orientation({ step, onSkip, onNext }: { step: 1 | 2; onSkip: () => void; onNext: () => void }) {
  const first = step === 1;
  return <div className="oa-orientation">
    <div className="oa-orient-top"><span className="oa-kicker">A little about LuLu · {step === 1 ? '01' : '02'} / 02</span><button type="button" onClick={onSkip}>Skip</button></div>
    <h1>{first ? <>A place for<br />your words.</> : <>Your pace,<br />your choice.</>}</h1>
    <p className="oa-intro">{first
      ? 'Keep a passing thought, a quiet morning, or a whole story. Your words can take whatever shape feels right.'
      : 'Everyday writing stays simple. Protected writing is a separate choice, when and if you need it.'}</p>
    <div className="oa-progress" aria-label={`Introduction step ${step} of 2`}>
      <span className={first ? 'is-current' : 'is-done'} /><span className={!first ? 'is-current' : ''} />
      <button className="oa-primary" type="button" onClick={onNext}>{first ? 'Continue' : 'Create access'} <ArrowRight size={17} aria-hidden="true" /></button>
    </div>
  </div>;
}

function PasskeyAction({
  action, busy, message, failureReason, wasCancelled, canUsePasskeys, onTry, onHelp, secondaryLabel, onSecondary,
}: {
  action: Action;
  busy: Action | null;
  message: string;
  failureReason: AuthFailureReason | null;
  wasCancelled: boolean;
  canUsePasskeys: boolean;
  onTry: () => void;
  onHelp?: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  const label = action === 'register' ? 'Create passkey' : 'Continue with passkey';
  return <div className="oa-passkey-actions">
    {!canUsePasskeys && <div className="oa-status oa-status-error" role="status"><CircleAlert size={18} aria-hidden="true" /><span><strong>Passkeys unavailable</strong>{reasonCopy.unsupported}</span></div>}
    {message && <div className="oa-status oa-status-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span><strong>{failureReason === 'local-origin' ? 'Open the local passkey preview' : 'Couldn’t complete passkey access'}</strong>{message}{failureReason === 'local-origin' && <a href={`http://localhost:${window.location.port || '5173'}${window.location.pathname}?screen=${action === 'signin' ? 'signin' : 'create'}`}>Open LuLu on localhost <ArrowRight size={14} aria-hidden="true" /></a>}</span></div>}
    {wasCancelled && <div className="oa-status" role="status"><Info size={18} aria-hidden="true" /><span>Passkey prompt closed. You can try again whenever you’re ready.</span></div>}
    <button className="oa-primary" type="button" onClick={onTry} disabled={!canUsePasskeys || busy !== null}>
      {busy ? <><LoaderCircle className="oa-spinner" size={17} aria-hidden="true" />{busy === 'register' ? 'Waiting for your device…' : 'Waiting for your passkey…'}</> : <><ScanFace className="oa-passkey-icon" size={19} strokeWidth={1.8} aria-hidden="true" />{label}</>}
    </button>
    <button className="oa-secondary" type="button" onClick={onSecondary} disabled={busy !== null}>{secondaryLabel}</button>
    {action === 'signin' && onHelp && <button className="oa-help" type="button" onClick={onHelp} disabled={busy !== null}>Need help signing in?</button>}
  </div>;
}
