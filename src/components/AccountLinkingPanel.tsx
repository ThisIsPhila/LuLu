import { useEffect, useRef, useState } from 'react';
import { EmailAuthProvider, reload } from 'firebase/auth';
import { auth } from '../services/backend/firebase';
import { isNativePlatform } from '../platform/runtime';
import { openExternalUrl } from '../platform/externalBrowser';
import { canLinkAdditionalProvider } from '../services/backend/sessionRestorePolicy';
import { assertAccountLinkAuthority, linkEmailAccount, linkGoogleAccount, lockPrivate, resendEmailVerification, unlockPrivate, type AccountLinkAuthority } from '../services/backend/passkeys';
import './AccountLinkingPanel.css';

type Props = { uid: string; authMethod?: 'passkey'|'email'|'google'; emailVerificationStatus?: 'sent'|'failed'; isPrivateSessionActive?: () => boolean };

function linkedProvider(providerId: string): boolean {
  return auth.currentUser?.providerData.some(provider => provider.providerId === providerId) ?? false;
}

function providerError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as {code?:unknown}).code) : '';
  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') return 'That sign-in method belongs to another LuLu account. LuLu does not combine accounts automatically. Sign in to the account that owns it or contact support before making changes.';
  if (code === 'auth/requires-recent-login') return 'Firebase needs a recent sign-in before it can link this method. Sign out, sign in again with your current method, then retry.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Google linking was cancelled.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/weak-password') return 'Choose a password with at least six characters.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Firebase could not verify those email and password details.';
  if (error instanceof Error && error.name === 'NotAllowedError') return 'Passkey verification was cancelled or timed out. Try again when you are ready.';
  return error instanceof Error ? error.message : 'The sign-in method could not be linked. Please try again.';
}

