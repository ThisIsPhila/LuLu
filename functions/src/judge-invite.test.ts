import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeInviteDigest, isJudgeInviteActive } from './judge-invite.js';

test('invitation digests require the full opaque token', () => {
  const token = 'a'.repeat(43);
  assert.match(judgeInviteDigest(token), /^[a-f0-9]{64}$/);
  assert.notEqual(judgeInviteDigest(token), token);
  for (const value of ['', 'a'.repeat(42), 'a'.repeat(44), '../bad', null]) assert.throws(() => judgeInviteDigest(value));
});

test('only an explicitly enabled invitation is accepted', () => {
  assert.equal(isJudgeInviteActive({enabled: true}), true);
  for (const value of [null, {}, {enabled: false}, {enabled: 'true'}, []]) assert.equal(isJudgeInviteActive(value), false);
});
