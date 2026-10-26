import { randomUUID, createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { ApiError, assertChallenge, assertSession, canOfferRegistrationSignInRecovery, documentId, failureDiagnostic, mintBeforePersist, withCompensation, CHALLENGE_TTL, SESSION_TTL, PRIVATE_TTL, type Challenge, type FailureStage } from './policy.js';
import { assertExchangeProof, assertExchangeRedeemable, assertExchangeState, isNativeOpaqueValue, isNativeOperation, type NativeOperation } from './native-exchange-policy.js';

initializeApp();
const db = getFirestore();
const identity = getAuth();
const origins = new Set(['https://khora-lulu-2026.web.app', 'https://khora-lulu-2026.firebaseapp.com', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const nativeOrigins = new Set(['capacitor://localhost', 'https://localhost']);
const knownRoutes = new Set(['/auth/register/options', '/auth/register/verify', '/auth/login/options', '/auth/login/verify', '/auth/stepup/options', '/auth/stepup/verify', '/auth/lock', '/auth/logout', '/session', '/native/exchange/create', '/native/exchange/options', '/native/exchange/complete', '/native/exchange/redeem', '/native/exchange/cancel']);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sessions = db.collection('_sessions');
const challenges = db.collection('_challenges');
const credentials = db.collection('_credentials');
const nativeExchanges = db.collection('_nativeExchanges');
type Session = {uid: string; expiresAt: number; privateUntil: number};
type NativeExchange = {requestId:string; stateHash:string; proofHash:string; operation:NativeOperation; uid:string|null; sid:string|null; status:'pending'|'challenge'|'complete'|'redeemed'|'cancelled'; expiresAt:number; challengeId?:string; challengeOptions?:unknown; customToken?:string; privateUntil?:number; purgeAfter:Timestamp};
const nativeTtl = 5 * 60_000;

async function sessionFor(header: string | undefined, requirePrivate = false) {
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Please sign in.');
  let token;
  try { token = await identity.verifyIdToken(header.slice(7), true); }
  catch { throw new ApiError(401, 'Please sign in again.'); }
  if (token.passkey !== true || typeof token.sid !== 'string') throw new ApiError(401, 'Please verify your passkey.');
  const sid = documentId(token.sid);
  const snap = await sessions.doc(sid).get();
  const session = snap.data() as Session | undefined;
  assertSession(session, token.uid, Date.now(), requirePrivate);
  return {...session!, uid: token.uid, sid};
}
async function limitRequest(ip: string) {
  const bucket = Math.floor(Date.now() / 900_000);
  const ref = db.collection('_rateLimits').doc(hash(`${ip}:${bucket}`));
  await db.runTransaction(async tx => {
    const record = await tx.get(ref);
    const count = record.data()?.count ?? 0;
    if (count >= 60) throw new ApiError(429, 'Please wait before trying again.');
    tx.set(ref, {count: count + 1, expiresAt: Timestamp.fromMillis((bucket + 2) * 900_000)});
  });
}
async function takeChallenge(id: unknown, kind: Challenge['kind'], origin: string): Promise<Challenge> {
  const ref = challenges.doc(documentId(id));
  return db.runTransaction(async tx => {
    const record = await tx.get(ref);
    const challenge = record.data() as Challenge | undefined;
    assertChallenge(challenge, kind, origin, Date.now());
    tx.update(ref, {used: true});
    return challenge!;
  });
}
async function issueSession(uid: string, setStage: (stage: FailureStage) => void) {
  const sid = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL;
  const customToken = await mintBeforePersist(
    () => { setStage('mint-token'); return identity.createCustomToken(uid, {sid, passkey: true}); },
    () => { setStage('persist-session'); return sessions.doc(sid).create({uid, expiresAt, privateUntil: 0, purgeAfter: Timestamp.fromMillis(expiresAt)}); },
  );
  return {customToken, expiresAt};
}
async function loadNativeExchange(id: unknown, state: unknown) {
  const ref = nativeExchanges.doc(documentId(id));
  const snapshot = await ref.get();
  const exchange = snapshot.data() as NativeExchange | undefined;
  if (!exchange || !isNativeOperation(exchange.operation)) {
    throw new ApiError(401, 'This authentication request has expired. Please try again.');
  }
  assertExchangeState(exchange, state, Date.now());
  return {ref, exchange};
}

/** No original journal text, private mappings or biometrics are accepted by this API. */
export const api = onRequest({region: 'africa-south1', memory: '256MiB', maxInstances: 2, minInstances: 0, concurrency: 10, timeoutSeconds: 30, invoker: 'public'}, async (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.set('X-Content-Type-Options', 'nosniff');
  const origin = request.get('origin') || '';
  const rawRoute = request.path.replace(/^\/api/, '');
  const route = knownRoutes.has(rawRoute) ? rawRoute : 'unknown';
  const nativeOnlyRoute = route === '/native/exchange/create' || route === '/native/exchange/redeem' || route === '/native/exchange/cancel';
  if (!origins.has(origin) && !(nativeOnlyRoute && nativeOrigins.has(origin))) { response.status(403).json({error:'This origin is not allowed.'}); return; }
  response.set('Access-Control-Allow-Origin', origin);
  response.set('Vary', 'Origin');
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).json({error:'Use POST.'}); return; }
  if (!request.is('application/json') || Buffer.byteLength(JSON.stringify(request.body ?? {})) > 24_000) { response.status(400).json({error:'Invalid request.'}); return; }
  const body = request.body || {};
  const rpID = origins.has(origin) ? new URL(origin).hostname : '';
  let stage: FailureStage = 'request-validation';
  let registrationCredentialPersisted = false;
  let registrationAccountAvailable = false;
  try {
    if (rawRoute.startsWith('/auth/') || rawRoute.startsWith('/native/exchange/')) { stage = 'rate-limit'; await limitRequest(request.ip || 'unknown'); }
    if (route === '/native/exchange/create') {
      if (!nativeOrigins.has(origin) || !isNativeOperation(body.operation) || !isNativeOpaqueValue(body.state) || !isNativeOpaqueValue(body.proof) ||
          typeof body.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.requestId)) throw new ApiError(400, 'Invalid authentication request.');
      let current: Awaited<ReturnType<typeof sessionFor>> | null = null;
      const authorization = request.get('authorization');
      if (body.operation === 'stepup') current = await sessionFor(authorization);
      else if (body.operation === 'register' && authorization) current = await sessionFor(authorization, true);
      const exchangeId = randomUUID();
      const expiresAt = Date.now() + nativeTtl;
      await nativeExchanges.doc(exchangeId).create({
        requestId: body.requestId, stateHash: hash(body.state), proofHash: hash(body.proof), operation: body.operation,
        uid: current?.uid ?? null, sid: current?.sid ?? null, status: 'pending', expiresAt,
        purgeAfter: Timestamp.fromMillis(expiresAt),
      } satisfies NativeExchange);
      response.json({exchangeId, expiresAt}); return;
    }
    if (route === '/native/exchange/options') {
      if (!origins.has(origin)) throw new ApiError(403, 'This origin is not allowed.');
      const {ref, exchange} = await loadNativeExchange(body.exchangeId, body.state);
      if (exchange.status !== 'pending' && exchange.status !== 'challenge') throw new ApiError(409, 'This authentication request is no longer active.');
      if (exchange.challengeOptions && exchange.challengeId) {
        response.json({options: exchange.challengeOptions, challengeId: exchange.challengeId, operation: exchange.operation}); return;
      }
      if (exchange.operation === 'stepup' && (!exchange.uid || !exchange.sid)) throw new ApiError(401, 'Please sign in again.');
      const kind = exchange.operation;
      const uid = kind === 'register' ? exchange.uid ?? randomUUID() : exchange.uid;
      const options = kind === 'register'
        ? await generateRegistrationOptions({rpName:'LuLu', rpID, userID:new TextEncoder().encode(uid!), userName:`LuLu ${uid!.slice(0,8)}`, attestationType:'none', authenticatorSelection:{residentKey:'required',userVerification:'required'}})
        : await generateAuthenticationOptions({rpID,userVerification:'required'});
      const challengeId = randomUUID();
      const expiresAt = Math.min(exchange.expiresAt, Date.now() + CHALLENGE_TTL);
      await challenges.doc(challengeId).create({challenge:options.challenge,kind,uid,sid:exchange.sid,origin,rpID,expiresAt,used:false,exchangeId:body.exchangeId});
      await ref.update({status:'challenge', challengeId, challengeOptions:options, ...(kind === 'register' && !exchange.uid ? {uid} : {})});
      response.json({options, challengeId, operation:kind}); return;
    }
    if (route === '/native/exchange/complete') {
      if (!origins.has(origin)) throw new ApiError(403, 'This origin is not allowed.');
      const {ref:exchangeRef, exchange} = await loadNativeExchange(body.exchangeId, body.state);
      if (exchange.status !== 'challenge' || exchange.challengeId !== body.challengeId) throw new ApiError(409, 'This authentication request is no longer active.');
      const kind = exchange.operation;
      const challenge = await takeChallenge(body.challengeId, kind, origin) as Challenge & {exchangeId?:string};
      if (challenge.exchangeId !== body.exchangeId || challenge.uid !== exchange.uid || challenge.sid !== exchange.sid) throw new ApiError(401, 'This authentication request is not valid.');
      let customToken: string | undefined;
      let privateUntil: number | undefined;
      if (kind === 'register') {
        if (!challenge.uid) throw new ApiError(401, 'Invalid registration.');
        let result;
        try { result = await verifyRegistrationResponse({response:body.response as RegistrationResponseJSON,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:challenge.rpID,requireUserVerification:true}); }
        catch { throw new ApiError(401,'Passkey could not be verified. Please try again.'); }
        if (!result.verified || !result.registrationInfo) throw new ApiError(401,'Passkey verification failed.');
        const credential = result.registrationInfo.credential;
        const credentialRef = credentials.doc(hash(credential.id));
        await db.runTransaction(async tx => {
          if ((await tx.get(credentialRef)).exists) throw new ApiError(409,'This passkey is already registered.');
          tx.create(credentialRef,{uid:challenge.uid,id:credential.id,publicKey:Buffer.from(credential.publicKey).toString('base64'),counter:credential.counter,transports:credential.transports ?? [],createdAt:Timestamp.now()});
        });
        if (!challenge.sid) await withCompensation(() => identity.createUser({uid:challenge.uid!}).then(() => undefined), () => credentialRef.delete());
        customToken = (await issueSession(challenge.uid, next => {stage = next;})).customToken;
      } else {
        const assertion = body.response as AuthenticationResponseJSON;
        if (typeof assertion?.id !== 'string' || assertion.id.length > 2000) throw new ApiError(401,'Passkey verification failed.');
        const credentialRef = credentials.doc(hash(assertion.id));
        const credentialSnap = await credentialRef.get();
        const credential = credentialSnap.data();
        if (!credential || (challenge.uid && credential.uid !== challenge.uid)) throw new ApiError(401,'Passkey verification failed.');
        let result;
        try { result = await verifyAuthenticationResponse({response:assertion,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:challenge.rpID,requireUserVerification:true,credential:{id:credential.id,publicKey:new Uint8Array(Buffer.from(credential.publicKey,'base64')),counter:credential.counter,transports:credential.transports as AuthenticatorTransportFuture[]}}); }
        catch { throw new ApiError(401,'Passkey could not be verified. Please try again.'); }
        if (!result.verified) throw new ApiError(401,'Passkey verification failed.');
        await db.runTransaction(async tx => {
          const currentCredential = await tx.get(credentialRef);
          if (!currentCredential.exists || currentCredential.data()?.counter !== credential.counter) throw new ApiError(409,'Passkey state changed. Please try again.');
          tx.update(credentialRef,{counter:result.authenticationInfo.newCounter,lastUsedAt:Timestamp.now()});
        });
        if (kind === 'stepup') {
          if (!exchange.uid || !exchange.sid) throw new ApiError(401,'Please sign in again.');
          const sessionRef = sessions.doc(documentId(exchange.sid));
          const sessionSnapshot = await sessionRef.get();
          const current = sessionSnapshot.data() as Session | undefined;
          assertSession(current, exchange.uid, Date.now());
          privateUntil = Date.now() + PRIVATE_TTL;
          await sessionRef.update({privateUntil});
        } else {
          customToken = (await issueSession(credential.uid, next => {stage = next;})).customToken;
        }
      }
      await db.runTransaction(async tx => {
        const current = await tx.get(exchangeRef);
        const value = current.data() as NativeExchange | undefined;
        if (!value || value.status !== 'challenge' || value.challengeId !== body.challengeId || value.expiresAt <= Date.now()) throw new ApiError(409, 'This authentication request is no longer active.');
        tx.update(exchangeRef,{status:'complete', ...(customToken ? {customToken} : {}), ...(privateUntil ? {privateUntil} : {})});
      });
      response.json({success:true}); return;
    }
    if (route === '/native/exchange/redeem') {
      if (!nativeOrigins.has(origin)) throw new ApiError(403, 'This origin is not allowed.');
      const {ref, exchange} = await loadNativeExchange(body.exchangeId, body.state);
      assertExchangeProof(exchange, body.proof, body.requestId, body.operation);
      let result: {customToken?:string;privateUntil?:number};
      await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const current = snapshot.data() as NativeExchange | undefined;
        if (!current || !isNativeOperation(current.operation)) throw new ApiError(401, 'This authentication request has expired. Please try again.');
        assertExchangeState(current, body.state, Date.now());
        assertExchangeProof(current, body.proof, body.requestId, body.operation);
        assertExchangeRedeemable(current, Date.now());
        if (current.status === 'redeemed') {
          result = { ...(current.customToken ? {customToken:current.customToken} : {}), ...(current.privateUntil ? {privateUntil:current.privateUntil} : {}) };
          return;
        }
        if (current.status !== 'complete') throw new ApiError(409, 'Authentication has not completed.');
        tx.update(ref,{status:'redeemed'});
        result = { ...(current.customToken ? {customToken:current.customToken} : {}), ...(current.privateUntil ? {privateUntil:current.privateUntil} : {}) };
      });
      response.json(result!); return;
    }
    if (route === '/native/exchange/cancel') {
      if (!nativeOrigins.has(origin)) throw new ApiError(403, 'This origin is not allowed.');
      const {ref, exchange} = await loadNativeExchange(body.exchangeId, body.state);
      assertExchangeProof(exchange, body.proof, body.requestId, body.operation);
      if (exchange.status === 'pending' || exchange.status === 'challenge') await ref.update({status:'cancelled',challengeOptions:null});
      response.json({success:true}); return;
    }
    if (route === '/auth/register/options') {
      stage = 'register-options';
      const existing = request.get('authorization') ? await sessionFor(request.get('authorization'), true) : null;
      const uid = existing?.uid ?? randomUUID();
      const options = await generateRegistrationOptions({rpName:'LuLu', rpID, userID:new TextEncoder().encode(uid), userName:`LuLu ${uid.slice(0,8)}`, attestationType:'none', authenticatorSelection:{residentKey:'required',userVerification:'required'}});
      const challengeId = randomUUID();
      await challenges.doc(challengeId).create({challenge:options.challenge, kind:'register',uid,sid:existing?.sid ?? null,origin,rpID,expiresAt:Date.now()+CHALLENGE_TTL,used:false,purgeAfter:Timestamp.fromMillis(Date.now()+CHALLENGE_TTL)});
      response.json({options,challengeId}); return;
    }
    if (route === '/auth/register/verify') {
      stage = 'verify-registration';
      const challenge = await takeChallenge(body.challengeId, 'register', origin);
      if (!challenge.uid) throw new ApiError(401,'Invalid registration.');
      const registrationUid = challenge.uid;
      if (challenge.sid) {
        const existing = await sessionFor(request.get('authorization'), true);
        if (existing.uid !== challenge.uid || existing.sid !== challenge.sid) throw new ApiError(401,'Registration session changed.');
      }
      let result;
      try { result = await verifyRegistrationResponse({response:body.response as RegistrationResponseJSON,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:challenge.rpID,requireUserVerification:true}); }
      catch { throw new ApiError(401,'Passkey could not be verified. Please try again.'); }
      if (!result.verified || !result.registrationInfo) throw new ApiError(401,'Passkey verification failed.');
      const credential = result.registrationInfo.credential;
      const ref = credentials.doc(hash(credential.id));
      stage = 'persist-credential';
      await db.runTransaction(async tx => {
        if ((await tx.get(ref)).exists) throw new ApiError(409,'This passkey is already registered.');
        tx.create(ref,{uid:registrationUid,id:credential.id,publicKey:Buffer.from(credential.publicKey).toString('base64'),counter:credential.counter,transports:credential.transports ?? [],createdAt:Timestamp.now()});
      });
      registrationCredentialPersisted = true;
      if (!challenge.sid) {
        stage = 'create-auth-user';
        await withCompensation(() => identity.createUser({uid:registrationUid}).then(() => undefined), () => ref.delete());
      }
      registrationAccountAvailable = true;
      response.json(await issueSession(registrationUid, next => {stage = next;})); return;
    }
    if (route === '/auth/login/options' || route === '/auth/stepup/options') {
      stage = route.includes('stepup') ? 'login-options' : 'login-options';
      const kind = route.includes('stepup') ? 'stepup' : 'login';
      const current = kind === 'stepup' ? await sessionFor(request.get('authorization')) : null;
      const options = await generateAuthenticationOptions({rpID,userVerification:'required'});
      const challengeId = randomUUID();
      await challenges.doc(challengeId).create({challenge:options.challenge,kind,uid:current?.uid ?? null,sid:current?.sid ?? null,origin,rpID,expiresAt:Date.now()+CHALLENGE_TTL,used:false,purgeAfter:Timestamp.fromMillis(Date.now()+CHALLENGE_TTL)});
      response.json({options,challengeId}); return;
    }
    if (route === '/auth/login/verify' || route === '/auth/stepup/verify') {
      stage = 'verify-authentication';
      const kind = route.includes('stepup') ? 'stepup' : 'login';
      const challenge = await takeChallenge(body.challengeId, kind, origin);
      const assertion = body.response as AuthenticationResponseJSON;
      if (typeof assertion?.id !== 'string' || assertion.id.length > 2000) throw new ApiError(401,'Passkey verification failed.');
      const ref = credentials.doc(hash(assertion.id));
      const snap = await ref.get();
      const credential = snap.data();
      if (!credential || (challenge.uid && credential.uid !== challenge.uid)) throw new ApiError(401,'Passkey verification failed.');
      let result;
      try { result = await verifyAuthenticationResponse({response:assertion, expectedChallenge:challenge.challenge, expectedOrigin:origin, expectedRPID:challenge.rpID, requireUserVerification:true, credential:{id:credential.id,publicKey:new Uint8Array(Buffer.from(credential.publicKey,'base64')),counter:credential.counter,transports:credential.transports as AuthenticatorTransportFuture[]}}); }
      catch { throw new ApiError(401,'Passkey could not be verified. Please try again.'); }
      if (!result.verified) throw new ApiError(401,'Passkey verification failed.');
      await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (!current.exists || current.data()?.counter !== credential.counter) throw new ApiError(409,'Passkey state changed. Please try again.');
        stage = 'persist-counter';
        tx.update(ref,{counter:result.authenticationInfo.newCounter,lastUsedAt:Timestamp.now()});
      });
      if (kind === 'stepup') {
        stage = 'update-session';
        const current = await sessionFor(request.get('authorization'));
        if (current.uid !== challenge.uid || current.sid !== challenge.sid) throw new ApiError(401,'Session changed.');
        const privateUntil = Date.now()+PRIVATE_TTL;
        await sessions.doc(current.sid).update({privateUntil});
        response.json({privateUntil}); return;
      }
      response.json(await issueSession(credential.uid, next => {stage = next;})); return;
    }
    stage = 'session-lookup';
    const current = await sessionFor(request.get('authorization'));
    if (route === '/session') { response.json({uid:current.uid,expiresAt:current.expiresAt,privateUntil:current.privateUntil}); return; }
    if (route === '/auth/lock') { await sessions.doc(current.sid).update({privateUntil:0}); response.json({success:true}); return; }
    if (route === '/auth/logout') { await sessions.doc(current.sid).delete(); response.json({success:true}); return; }
    response.status(404).json({error:'Unknown operation.'});
  } catch (error) {
    // Log only fixed routes/stages and allowlisted error metadata; never log request data, messages, tokens or stacks.
    const diagnostic = failureDiagnostic(route, stage, error);
    console.error(JSON.stringify({message: 'API request failed', severity: 'ERROR', ...diagnostic}));
    const status = error instanceof ApiError ? error.status : 500;
    response.status(status).json({
      error: error instanceof ApiError ? error.message : 'The service could not complete this request. Please try again.',
      ...(canOfferRegistrationSignInRecovery(registrationCredentialPersisted, registrationAccountAvailable) ? {recoveryAction: 'sign-in'} : {}),
    });
  }
});
