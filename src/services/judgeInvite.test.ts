import test from 'node:test';
import assert from 'node:assert/strict';
import { captureJudgeInvitation, clearJudgeInvitation, forgetReusableJudgeInvitation, pendingJudgeInvitation, reusableJudgeInvitation } from './judgeInvite.ts';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
}, configurable: true});
let replaced = '';
Object.defineProperty(globalThis, 'window', {value: {
  location: {pathname: '/', search: '', hash: ''},
  history: {state: null, replaceState: (_state: unknown, _title: string, url: string) => { replaced = url; }},
}, configurable: true});

test('invitation is retained for sign-in while removed from the browser URL', () => {
  const token = 'A'.repeat(43);
  window.location.hash = `#judge=${token}`;
  captureJudgeInvitation();
  assert.equal(replaced, '/');
  assert.equal(pendingJudgeInvitation(), token);
  assert.equal(reusableJudgeInvitation(), token);
  clearJudgeInvitation();
  assert.equal(pendingJudgeInvitation(), '');
  assert.equal(reusableJudgeInvitation(), token);
  forgetReusableJudgeInvitation();
  assert.equal(reusableJudgeInvitation(), '');
});

test('invalid invitations are removed from the URL and never retained', () => {
  forgetReusableJudgeInvitation();
  window.location.hash = '#judge=not-valid';
  captureJudgeInvitation();
  assert.equal(replaced, '/');
  assert.equal(pendingJudgeInvitation(), '');
});
