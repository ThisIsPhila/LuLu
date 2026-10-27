type RestorableSession = { uid?: unknown; expiresAt?: unknown };

/** A persisted Firebase identity is accepted only when the backend session belongs to it and is still live. */
export function isRestorableWebSession(session: RestorableSession, firebaseUid: string, now = Date.now()): boolean {
  return session.uid === firebaseUid
    && Number.isSafeInteger(session.expiresAt)
    && (session.expiresAt as number) > now;
}

/** Only a passkey-authenticated session can begin linking another sign-in method. */
export function canLinkAdditionalProvider(authMethod: unknown): boolean {
  return authMethod === 'passkey';
}

export function hasActivePasskeyLinkAuthority(session: RestorableSession & {authMethod?:unknown;privateUntil?:unknown}, firebaseUid:string, now=Date.now()):boolean {
  return session.uid===firebaseUid
    && canLinkAdditionalProvider(session.authMethod)
    && Number.isSafeInteger(session.expiresAt)
    && (session.expiresAt as number)>now
    && Number.isSafeInteger(session.privateUntil)
    && (session.privateUntil as number)>now;
}
