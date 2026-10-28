import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedApiOrigin } from './origin-policy.js';

test('both native shells can finish, restore, lock and close an authenticated session', () => {
  for (const origin of ['capacitor://localhost', 'https://localhost']) {
    for (const route of ['/session', '/auth/lock', '/auth/logout', '/auth/provider/session', '/native/exchange/create', '/native/exchange/redeem', '/native/exchange/cancel']) {
      assert.equal(isAllowedApiOrigin(origin, route), true, `${origin} ${route}`);
    }
  }
});

test('native and untrusted origins cannot perform hosted WebAuthn ceremonies', () => {
  for (const origin of ['capacitor://localhost', 'https://localhost', 'https://untrusted.example', '']) {
    for (const route of ['/auth/login/options', '/auth/register/verify', '/native/exchange/options', '/native/exchange/complete']) {
      assert.equal(isAllowedApiOrigin(origin, route), false, `${origin} ${route}`);
    }
  }
  assert.equal(isAllowedApiOrigin('https://untrusted.example', '/session'), false);
  assert.equal(isAllowedApiOrigin('capacitor://localhost', 'unknown'), false);
  assert.equal(isAllowedApiOrigin('https://lulu.thisisphila.co.za', '/native/exchange/options'), true);
});

test('native apps can reach privacy endpoints without opening them to unrelated origins', () => {
  for (const origin of ['capacitor://localhost', 'https://localhost']) {
    assert.equal(isAllowedApiOrigin(origin, '/privacy/capability'), true);
    assert.equal(isAllowedApiOrigin(origin, '/privacy/understand'), true);
    assert.equal(isAllowedApiOrigin(origin, '/lu/live/action'), true);
  }
  assert.equal(isAllowedApiOrigin('https://untrusted.example', '/privacy/capability'), false);
  assert.equal(isAllowedApiOrigin('https://untrusted.example', '/privacy/understand'), false);
});
