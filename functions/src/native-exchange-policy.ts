import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiError } from './policy.js';

export type NativeOperation = 'register' | 'login' | 'stepup';
export type NativeExchangeState = 'pending' | 'challenge' | 'complete' | 'redeemed' | 'cancelled';
export type NativeExchangeBinding = {
  requestId: string;
  stateHash: string;
  proofHash: string;
  operation: NativeOperation;
  status: NativeExchangeState;
  expiresAt: number;
};

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const isNativeOperation = (value: unknown): value is NativeOperation => value === 'register' || value === 'login' || value === 'stepup';
export const isNativeOpaqueValue = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);

function equalsHash(expected: unknown, value: string): boolean {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(digest(value), 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function assertExchangeState(exchange: NativeExchangeBinding, state: unknown, now: number): void {
  if (!isNativeOpaqueValue(state) || exchange.expiresAt <= now || !equalsHash(exchange.stateHash, state)) {
    throw new ApiError(401, 'This authentication request has expired. Please try again.');
  }
}

export function assertExchangeProof(exchange: NativeExchangeBinding, proof: unknown, requestId: unknown, operation: unknown): void {
  if (!isNativeOpaqueValue(proof) || typeof requestId !== 'string' || requestId !== exchange.requestId ||
      operation !== exchange.operation || !equalsHash(exchange.proofHash, proof)) {
    throw new ApiError(401, 'This authentication request is not valid.');
  }
}

export function assertExchangeRedeemable(exchange: NativeExchangeBinding, now: number): void {
  if (exchange.expiresAt <= now || (exchange.status !== 'complete' && exchange.status !== 'redeemed')) {
    throw new ApiError(409, 'Authentication has not completed.');
  }
}
