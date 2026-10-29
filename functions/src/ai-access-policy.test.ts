import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_AI_ACCOUNT_LIMITS, quotaUsage, readAiAccountLimits } from './ai-access-policy.js';

test('AI access defaults to unlimited Decisions and Lu text with five voice minutes', () => {
  assert.deepEqual(readAiAccountLimits(undefined), DEFAULT_AI_ACCOUNT_LIMITS);
});

test('daily caps are per account and enforced only when configured', () => {
  assert.deepEqual(quotaUsage(null, 90_000), {allowed:true,nextUsed:90_001,remaining:null});
  assert.deepEqual(quotaUsage(2, 1), {allowed:true,nextUsed:2,remaining:0});
  assert.deepEqual(quotaUsage(2, 2), {allowed:false,nextUsed:2,remaining:0});
});

test('invalid stored caps fail closed and voice allowance remains bounded', () => {
  assert.deepEqual(readAiAccountLimits({decisionsPerDay:-1,luMessagesPerDay:'unlimited',voiceSecondsPerDay:99_999}), {decisionsPerDay:0,luMessagesPerDay:0,voiceSecondsPerDay:0});
  assert.equal(readAiAccountLimits({voiceSecondsPerDay:0}).voiceSecondsPerDay, 0);
});
