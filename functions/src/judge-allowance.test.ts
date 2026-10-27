import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { refillJudgeAllowance } from './judge-allowance.js';
const policy = {refillCredits: 10, maxCredits: 15, refillCooldownMs: 100, accessDurationMs: 500};
test('refills are capped and cannot be repeated before cooldown', () => {
  const initial = refillJudgeAllowance(null, policy, 1000);
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.deepEqual(refillJudgeAllowance(initial.allowance, policy, 1050), {ok:false,reason:'cooldown',retryAt:1100});
  const second = refillJudgeAllowance(initial.allowance, policy, 1100);
  assert.equal(second.ok && second.allowance.credits, 15);
});
test('revoked accounts remain revoked and expired credits do not carry over', () => {
  const previous = {credits: 8, lastRefillAt: 0, expiresAt: 10, revoked: false};
  const refreshed = refillJudgeAllowance(previous, policy, 1000);
  assert.equal(refreshed.ok && refreshed.allowance.credits, 10);
  assert.deepEqual(refillJudgeAllowance({...previous,revoked:true}, policy, 1000), {ok:false,reason:'revoked'});
});
