import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, CircleAlert, Info, LoaderCircle, Moon, ScanFace, ShieldCheck, Sun } from 'lucide-react';
import { isNativePlatform } from '../platform/runtime';
import type { AppTheme } from '../services/appPreferences';
import { loginModeScenes } from '../services/loginScenes';
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
  | { status: 'notice'; message: string }
  | { status: 'error'; reason: AuthFailureReason; message?: string; recoveryAction?: 'sign-in' };

export type OnboardingAuthProps = {
  initialScreen?: OnboardingAuthScreen;
  initialTheme?: AppTheme;
  followSystem?: boolean;
  onThemeChange?: (theme: AppTheme) => void;
  /** Set when the host has checked whether passkeys can be used in this browser context. */
  passkeySupport?: 'supported' | 'unsupported';
  onRegister: () => Promise<AuthActionResult>;
  onSignIn: () => Promise<AuthActionResult>;
  onEmailAuth: (email: string, password: string, create: boolean) => Promise<AuthActionResult>;
  onGoogleSignIn: () => Promise<AuthActionResult>;
  onForgotPassword: (email: string) => Promise<AuthActionResult>;
  onHelpSigningIn?: () => void;
  onStartOnboarding?: () => void;
  onDevelopmentEnter?: () => void;
  /** Called immediately after the host reports a verified server session. */
  onAuthenticated: () => void;
};

type Screen = OnboardingAuthScreen | 'orientation-one' | 'orientation-two' | 'alternate-signin' | 'alternate-create';
type Action = 'register' | 'signin';
type BusyAction = Action | 'email' | 'google' | 'password-reset';
type LoginMode = AppTheme;

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
  // Native WebViews hand passkey work to LuLu's HTTPS bridge in the system
  // browser. WebAuthn support in the WebView itself is not required there.
  return isNativePlatform() || (typeof window !== 'undefined' && 'PublicKeyCredential' in window && Boolean(window.isSecureContext));
}