export function AccountLinkingPanel({uid,authMethod,emailVerificationStatus,isPrivateSessionActive}:Props) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [googleLinked,setGoogleLinked]=useState(()=>linkedProvider('google.com'));
  const [googleEmail,setGoogleEmail]=useState(()=>auth.currentUser?.providerData.find(provider => provider.providerId === 'google.com')?.email ?? '');
  const [emailLinked,setEmailLinked]=useState(()=>linkedProvider(EmailAuthProvider.PROVIDER_ID));
  const [emailVerified,setEmailVerified]=useState(()=>auth.currentUser?.emailVerified ?? false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [googleReady,setGoogleReady]=useState(false);
  const temporaryPrivateStepUp=useRef(false);
  const googleAuthority=useRef<AccountLinkAuthority|null>(null);
  const googleLockToken=useRef<string | undefined>(undefined);

  useEffect(()=>()=>{
    if(temporaryPrivateStepUp.current && !isPrivateSessionActive?.()) void lockPrivate().catch(()=>{});
  },[uid]);
  useEffect(()=>{
    if(!googleReady || !googleAuthority.current)return;
    const timer=window.setTimeout(()=>void cancelGoogleLink(),Math.max(0,googleAuthority.current!.privateUntil-Date.now()));
    return()=>window.clearTimeout(timer);
  },[googleReady]);

  useEffect(()=>{
    if(emailVerificationStatus==='sent')setStatus('Firebase accepted a verification email request for your new account. The address remains unverified until its owner follows the link.');
    else if(emailVerificationStatus==='failed')setStatus('Your account was created, but Firebase could not send its verification email. You can retry from here.');
  },[emailVerificationStatus]);

  useEffect(()=>{
    let active=true;
    void auth.currentUser?.reload().then(()=>{
      if(!active || auth.currentUser?.uid!==uid)return;
      setGoogleLinked(linkedProvider('google.com'));
      setGoogleEmail(auth.currentUser.providerData.find(provider => provider.providerId === 'google.com')?.email ?? '');
      setEmailLinked(linkedProvider(EmailAuthProvider.PROVIDER_ID));
      setEmailVerified(auth.currentUser.emailVerified);
    }).catch(()=>{/* Keep the last confirmed account-link and verification states. */});
    return()=>{active=false;};
  },[uid]);

  async function prepareGoogleLink() {
    if(busy)return;
    const preservePrivate=isPrivateSessionActive?.() ?? false;
    setBusy(true);setError('');setStatus('');
    try {
      await unlockPrivate();
      googleAuthority.current=await assertAccountLinkAuthority(uid);
      googleLockToken.current=await auth.currentUser?.getIdToken();
      temporaryPrivateStepUp.current=!preservePrivate;
      setGoogleReady(true);
      setStatus('Passkey verified. Tap Continue with Google and choose the Google account you want to link.');
    } catch(caught) {
      setError(providerError(caught));
      if(!isPrivateSessionActive?.())try{await lockPrivate();}catch{setError('Passkey verification failed, and LuLu could not confirm that private access was locked. Reconnect before continuing.');}
    } finally {setBusy(false);}
  }

  async function finishGoogleLink() {
    if(busy)return;
    setBusy(true);setError('');setStatus('');
    const authority=googleAuthority.current;
    if(!authority){setBusy(false);setError('Verify your account with its passkey before continuing.');return;}
    const linking=linkGoogleAccount(uid,authority);
    try {
      await linking;
      setGoogleLinked(true);
      setGoogleEmail(auth.currentUser?.providerData.find(provider => provider.providerId === 'google.com')?.email ?? '');
      setStatus('Google is linked to this LuLu account. You can use it to sign in next time.');
    } catch(caught) { setGoogleLinked(linkedProvider('google.com'));setGoogleEmail(auth.currentUser?.providerData.find(provider => provider.providerId === 'google.com')?.email ?? '');setError(providerError(caught)); }
    finally {
      try { if(!isPrivateSessionActive?.()) await lockPrivate(googleLockToken.current); }
      catch { setError('Google linking finished, but LuLu could not confirm that private access was locked. Reconnect and lock the private session before continuing.');setStatus(''); }
      temporaryPrivateStepUp.current=false;googleAuthority.current=null;googleLockToken.current=undefined;setGoogleReady(false);setBusy(false);
    }
  }

  async function cancelGoogleLink() {
    setBusy(true);setError('');setStatus('');
    try { if(!isPrivateSessionActive?.()) await lockPrivate(googleLockToken.current); }
    catch { setError('LuLu could not confirm that private access was locked. Reconnect and lock the private session before continuing.'); }
    finally { temporaryPrivateStepUp.current=false;googleAuthority.current=null;googleLockToken.current=undefined;setGoogleReady(false);setBusy(false); }
  }

  async function linkEmail() {
    if (!email.trim() || !password) { setError('Enter the email address and password you want to link.'); return; }
    setBusy(true);setError('');setStatus('');
    try {
      await unlockPrivate();
      const verification=await linkEmailAccount(uid,email,password);
      setPassword('');setEmailLinked(true);setEmailVerified(false);
      setStatus(verification==='sent'
        ? 'Email and password are linked. Firebase accepted a verification email request; the address remains unverified until its owner follows the link.'
        : 'Email and password are linked, but Firebase could not send the verification email. You can retry from here.');
    } catch (caught) { setGoogleLinked(linkedProvider('google.com'));setEmailLinked(linkedProvider(EmailAuthProvider.PROVIDER_ID));setEmailVerified(auth.currentUser?.emailVerified ?? false);setError(providerError(caught)); }
    finally {
      try { if(!isPrivateSessionActive?.()) await lockPrivate(); }
      catch { setError('Email linking finished, but LuLu could not confirm that private access was locked. Reconnect and lock the private session before continuing.');setStatus(''); }
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);setError('');setStatus('');
    try {
      const result=await resendEmailVerification(uid);
      setStatus(result==='sent'
        ? 'Firebase accepted a verification email request. Delivery can take a few minutes; check the inbox and spam folder.'
        : 'Firebase could not send the verification email. Try again later.');
    } catch (caught) { setError(providerError(caught)); }
    finally { setBusy(false); }
  }

  async function refreshVerification() {
    setBusy(true);setError('');setStatus('');
    try {
      const user=auth.currentUser;
      if(!user || user.uid!==uid) throw new Error('The active account changed. Sign in again to check verification.');
      await reload(user);
      setEmailVerified(auth.currentUser?.emailVerified ?? false);
      setStatus(auth.currentUser?.emailVerified ? 'Firebase confirms this email address is verified.' : 'Firebase still reports this email address as unverified.');
    } catch (caught) { setError(providerError(caught)); }
    finally { setBusy(false); }
  }

  async function openWebAccountSettings() {
    setError('');
    try { await openExternalUrl('https://khora-lulu-2026.web.app'); }
    catch (caught) { setError(caught instanceof Error?caught.message:'Could not open LuLu in your phone browser.'); }
  }

  const canLink=canLinkAdditionalProvider(authMethod) && !busy;
  return <section className="account-linking" aria-labelledby="account-linking-title">
    <div className="account-linking-heading"><span>ACCOUNT ACCESS</span><h2 id="account-linking-title">Sign-in methods</h2><p>Add a way to sign in to this same account. First verify your passkey, then choose the Google account or enter your email and password.</p></div>
    <div className="account-linking-method"><div><strong className="account-google-label"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6v5h6.5c3.8-3.5 6.1-8.6 6.1-14.7z"/><path fill="#34A853" d="M24 44c5.4 0 9.9-1.8 13.2-4.8l-6.5-5c-1.8 1.2-4.1 1.9-6.7 1.9-5.2 0-9.6-3.5-11.2-8.2H6.1v5.1C9.4 39.6 16.2 44 24 44z"/><path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.8V15H6.1a20 20 0 0 0 0 18z"/><path fill="#EA4335" d="M24 11.9c2.9 0 5.5 1 7.5 2.9l5.7-5.7C33.9 6 29.4 4 24 4 16.2 4 9.4 8.4 6.1 15l6.7 5.1c1.6-4.7 6-8.2 11.2-8.2z"/></svg> Google</strong><span>{googleLinked ? (googleEmail ? `Linked: ${googleEmail}` : 'Linked to this account (email unavailable)') : 'Not linked'}</span></div>
      {!googleLinked && !isNativePlatform() && <div className="account-linking-actions">{!googleReady
        ? <button type="button" disabled={!canLink} onClick={()=>void prepareGoogleLink()}>{busy?'Verifying…':'Verify to link Google'}</button>
        : <><button type="button" disabled={busy} onClick={()=>void finishGoogleLink()}>{busy?'Opening Google…':'Continue with Google'}</button><button type="button" disabled={busy} onClick={()=>void cancelGoogleLink()}>Cancel</button></>}</div>}
    </div>
    {!googleLinked && isNativePlatform() && <div className="account-linking-native-guide"><p className="account-linking-note">To link Google: open LuLu in your phone browser, sign in with this same passkey, open Settings, then choose Verify to link Google. After verification, choose Continue with Google and select your Google account.</p><button type="button" onClick={()=>void openWebAccountSettings()}>Open LuLu in phone browser</button></div>}
    <div className="account-linking-method"><div><strong>Email and password</strong><span>{emailLinked?(emailVerified?'Linked · email verified':'Linked · email unverified'):'Not configured'}</span></div>
      {emailLinked && !emailVerified && <div className="account-linking-actions"><button type="button" disabled={busy} onClick={()=>void resendVerification()}>Resend verification</button><button type="button" disabled={busy} onClick={()=>void refreshVerification()}>Check status</button></div>}
    </div>
    {!emailLinked && <details className="account-linking-email-details"><summary>Set up email and password</summary><form className="account-linking-form" onSubmit={event=>{event.preventDefault();void linkEmail();}}>
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} disabled={!canLink} required /></label>
      <label>Password<input type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} disabled={!canLink} minLength={6} required /></label>
      <button type="submit" disabled={!canLink}>{busy?'Verifying…':'Link email and password'}</button>
    </form></details>}
    {!canLinkAdditionalProvider(authMethod) && <p className="account-linking-note">Sign in with this account’s passkey to link another method. Linking requires fresh private verification.</p>}
    {status && <p className="account-linking-status" role="status">{status}</p>}
    {error && <p className="account-linking-error" role="alert">{error}</p>}
    <p className="account-linking-note">Verification emails confirm the email address. Account activity notifications are sent separately to the LuLu team.</p>
  </section>;
}
