import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { createUserWithEmailAndPassword, EmailAuthProvider, GoogleAuthProvider, linkWithCredential, linkWithPopup, sendEmailVerification, sendPasswordResetEmail, signInWithCustomToken, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, authReady } from './firebase';
import { request, BackendRequestError } from './request';
import { hasActivePasskeyLinkAuthority, isRestorableWebSession } from './sessionRestorePolicy';
import { beginNativeAuthentication, resumeNativeAuthentication, restoreNativeSession } from '../../platform/nativeAuth';
import { isNativePlatform } from '../../platform/runtime';

export type AppSession = { uid: string; expiresAt: number; privateUntil: number; authMethod?: 'passkey'|'email'|'google'; emailVerificationStatus?: 'sent'|'failed'; resumePrivate?: boolean };
export { BackendRequestError, request } from './request';
export type AccountLinkAuthority = Readonly<{uid:string;privateUntil:number}>;
const verifiedLinkAuthorities = new WeakSet<object>();

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
  if (create) {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    let emailVerificationStatus: 'sent'|'failed' = 'sent';
    try { await sendEmailVerification(credential.user); }
    catch { emailVerificationStatus = 'failed'; }
    return {...await finishProviderSignIn(), emailVerificationStatus};
  }
  else await signInWithEmailAndPassword(auth, normalizedEmail, password);
  return finishProviderSignIn();
}
export async function requestEmailPasswordReset(email: string): Promise<void> {
  await authReady;
  const normalizedEmail=email.trim();
  if (!normalizedEmail) throw new Error('Enter the email address for the account.');
  await sendPasswordResetEmail(auth, normalizedEmail);
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
export async function restoreWebAppSession(): Promise<AppSession|null> {
  await authReady;
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const session = await request<AppSession>('/session');
    if (!isRestorableWebSession(session, user.uid)) {
      await signOut(auth);
      return null;
    }
    const locked = await request<{success?:boolean}>('/auth/lock');
    if (locked.success !== true) throw new Error('LuLu could not confirm that the private session was locked.');
    return {...session,privateUntil:0};
  } catch (error) {
    if (error instanceof BackendRequestError && (error.status === 401 || error.status === 403)) {
      await signOut(auth);
      return null;
    }
    throw error;
  }
}
export async function linkGoogleAccount(expectedUid: string, authority: AccountLinkAuthority): Promise<void> {
  assertLinkAuthority(expectedUid,authority);
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid) throw new Error('The active account changed. Sign in again before linking a provider.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  await linkWithPopup(user, provider);
  if (auth.currentUser?.uid !== expectedUid || !auth.currentUser.providerData.some(provider => provider.providerId === 'google.com')) {
    throw new Error('Google did not finish linking to this account. Please check the sign-in methods and try again.');
  }
  await verifyLinkedSession(expectedUid);
}
export async function linkEmailAccount(expectedUid: string, email: string, password: string): Promise<'sent'|'failed'> {
  await authReady;
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid) throw new Error('The active account changed. Sign in again before linking a provider.');
  const authority=await assertAccountLinkAuthority(expectedUid);
  assertLinkAuthority(expectedUid,authority);
  const credential = EmailAuthProvider.credential(email.trim(), password);
  const linked = await linkWithCredential(user, credential);
  if (linked.user.uid !== expectedUid || !linked.user.providerData.some(provider => provider.providerId === 'password')) {
    throw new Error('Email and password did not finish linking to this account. Please check the sign-in methods and try again.');
  }
  await verifyLinkedSession(expectedUid);
  try { await sendEmailVerification(linked.user); return 'sent'; }
  catch { return 'failed'; }
}
export async function resendEmailVerification(expectedUid: string): Promise<'sent'|'failed'> {
  await authReady;
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid || !user.email || user.emailVerified) throw new Error('Email verification is not available for the active account.');
  try { await sendEmailVerification(user); return 'sent'; }
  catch { return 'failed'; }
}
async function verifyLinkedSession(expectedUid: string): Promise<void> {
  try { await assertAccountLinkAuthority(expectedUid); }
  catch { throw new Error('The provider linked, but LuLu could not confirm this passkey session. Sign in again before continuing.'); }
}
export async function assertAccountLinkAuthority(expectedUid: string): Promise<AccountLinkAuthority> {
  const session=await request<AppSession>('/session');
  if (!hasActivePasskeyLinkAuthority(session,expectedUid)) {
    throw new Error('Verify this LuLu account with its passkey before linking another sign-in method.');
  }
  const authority=Object.freeze({uid:session.uid,privateUntil:session.privateUntil});
  verifiedLinkAuthorities.add(authority);
  return authority;
}
function assertLinkAuthority(expectedUid:string, authority:AccountLinkAuthority):void {
  if (!authority || !verifiedLinkAuthorities.has(authority) || authority.uid!==expectedUid || !Number.isSafeInteger(authority.privateUntil) || authority.privateUntil<=Date.now()) {
    throw new Error('Verify this LuLu account with its passkey before linking another sign-in method.');
  }
}
export async function logout() {
  try { await request('/auth/logout'); }
  finally { await signOut(auth); }
}
export async function lockPrivate(tokenOverride?: string) { await request('/auth/lock', {}, tokenOverride); }
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
