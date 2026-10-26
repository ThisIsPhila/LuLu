// Creates only transient challenge/exchange records; never creates an account or
// requests a user's passkey. Every created exchange is cancelled in finally.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['scripts/firebase-guard.mjs'], { stdio: 'inherit' });
const endpoint = 'https://africa-south1-khora-lulu-2026.cloudfunctions.net/api';
const hostedOrigins = ['https://khora-lulu-2026.web.app', 'https://lulu.thisisphila.co.za'];
async function post(route, origin, body = {}) {
  const response = await fetch(endpoint + route, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

for (const nativeOrigin of ['capacitor://localhost', 'https://localhost']) {
  const binding = { requestId: randomUUID(), state: randomBytes(32).toString('base64url'), proof: randomBytes(32).toString('base64url'), operation: 'login' };
  const created = await post('/native/exchange/create', nativeOrigin, binding);
  assert.equal(created.status, 200, `${nativeOrigin} create`);
  const exchangeId = created.body.exchangeId;
  try {
    const original = await post('/native/exchange/options', hostedOrigins[0], { exchangeId, state: binding.state });
    assert.equal(original.status, 200, 'hosted passkey options');
    assert.equal(original.body.options.rpId, new URL(hostedOrigins[0]).hostname);
    assert.equal(original.body.operation, 'login');
    const retried = await post('/native/exchange/options', hostedOrigins[0], { exchangeId, state: binding.state });
    assert.equal(retried.status, 200);
    assert.equal(retried.body.challengeId, original.body.challengeId, 'same-origin retry reuses challenge');
    const alternate = await post('/native/exchange/options', hostedOrigins[1], { exchangeId, state: binding.state });
    assert.equal(alternate.status, 200, 'public website passkey options');
    assert.equal(alternate.body.options.rpId, new URL(hostedOrigins[1]).hostname);
    assert.notEqual(alternate.body.challengeId, original.body.challengeId, 'origin change issues fresh challenge');
    const superseded = await post('/native/exchange/complete', hostedOrigins[0], { exchangeId, state: binding.state, challengeId: original.body.challengeId });
    assert.equal(superseded.status, 409, 'superseded challenge cannot complete');
    const unreconciled = await post('/native/exchange/redeem', nativeOrigin, { ...binding, exchangeId });
    assert.equal(unreconciled.status, 409, 'unverified exchange cannot redeem');
  } finally {
    const cancelled = await post('/native/exchange/cancel', nativeOrigin, { ...binding, exchangeId });
    assert.equal(cancelled.status, 200, 'synthetic exchange cleanup');
  }
  const session = await post('/session', nativeOrigin);
  assert.equal(session.status, 401, 'native session reaches authentication, not origin rejection');
  assert.equal(session.headers.get('access-control-allow-origin'), nativeOrigin);
  const forbidden = await post('/native/exchange/options', nativeOrigin);
  assert.equal(forbidden.status, 403, 'WebAuthn stays hosted');
  console.log(`${nativeOrigin}: challenge, origin binding, replay rejection, cleanup and session origin PASS`);
}
assert.equal((await post('/session', 'https://untrusted.example')).status, 403);
console.log('Untrusted origin remains rejected. No account or passkey was created.');