export function OnboardingAuth({
  initialScreen = 'welcome',
  initialTheme = 'light',
  followSystem = false,
  onThemeChange,
  passkeySupport,
  onRegister,
  onSignIn,
  onEmailAuth,
  onGoogleSignIn,
  onForgotPassword,
  onHelpSigningIn,
  onStartOnboarding,
  onDevelopmentEnter,
  onAuthenticated,
}: OnboardingAuthProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [loginMode, setLoginMode] = useState<LoginMode>(initialTheme);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [providerMessage, setProviderMessage] = useState('');
  const [passwordResetFeedback, setPasswordResetFeedback] = useState<{ kind: 'notice' | 'error'; message: string } | null>(null);
  const [failureReason, setFailureReason] = useState<AuthFailureReason | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [recoveryAction, setRecoveryAction] = useState<'sign-in' | null>(null);
  const canUsePasskeys = passkeySupport ? passkeySupport === 'supported' : detectPasskeySupport();
  const isLoginScene = screen === 'signin' || screen === 'alternate-signin';
  const isAuthScreen = screen === 'signin' || screen === 'create' || screen === 'alternate-signin' || screen === 'alternate-create';
  const loginModeScene = loginModeScenes[loginMode];

  useEffect(() => {
    if (followSystem) setLoginMode(initialTheme);
  }, [followSystem, initialTheme]);

  function toggleTheme() {
    const next = loginMode === 'light' ? 'dark' : 'light';
    setLoginMode(next);
    onThemeChange?.(next);
  }
  const backgroundToneStrength = (loginModeScene.toneOpacity / 100) * (Math.abs(loginModeScene.toneLevel - 5) / 5);
  const backgroundToneColor = loginModeScene.toneLevel < 5 ? '#171914' : '#fff9ed';

  async function runAuth(action: Action) {
    if (!canUsePasskeys || busy) return;
    setBusy(action);
    setMessage('');
    setProviderMessage('');
    setFailureReason(null);
    setWasCancelled(false);
    setRecoveryAction(null);
    try {
      const result = await (action === 'register' ? onRegister() : onSignIn());
      if (result.status === 'authenticated') {
        onAuthenticated();
      } else if (result.status === 'cancelled') {
        setWasCancelled(true);
      } else if (result.status === 'notice') {
        setMessage(result.message);
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

  async function runEmailAuth(create: boolean) {
    if (busy) return;
    setBusy('email'); setProviderMessage(''); setPasswordResetFeedback(null); setMessage(''); setWasCancelled(false); setRecoveryAction(null);
    try {
      const result = await onEmailAuth(email.trim(), password, create);
      if (result.status === 'authenticated') { setPassword(''); onAuthenticated(); }
      else if (result.status === 'cancelled') setWasCancelled(true);
      else if (result.status === 'notice') setProviderMessage(result.message);
      else { setProviderMessage(result.message?.trim() || reasonCopy[result.reason]); }
    } catch { setProviderMessage(reasonCopy.unknown); }
    finally { setBusy(null); }
  }

  async function runGoogleSignIn() {
    if (busy) return;
    setBusy('google'); setProviderMessage(''); setPasswordResetFeedback(null); setMessage(''); setWasCancelled(false); setRecoveryAction(null);
    try {
      const result = await onGoogleSignIn();
      if (result.status === 'authenticated') onAuthenticated();
      else if (result.status === 'cancelled') setWasCancelled(true);
      else if (result.status === 'notice') setProviderMessage(result.message);
      else { setProviderMessage(result.message?.trim() || reasonCopy[result.reason]); }
    } catch { setProviderMessage(reasonCopy.unknown); }
    finally { setBusy(null); }
  }

  async function runForgotPassword() {
    if (busy) return;
    setProviderMessage('');
    setPasswordResetFeedback(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setPasswordResetFeedback({ kind: 'error', message: 'Enter your email address above, then request a reset link.' });
      return;
    }
    setBusy('password-reset');
    setProviderMessage('');
    setPasswordResetFeedback(null);
    try {
      const result = await onForgotPassword(normalizedEmail);
      if (result.status === 'notice' || result.status === 'authenticated') {
        setPasswordResetFeedback({ kind: 'notice', message: 'If an account exists for that email, password-reset instructions will be sent.' });
      } else if (result.status === 'error') {
        setPasswordResetFeedback({ kind: 'error', message: result.message?.trim() || reasonCopy[result.reason] });
      } else {
        setPasswordResetFeedback({ kind: 'notice', message: 'Password reset was not requested.' });
      }
    } catch (error) {
      setPasswordResetFeedback({ kind: 'error', message: error instanceof Error && error.message.trim() ? error.message : reasonCopy.unknown });
    } finally { setBusy(null); }
  }

  const clearAuthMessages = () => { setMessage(''); setProviderMessage(''); setPasswordResetFeedback(null); setFailureReason(null); setWasCancelled(false); setRecoveryAction(null); };
  const goSignin = () => { clearAuthMessages(); setPassword(''); setScreen('signin'); };
  const goCreate = () => { clearAuthMessages(); setPassword(''); setScreen('create'); };
  const goAlternateSignin = () => { clearAuthMessages(); setPassword(''); setScreen('alternate-signin'); };
  const goAlternateCreate = () => { clearAuthMessages(); setPassword(''); setScreen('alternate-create'); };
  const headerBack = () => {
    clearAuthMessages();
    setPassword('');
    if (screen === 'alternate-signin') setScreen('signin');
    else if (screen === 'alternate-create') setScreen('create');
    else if (screen === 'signin' || screen === 'create') setScreen('signin');
    else if (screen === 'orientation-two') setScreen('orientation-one');
    else setScreen('welcome');
  };

  return (
    <main className={`onboarding-auth oa-screen-${screen}${screen === 'signin' ? ' oa-public-signin' : ''}${isAuthScreen ? ' oa-auth-flow' : ''}${isLoginScene ? ' oa-login-entry' : ''}${isAuthScreen && loginMode === 'dark' ? ' oa-dark-mode' : ''}`}>
      {isLoginScene && <div
        key={loginModeScene.landscape.src}
        className="oa-login-landscape"
        style={{ backgroundImage: `url("${loginModeScene.landscape.src}")`, filter: `blur(${loginModeScene.blurLevel * 1.5}px)` }}
        aria-hidden="true"
      />}
      {isLoginScene && <div
        className="oa-login-tone-overlay"
        style={{ backgroundColor: backgroundToneColor, opacity: backgroundToneStrength }}
        aria-hidden="true"
      />}
      <div className="oa-shell">
        <section className="oa-cover" aria-label="LuLu journal">
          <div
            key={isLoginScene ? loginModeScene.portrait.src : 'default-cover'}
            className="oa-cover-image"
            style={isLoginScene ? { backgroundImage: `linear-gradient(180deg, #3b302219 0%, transparent 29%, #26241caa 100%), url("${loginModeScene.portrait.src}")` } : undefined}
            aria-hidden="true"
          />
          <header className="oa-header">
            {screen !== 'welcome' && screen !== 'signin' ? (
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
          {screen === 'signin' && onStartOnboarding && <button className="oa-cover-onboarding" type="button" disabled={busy !== null} onClick={onStartOnboarding}>
            Onboarding <ArrowRight size={18} aria-hidden="true" />
          </button>}
        </section>

        <section className="oa-panel" aria-live="polite">
          {isAuthScreen && <button
            className="oa-login-mode-toggle"
            type="button"
            aria-label={`Switch to ${loginMode === 'light' ? 'dark' : 'light'} mode`}
            aria-pressed={loginMode === 'dark'}
            title={`Switch to ${loginMode === 'light' ? 'dark' : 'light'} mode`}
            onClick={toggleTheme}
          >
            {loginMode === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
          </button>}
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
            <div className="oa-auth-main">
              <span className="oa-kicker">Your way in</span>
              <h1>Create your<br />account.</h1>
              <p className="oa-intro">Create a passkey to keep your journal close. Your device handles the unlock.</p>
              <PasskeyAction
                action="register" busy={busy} message={message} failureReason={failureReason} wasCancelled={wasCancelled}
                canUsePasskeys={canUsePasskeys} onTry={() => void runAuth('register')} onHelp={onHelpSigningIn}
              />
            </div>
            <div className="oa-auth-bottom">
              <div className="oa-footnote"><ShieldCheck size={15} aria-hidden="true" /><span>Your device handles passkey verification. LuLu does not receive your face or fingerprint.</span></div>
              <button className="oa-secondary" type="button" onClick={goAlternateCreate}>Use email or Google instead</button>
              <button className="oa-help" type="button" onClick={goSignin}>{recoveryAction === 'sign-in' ? 'Sign in with existing passkey' : 'I already have an account'}</button>
            </div>
          </>}

          {screen === 'signin' && <>
            <div className="oa-auth-main">
              <span className="oa-kicker">Welcome back</span>
              <h1>Pick up where<br />you left off.</h1>
              <p className="oa-intro">Your journal is waiting. Continue securely with your passkey.</p>
            </div>
            <div className="oa-auth-bottom">
              <PasskeyAction
                action="signin" busy={busy} message={message} failureReason={failureReason} wasCancelled={wasCancelled}
                canUsePasskeys={canUsePasskeys} onTry={() => void runAuth('signin')} onHelp={onHelpSigningIn}
              />
              <div className="oa-footnote"><ShieldCheck size={15} aria-hidden="true" /><span>Your device handles passkey verification. LuLu does not receive your face or fingerprint.</span></div>
              {onDevelopmentEnter && <div className="oa-local-preview-actions">
                <p>Local preview · your journal stays on this browser.</p>
                <button className="oa-secondary" type="button" onClick={onDevelopmentEnter}>Continue without signing in</button>
              </div>}
              <div className="oa-auth-secondary-links">
                <button className="oa-secondary" type="button" onClick={goAlternateSignin}>Use email or Google instead</button>
                <button className="oa-help" type="button" onClick={goCreate}>Create an account</button>
              </div>
            </div>
          </>}

          {screen === 'alternate-signin' && <>
            <div className="oa-auth-main oa-alternate-main">
              <span className="oa-kicker">Another way in</span>
              <h1>Sign in to<br />your account.</h1>
              <p className="oa-intro">Continue with Google or use your email and password.</p>
              <ProviderActions email={email} password={password} busy={busy} message={providerMessage}
                passwordResetFeedback={passwordResetFeedback} onForgotPassword={() => void runForgotPassword()}
                onEmailChange={value => { setEmail(value); setPasswordResetFeedback(null); }} onPasswordChange={setPassword} onEmailSubmit={() => void runEmailAuth(false)} onGoogle={() => void runGoogleSignIn()} />
            </div>
            <div className="oa-auth-bottom oa-auth-bottom-compact">
              <button className="oa-secondary" type="button" onClick={goSignin}>Back to passkey sign-in</button>
              <button className="oa-help" type="button" onClick={goCreate}>Create an account</button>
            </div>
          </>}

          {screen === 'alternate-create' && <>
            <div className="oa-auth-main oa-alternate-main">
              <span className="oa-kicker">Create account</span>
              <h1>Choose another<br />way to begin.</h1>
              <p className="oa-intro">Use Google or create an account with your email and a password.</p>
              <ProviderActions create email={email} password={password} busy={busy} message={providerMessage}
                onEmailChange={setEmail} onPasswordChange={setPassword} onEmailSubmit={() => void runEmailAuth(true)} onGoogle={() => void runGoogleSignIn()} />
            </div>
            <div className="oa-auth-bottom oa-auth-bottom-compact">
              <button className="oa-secondary" type="button" onClick={goCreate}>Back to passkey setup</button>
              <button className="oa-help" type="button" onClick={goAlternateSignin}>I already have an account</button>
            </div>
          </>}
        </section>
      </div>
    </main>
  );
}

function ProviderActions({
  create = false, email, password, busy, message, passwordResetFeedback, onForgotPassword, onEmailChange, onPasswordChange, onEmailSubmit, onGoogle,
}: {
  create?: boolean;
  email: string;
  password: string;
  busy: BusyAction | null;
  message: string;
  passwordResetFeedback?: { kind: 'notice' | 'error'; message: string } | null;
  onForgotPassword?: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onEmailSubmit: () => void;
  onGoogle: () => void;
}) {
  return <div className="oa-provider-actions">
    <div className="oa-provider-divider"><span>{create ? 'or use email or Google' : 'or use another sign-in'}</span></div>
    {message && <div className="oa-status oa-status-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span><strong>Couldn’t complete sign-in</strong>{message}</span></div>}
    <button className="oa-provider-button" type="button" onClick={onGoogle} disabled={busy !== null}>
      {busy === 'google' ? <><LoaderCircle className="oa-spinner" size={16} aria-hidden="true" />Connecting to Google…</> : <><GoogleMark />Continue with Google</>}
    </button>
    <form className="oa-email-form" onSubmit={event => { event.preventDefault(); onEmailSubmit(); }}>
      <label>Email address<input type="email" autoComplete="email" inputMode="email" value={email} onChange={event => onEmailChange(event.target.value)} required disabled={busy !== null} /></label>
      <label>Password<input type="password" autoComplete={create ? 'new-password' : 'current-password'} minLength={create ? 6 : undefined} aria-describedby={create ? 'oa-password-guidance' : undefined} value={password} onChange={event => onPasswordChange(event.target.value)} required disabled={busy !== null} />{create && <small id="oa-password-guidance">At least 6 characters. A longer, unique passphrase is recommended.</small>}</label>
      {!create && onForgotPassword && <button className="oa-password-reset" type="button" onClick={onForgotPassword} disabled={busy !== null}>{busy === 'password-reset' ? <><LoaderCircle className="oa-spinner" size={14} aria-hidden="true" />Sending reset instructions…</> : 'Forgot password?'}</button>}
      {passwordResetFeedback && <div className={`oa-status ${passwordResetFeedback.kind === 'error' ? 'oa-status-error' : 'oa-status-notice'}`} role={passwordResetFeedback.kind === 'error' ? 'alert' : 'status'}><span>{passwordResetFeedback.message}</span></div>}
      <button className="oa-primary" type="submit" disabled={busy !== null}>
        {busy === 'email' ? <><LoaderCircle className="oa-spinner" size={16} aria-hidden="true" />Checking your account…</> : create ? 'Create account with email' : 'Continue with email'}
      </button>
    </form>
  </div>;
}

function GoogleMark() {
  return <svg className="oa-google-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
    <path fill="#FF3D00" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
    <path fill="#4CAF50" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 17.9l6.8-5.2Z" />
    <path fill="#1976D2" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3C14.2 15.5 18.7 12 24 12Z" />
  </svg>;
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
  action, busy, message, failureReason, wasCancelled, canUsePasskeys, onTry, onHelp,
}: {
  action: Action;
  busy: BusyAction | null;
  message: string;
  failureReason: AuthFailureReason | null;
  wasCancelled: boolean;
  canUsePasskeys: boolean;
  onTry: () => void;
  onHelp?: () => void;
}) {
  const label = action === 'register' ? 'Create passkey' : 'Continue with passkey';
  return <div className="oa-passkey-actions">
    {!canUsePasskeys && <div className="oa-status oa-status-error" role="status"><CircleAlert size={18} aria-hidden="true" /><span><strong>Passkeys unavailable</strong>{reasonCopy.unsupported}</span></div>}
    {message && <div className="oa-status oa-status-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span><strong>{failureReason === 'local-origin' ? 'Open the local passkey preview' : 'Couldn’t complete passkey access'}</strong>{message}{failureReason === 'local-origin' && <a href={`http://localhost:${window.location.port || '5173'}${window.location.pathname}?screen=${action === 'signin' ? 'signin' : 'create'}`}>Open LuLu on localhost <ArrowRight size={14} aria-hidden="true" /></a>}</span></div>}
    {wasCancelled && <div className="oa-status" role="status"><Info size={18} aria-hidden="true" /><span>Passkey prompt closed. You can try again whenever you’re ready.</span></div>}
    <button className="oa-primary" type="button" onClick={onTry} disabled={!canUsePasskeys || busy !== null}>
      {busy === 'register' || busy === 'signin' ? <><LoaderCircle className="oa-spinner" size={17} aria-hidden="true" />{busy === 'register' ? 'Waiting for your device…' : 'Waiting for your passkey…'}</> : <><ScanFace className="oa-passkey-icon" size={19} strokeWidth={1.8} aria-hidden="true" />{label}</>}
    </button>
    {action === 'signin' && onHelp && <button className="oa-help" type="button" onClick={onHelp} disabled={busy !== null}>Need help signing in?</button>}
  </div>;
}
