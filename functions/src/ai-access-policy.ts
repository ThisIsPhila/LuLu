export type AiRequestKind = 'decisions' | 'luMessages';
export type AiAccountLimits = { decisionsPerDay: number | null; luMessagesPerDay: number | null; voiceSecondsPerDay: number };

export const DEFAULT_AI_ACCOUNT_LIMITS: AiAccountLimits = {
  decisionsPerDay: null,
  luMessagesPerDay: null,
  voiceSecondsPerDay: 300,
};

export function readAiAccountLimits(value: unknown): AiAccountLimits {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const readRequestLimit = (candidate: unknown) => candidate === null || candidate === undefined
    ? null
    : Number.isSafeInteger(candidate) && (candidate as number) >= 0 && (candidate as number) <= 100_000 ? candidate as number : 0;
  const voiceCandidate = record.voiceSecondsPerDay;
  const voiceSecondsPerDay = Number.isSafeInteger(voiceCandidate) && (voiceCandidate as number) >= 0 && (voiceCandidate as number) <= 3_600
    ? voiceCandidate as number : voiceCandidate === undefined ? DEFAULT_AI_ACCOUNT_LIMITS.voiceSecondsPerDay : 0;
  return {
    decisionsPerDay: readRequestLimit(record.decisionsPerDay),
    luMessagesPerDay: readRequestLimit(record.luMessagesPerDay),
    voiceSecondsPerDay,
  };
}

export function quotaUsage(limit: number | null, used: number): { allowed: boolean; nextUsed: number; remaining: number | null } {
  if (!Number.isSafeInteger(used) || used < 0 || (limit !== null && (!Number.isSafeInteger(limit) || limit < 0))) {
    throw new Error('Invalid AI usage counter.');
  }
  if (limit === null) return { allowed: true, nextUsed: used + 1, remaining: null };
  if (used >= limit) return { allowed: false, nextUsed: used, remaining: 0 };
  const nextUsed = used + 1;
  return { allowed: true, nextUsed, remaining: limit - nextUsed };
}
