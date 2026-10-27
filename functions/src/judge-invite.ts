import { createHash } from 'node:crypto';

/** The shared invitation is a 256-bit bearer token; Firestore holds only its digest. */
export function judgeInviteDigest(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error('Invalid invitation.');
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function isJudgeInviteActive(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) && (value as {enabled?: unknown}).enabled === true;
}
