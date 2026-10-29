/** Policy arithmetic only. Server-side transactional enforcement and UI are
 * required before this can control any live feature. */
export interface JudgeAllowancePolicy {
  refillCredits: number;
  maxCredits: number;
  refillCooldownMs: number;
  accessDurationMs: number;
}
export interface JudgeAllowance {
  credits: number;
  lastRefillAt: number | null;
  expiresAt: number;
  revoked: boolean;
}
export type RefillResult =
  | { ok: true; allowance: JudgeAllowance }
  | { ok: false; reason: 'revoked' | 'cooldown'; retryAt?: number };
export type VoiceReservationResult =
  | {ok:true;allowance:JudgeAllowance;reservedSeconds:number}
  | {ok:false;reason:'revoked'|'expired'|'empty'|'invalid'};

export function refillJudgeAllowance(previous: JudgeAllowance | null, policy: JudgeAllowancePolicy, now: number): RefillResult {
  if (![policy.refillCredits, policy.maxCredits, policy.refillCooldownMs, policy.accessDurationMs, now].every(Number.isSafeInteger)
    || policy.refillCredits <= 0 || policy.maxCredits <= 0 || policy.refillCooldownMs < 0 || policy.accessDurationMs <= 0 || now < 0) {
    throw new Error('Invalid judge allowance policy.');
  }
  if (previous?.revoked) return {ok: false, reason: 'revoked'};
  if (previous && (!Number.isSafeInteger(previous.credits) || previous.credits < 0 || !Number.isSafeInteger(previous.expiresAt)
    || (previous.lastRefillAt !== null && (!Number.isSafeInteger(previous.lastRefillAt) || previous.lastRefillAt < 0)))) {
    throw new Error('Invalid judge allowance.');
  }
  if (previous?.lastRefillAt != null && now < previous.lastRefillAt + policy.refillCooldownMs) {
    return {ok: false, reason: 'cooldown', retryAt: previous.lastRefillAt + policy.refillCooldownMs};
  }
  const current = previous && previous.expiresAt > now ? previous.credits : 0;
  return {ok: true, allowance: {credits: Math.min(policy.maxCredits, current + policy.refillCredits), lastRefillAt: now, expiresAt: now + policy.accessDurationMs, revoked: false}};
}

/** Reserve voice seconds before opening a paid live session. */
export function reserveJudgeVoice(allowance: JudgeAllowance | null, requestedSeconds: number, now: number): VoiceReservationResult {
  if (!Number.isSafeInteger(requestedSeconds) || requestedSeconds <= 0 || !Number.isSafeInteger(now) || now < 0) return {ok:false,reason:'invalid'};
  if (!allowance || !Number.isSafeInteger(allowance.credits) || allowance.credits < 0 || !Number.isSafeInteger(allowance.expiresAt)) return {ok:false,reason:'empty'};
  if (allowance.revoked) return {ok:false,reason:'revoked'};
  if (allowance.expiresAt <= now) return {ok:false,reason:'expired'};
  const reservedSeconds = Math.min(requestedSeconds, allowance.credits);
  if (reservedSeconds <= 0) return {ok:false,reason:'empty'};
  return {ok:true,reservedSeconds,allowance:{...allowance,credits:allowance.credits-reservedSeconds}};
}

/** Charge connected time in whole seconds and return unused reserved time. */
export function settleJudgeVoice(
  allowance: JudgeAllowance,
  reservedSeconds: number,
  startedAt: number,
  endedAt: number,
  maxCredits: number,
): {allowance:JudgeAllowance;chargedSeconds:number;refundedSeconds:number} {
  if (![allowance.credits,reservedSeconds,startedAt,endedAt,maxCredits].every(Number.isSafeInteger)
    || allowance.credits < 0 || reservedSeconds < 0 || startedAt < 0 || endedAt < startedAt || maxCredits < 0) throw new Error('Invalid voice reservation.');
  const chargedSeconds = Math.min(reservedSeconds, Math.ceil((endedAt-startedAt)/1000));
  const refundedSeconds = reservedSeconds-chargedSeconds;
  return {allowance:{...allowance,credits:Math.min(maxCredits,allowance.credits+refundedSeconds)},chargedSeconds,refundedSeconds};
}
