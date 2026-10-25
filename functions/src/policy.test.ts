import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertChallenge, assertSession, canOfferRegistrationSignInRecovery, documentId, failureDiagnostic, mintBeforePersist, withCompensation, type Challenge} from './policy.js';
const valid: Challenge = {challenge:'random-challenge',kind:'stepup',uid:'user',sid:'session',origin:'https://example.test',rpID:'example.test',expiresAt:200,used:false};
test('challenge rejects expiry, replay, changed origin and changed purpose',()=>{
  assert.doesNotThrow(()=>assertChallenge(valid,'stepup',valid.origin,100));
  for(const data of [undefined,{...valid,used:true},{...valid,expiresAt:100},{...valid,kind:'login' as const},{...valid,origin:'https://attacker.test'}]) assert.throws(()=>assertChallenge(data,'stepup',valid.origin,100));
});
test('sessions reject other owners, expiry and expired private access',()=>{
  const s={uid:'user',expiresAt:200,privateUntil:120};
  assert.doesNotThrow(()=>assertSession(s,'user',100,true));
  assert.throws(()=>assertSession(s,'other',100));
  assert.throws(()=>assertSession(s,'user',200));
  assert.throws(()=>assertSession(s,'user',120,true));
  assert.doesNotThrow(()=>assertSession(s,'user',120));
});
test('document paths cannot escape their collection',()=>{
  assert.equal(documentId('entry_123-ABC'),'entry_123-ABC');
  for(const v of ['', '../other', 'a/b', {}, undefined]) assert.throws(()=>documentId(v));
});
test('registration user-creation failure attempts credential cleanup and preserves the original failure',async()=>{
  const original = Object.assign(new Error('sensitive message must not be logged'), {code:'auth/uid-already-exists'});
  let cleanupCalls = 0;
  await assert.rejects(
    withCompensation(async()=>{throw original;}, async()=>{cleanupCalls++;}),
    error=>{
      const diagnostic = failureDiagnostic('/auth/register/verify','create-auth-user',error);
      assert.deepEqual(diagnostic,{route:'/auth/register/verify',stage:'create-auth-user',code:'auth/uid-already-exists',name:'Error',cleanupFailed:false});
      assert.equal('message' in diagnostic,false);
      return true;
    },
  );
  assert.equal(cleanupCalls,1);
});
test('credential cleanup failure is recorded without replacing or exposing the original error',async()=>{
  const original = Object.assign(new Error('private operation details'), {code:'permission-denied'});
  await assert.rejects(
    withCompensation(async()=>{throw original;}, async()=>{throw new Error('cleanup details');}),
    error=>{
      assert.deepEqual(failureDiagnostic('/auth/register/verify','create-auth-user',error),{route:'/auth/register/verify',stage:'create-auth-user',code:'permission-denied',name:'Error',cleanupFailed:true});
      return true;
    },
  );
});
test('failure diagnostics allow only known routes, stages, codes, and error names',()=>{
  const unsafe = Object.assign(new Error('token or credential material'),{name:'CredentialError secret',code:'private-value'});
  assert.deepEqual(failureDiagnostic('/auth/register/verify?token=secret','reveal-stack',unsafe),{route:'unknown',stage:'unknown',code:'unknown',name:'Error'});
});
test('session persistence is skipped when custom-token minting fails',async()=>{
  let persistCalls = 0;
  const cause = Object.assign(new Error('sensitive signer details'),{code:'auth/insufficient-permission'});
  await assert.rejects(
    mintBeforePersist(async()=>{throw cause;},async()=>{persistCalls++;}),
    error=>{
      assert.deepEqual(failureDiagnostic('/auth/register/verify','mint-token',error),{route:'/auth/register/verify',stage:'mint-token',code:'auth/insufficient-permission',name:'Error'});
      return true;
    },
  );
  assert.equal(persistCalls,0);
});
test('registration recovery is offered only after both the passkey and account are available',()=>{
  assert.equal(canOfferRegistrationSignInRecovery(false,false),false);
  assert.equal(canOfferRegistrationSignInRecovery(true,false),false);
  assert.equal(canOfferRegistrationSignInRecovery(false,true),false);
  assert.equal(canOfferRegistrationSignInRecovery(true,true),true);
});
