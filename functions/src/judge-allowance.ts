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
