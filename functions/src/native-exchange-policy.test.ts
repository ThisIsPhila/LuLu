import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ApiError } from './policy.js';
import { generateAuthenticationOptions, generateRegistrationOptions } from '@simplewebauthn/server';
import { assertExchangeProof, assertExchangeRedeemable, assertExchangeState, isNativeOperation, isNativeOpaqueValue, storedWebAuthnOptions, type NativeExchangeBinding } from './native-exchange-policy.js';

test('real login and registration options can be persisted without Firestore-rejected undefined fields', async () => {
  const login = await generateAuthenticationOptions({ rpID: 'lulu.thisisphila.co.za', userVerification: 'required' });
  const registration = await generateRegistrationOptions({ rpName: 'LuLu', rpID: 'lulu.thisisphila.co.za', userID: new TextEncoder().encode('synthetic'), userName: 'synthetic' });
  function assertDefined(value: unknown): void {
    assert.notEqual(value, undefined);
    if (value && typeof value === 'object') for (const child of Object.values(value)) assertDefined(child);
  }
  for (const options of [login, registration]) {
    const stored = storedWebAuthnOptions(options);
    assertDefined(stored);
    assert.deepEqual(stored, JSON.parse(JSON.stringify(options)));
    assert.equal(stored.challenge, options.challenge);
  }
});

const state = 's'.repeat(43);
const proof = 'p'.repeat(43);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const exchange: NativeExchangeBinding = {
  requestId: 'b0b9f763-6ea3-42e1-b921-68d938feaf49', stateHash: digest(state), proofHash: digest(proof),
  operation: 'login', status: 'complete', expiresAt: 500,
};

test('native request tokens and operations are tightly validated', () => {
  assert.equal(isNativeOpaqueValue(state), true);
  assert.equal(isNativeOpaqueValue('short'), false);
  assert.equal(isNativeOperation('stepup'), true);
  assert.equal(isNativeOperation('google-login'), true);
  assert.equal(isNativeOperation('delete'), false);
});

test('exchange state must match and remain unexpired', () => {
  assert.doesNotThrow(() => assertExchangeState(exchange, state, 499));
  assert.throws(() => assertExchangeState(exchange, 'x'.repeat(43), 499), ApiError);
  assert.throws(() => assertExchangeState(exchange, state, 500), ApiError);
});

test('proof is bound to the initiating request and expected operation', () => {
  assert.doesNotThrow(() => assertExchangeProof(exchange, proof, exchange.requestId, 'login'));
  assert.throws(() => assertExchangeProof(exchange, proof, 'another-request', 'login'), ApiError);
  assert.throws(() => assertExchangeProof(exchange, proof, exchange.requestId, 'stepup'), ApiError);
  assert.throws(() => assertExchangeProof(exchange, 'x'.repeat(43), exchange.requestId, 'login'), ApiError);
  const googleExchange = { ...exchange, operation: 'google-login' as const };
  assert.doesNotThrow(() => assertExchangeProof(googleExchange, proof, exchange.requestId, 'google-login'));
  assert.throws(() => assertExchangeProof(googleExchange, proof, exchange.requestId, 'login'), ApiError);
});

test('only completed or same-proof redeemed exchanges may be returned before expiry', () => {
  assert.doesNotThrow(() => assertExchangeRedeemable(exchange, 499));
  assert.doesNotThrow(() => assertExchangeRedeemable({ ...exchange, status: 'redeemed' }, 499));
  for (const status of ['pending', 'challenge', 'cancelled'] as const) {
    assert.throws(() => assertExchangeRedeemable({ ...exchange, status }, 499), ApiError);
  }
  assert.throws(() => assertExchangeRedeemable(exchange, 500), ApiError);
});
