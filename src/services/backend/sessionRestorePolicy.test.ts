import test from 'node:test';
import assert from 'node:assert/strict';
import { canLinkAdditionalProvider, hasActivePasskeyLinkAuthority, isRestorableWebSession } from './sessionRestorePolicy.ts';

test('web restoration requires matching UID and a future integer expiry', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRestorableWebSession({uid:'user-1',expiresAt:now+1},'user-1',now),true);
  assert.equal(isRestorableWebSession({uid:'user-2',expiresAt:now+1},'user-1',now),false);
  assert.equal(isRestorableWebSession({uid:'user-1',expiresAt:now},'user-1',now),false);
  assert.equal(isRestorableWebSession({uid:'user-1',expiresAt:'later'},'user-1',now),false);
  assert.equal(isRestorableWebSession({uid:'user-1',expiresAt:Infinity},'user-1',now),false);
});

test('only passkey sessions can initiate account linking', () => {
  assert.equal(canLinkAdditionalProvider('passkey'),true);
  assert.equal(canLinkAdditionalProvider('email'),false);
  assert.equal(canLinkAdditionalProvider('google'),false);
  assert.equal(canLinkAdditionalProvider(undefined),false);
});

test('account linking needs a live passkey session and live private step-up', () => {
  const now=1_800_000_000_000;
  const session={uid:'user-1',authMethod:'passkey',expiresAt:now+10_000,privateUntil:now+5_000};
  assert.equal(hasActivePasskeyLinkAuthority(session,'user-1',now),true);
  assert.equal(hasActivePasskeyLinkAuthority({...session,authMethod:'email'},'user-1',now),false);
  assert.equal(hasActivePasskeyLinkAuthority({...session,privateUntil:now},'user-1',now),false);
  assert.equal(hasActivePasskeyLinkAuthority({...session,expiresAt:now},'user-1',now),false);
  assert.equal(hasActivePasskeyLinkAuthority(session,'other',now),false);
});
