export const CHALLENGE_TTL = 5 * 60_000;
export const SESSION_TTL = 12 * 60 * 60_000;
export const PRIVATE_TTL = 10 * 60_000;
export type Challenge = { challenge: string; kind: 'register' | 'login' | 'stepup'; uid: string | null; sid: string | null; origin: string; rpID: string; expiresAt: number; used: boolean; exchangeId?: string };
export type FailureStage = 'request-validation' | 'rate-limit' | 'register-options' | 'login-options' | 'verify-registration' | 'persist-credential' | 'create-auth-user' | 'mint-token' | 'persist-session' | 'verify-authentication' | 'persist-counter' | 'update-session' | 'session-lookup' | 'unknown';
export type FailureRoute = '/auth/register/options' | '/auth/register/verify' | '/auth/login/options' | '/auth/login/verify' | '/auth/stepup/options' | '/auth/stepup/verify' | '/auth/lock' | '/auth/logout' | '/session' | 'unknown';

const failureRoutes = new Set<FailureRoute>(['/auth/register/options', '/auth/register/verify', '/auth/login/options', '/auth/login/verify', '/auth/stepup/options', '/auth/stepup/verify', '/auth/lock', '/auth/logout', '/session', 'unknown']);
const failureStages = new Set<FailureStage>(['request-validation', 'rate-limit', 'register-options', 'login-options', 'verify-registration', 'persist-credential', 'create-auth-user', 'mint-token', 'persist-session', 'verify-authentication', 'persist-counter', 'update-session', 'session-lookup', 'unknown']);
const safeErrorCodes = new Set(['auth/insufficient-permission', 'auth/invalid-credential', 'auth/internal-error', 'auth/uid-already-exists', 'auth/user-not-found', 'auth/network-request-failed', 'auth/invalid-uid', '7', 'permission-denied', 'PERMISSION_DENIED', 'unavailable', 'deadline-exceeded', 'unknown']);
const safeErrorNames = new Set(['Error', 'FirebaseError', 'FirebaseAuthError', 'GoogleError', 'ApiError', 'TypeError']);

export type FailureDiagnostic = {route: FailureRoute; stage: FailureStage; code: string; name: string; cleanupFailed?: boolean};
export function canOfferRegistrationSignInRecovery(credentialPersisted: boolean, accountAvailable: boolean): boolean {
  return credentialPersisted && accountAvailable;
}
export class CompensatedFailure extends Error {
  constructor(public readonly originalError: unknown, public readonly cleanupFailed: boolean) {
    super('Operation failed.');
    this.name = 'Error';
  }
}

/** Preserve the operation failure while attempting its compensating cleanup. */
export async function withCompensation<T>(operation: () => Promise<T>, compensate: () => Promise<unknown>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    let cleanupFailed = false;
    try { await compensate(); } catch { cleanupFailed = true; }
    throw new CompensatedFailure(error, cleanupFailed);
  }
}

/** Minting a token must succeed before a server session record is persisted. */
export async function mintBeforePersist<T>(mint: () => Promise<T>, persist: () => Promise<unknown>): Promise<T> {
  const token = await mint();
  await persist();
  return token;
}

/** Return only bounded, non-message diagnostics suitable for server logs. */
export function failureDiagnostic(route: string, stage: string, error: unknown): FailureDiagnostic {
  const safeRoute = failureRoutes.has(route as FailureRoute) ? route as FailureRoute : 'unknown';
  const safeStage = failureStages.has(stage as FailureStage) ? stage as FailureStage : 'unknown';
  const wrapped = error instanceof CompensatedFailure ? error : null;
  const cause = wrapped?.originalError ?? error;
  const candidate = cause && typeof cause === 'object' ? cause as {code?: unknown; name?: unknown} : {};
  const code = typeof candidate.code === 'string' && safeErrorCodes.has(candidate.code) ? candidate.code : 'unknown';
  const name = typeof candidate.name === 'string' && safeErrorNames.has(candidate.name) ? candidate.name : 'Error';
  return {route: safeRoute, stage: safeStage, code, name, ...(wrapped ? {cleanupFailed: wrapped.cleanupFailed} : {})};
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assertChallenge(data: Challenge | undefined, kind: Challenge['kind'], origin: string, now: number) {
  if (!data || data.used || data.kind !== kind || data.origin !== origin || data.expiresAt <= now) throw new ApiError(401, 'This request has expired. Please try again.');
}
export function assertSession(data: {uid:string;expiresAt:number;privateUntil?:number} | undefined, uid: string, now: number, requirePrivate = false) {
  if (!data || data.uid !== uid || data.expiresAt <= now) throw new ApiError(401, 'Please sign in again.');
  if (requirePrivate && (data.privateUntil ?? 0) <= now) throw new ApiError(403, 'Please verify your passkey again.');
}
export function documentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw new ApiError(400, 'Invalid request.');
  return value;
}
