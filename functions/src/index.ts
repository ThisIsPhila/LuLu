import { randomUUID, createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { ApiError, assertChallenge, assertSession, canOfferRegistrationSignInRecovery, documentId, failureDiagnostic, mintBeforePersist, withCompensation, CHALLENGE_TTL, SESSION_TTL, PRIVATE_TTL, type Challenge, type FailureStage } from './policy.js';
import { assertExchangeProof, assertExchangeRedeemable, assertExchangeState, isNativeOpaqueValue, isNativeOperation, storedWebAuthnOptions, type NativeOperation } from './native-exchange-policy.js';
import { browserOrigins as origins, nativeOrigins, isAllowedApiOrigin } from './origin-policy.js';
import { configuredProvider, privacyCapability, validateReviewedPrivacyRequest } from './privacy-processing.js';
import { judgeInviteDigest, isJudgeInviteActive } from './judge-invite.js';
import { mayReadAccountActivity } from './owner-notifications.js';
import { processAccountAlerts } from './account-alerts.js';
import { scrubForLu, respondAsLu, LU_LANGUAGES } from './lu-chat.js';
import { createLuLiveSession } from './lu-live.js';
import { refillJudgeAllowance, type JudgeAllowance } from './judge-allowance.js';

const judgeVoicePolicy = {refillCredits: 300, maxCredits: 300, refillCooldownMs: 24 * 60 * 60_000, accessDurationMs: 24 * 60 * 60_000};

initializeApp();
const db = getFirestore();
const identity = getAuth();
const knownRoutes = new Set(['/auth/register/options', '/auth/register/verify', '/auth/login/options', '/auth/login/verify', '/auth/stepup/options', '/auth/stepup/verify', '/auth/provider/session', '/auth/lock', '/auth/logout', '/session', '/judge/redeem', '/judge/access', '/owner/account-activity', '/lu/scrub', '/lu/chat', '/lu/live', '/privacy/capability', '/privacy/understand', '/native/exchange/create', '/native/exchange/options', '/native/exchange/complete', '/native/exchange/provider-complete', '/native/exchange/redeem', '/native/exchange/cancel']);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sessions = db.collection('_sessions');
const challenges = db.collection('_challenges');
const credentials = db.collection('_credentials');
const nativeExchanges = db.collection('_nativeExchanges');
type Session = {uid: string; expiresAt: number; privateUntil: number; authMethod?: 'passkey'|'email'|'google'};
type NativeExchange = {requestId:string; stateHash:string; proofHash:string; operation:NativeOperation; uid:string|null; sid:string|null; status:'pending'|'challenge'|'complete'|'redeemed'|'cancelled'; expiresAt:number; challengeId?:string; challengeOrigin?:string; challengeOptions?:unknown; customToken?:string; privateUntil?:number; purgeAfter:Timestamp};
const nativeTtl = 5 * 60_000;

async function sessionFor(header: string | undefined, requirePrivate = false, requirePasskey = false) {
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Please sign in.');
  let token;
  try { token = await identity.verifyIdToken(header.slice(7), true); }
  catch { throw new ApiError(401, 'Please sign in again.'); }
  const passkeySession = token.passkey === true;
  if (typeof token.sid !== 'string' || !(passkeySession || token.luluSession === true)) throw new ApiError(401, 'Please sign in again.');
  if (requirePasskey && !passkeySession) throw new ApiError(403, 'A passkey is required to open private writing.');
  const sid = documentId(token.sid);
  const snap = await sessions.doc(sid).get();
  const session = snap.data() as Session | undefined;
  assertSession(session, token.uid, Date.now(), requirePrivate);
  return {...session!, authMethod:session!.authMethod ?? (passkeySession ? 'passkey' : undefined), uid: token.uid, sid};
}
async function requireLuAiAccess(uid: string) {
  const user = await identity.getUser(uid);
  if (mayReadAccountActivity(user)) return;
  const access = (await db.collection('_judgeAccess').doc(uid).get()).data();
  if (!access || access.enabled !== true || typeof access.inviteDigest !== 'string') throw new ApiError(403, 'Full Lu AI access requires a judge invitation.');
  const invitation = (await db.collection('_judgeInvites').doc(access.inviteDigest).get()).data();
  if (!isJudgeInviteActive(invitation)) throw new ApiError(403, 'This judge invitation is no longer active.');
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
async function issueSession(uid: string, setStage: (stage: FailureStage) => void, authMethod: 'passkey'|'email'|'google' = 'passkey') {
  const sid = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL;
  const customToken = await mintBeforePersist(
    () => { setStage('mint-token'); return identity.createCustomToken(uid, {sid, luluSession: true, authMethod, ...(authMethod === 'passkey' ? {passkey: true} : {})}); },
    () => { setStage('persist-session'); return sessions.doc(sid).create({uid, expiresAt, privateUntil: 0, authMethod, purgeAfter: Timestamp.fromMillis(expiresAt)}); },
  );
  // Keep account access available even if the email provider is unavailable.
  // The queue retries during later sign-ins. ACCOUNT_ALERTS_START_MS and the
  // server-only RESEND_API_KEY must be configured before this can send.
  try {
    const cutoff=Number(process.env.ACCOUNT_ALERTS_START_MS);
    if(process.env.ACCOUNT_ALERTS_START_MS && process.env.RESEND_API_KEY && Number.isFinite(cutoff)) {
      const user=await identity.getUser(uid);
      await processAccountAlerts(db,uid,user.metadata.creationTime,cutoff,process.env.RESEND_API_KEY);
    }
  } catch { console.error(JSON.stringify({event:'account-alert-queue-failed'})); }
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

/** Lu demo privacy processing accepts user-submitted text; private mappings and biometrics are never accepted. */
export const api = onRequest({region: 'africa-south1', memory: '256MiB', maxInstances: 2, minInstances: 0, concurrency: 10, timeoutSeconds: 30, invoker: 'public', secrets: ['OPENAI_API_KEY', 'RESEND_API_KEY']}, async (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.set('X-Content-Type-Options', 'nosniff');
  const origin = request.get('origin') || '';
  const rawRoute = request.path.replace(/^\/api/, '');
  const route = knownRoutes.has(rawRoute) ? rawRoute : 'unknown';
  if (!isAllowedApiOrigin(origin, route)) { response.status(403).json({error:'This origin is not allowed.'}); return; }
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
      if (!['register','login','stepup'].includes(exchange.operation)) throw new ApiError(400, 'This authentication request does not use a passkey.');
      if (exchange.status !== 'pending' && exchange.status !== 'challenge') throw new ApiError(409, 'This authentication request is no longer active.');
      if (exchange.challengeOptions && exchange.challengeId && exchange.challengeOrigin === origin) {
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
      // A user may explicitly choose the other trusted LuLu hostname where their
      // passkey was created. Issue a new origin-bound challenge for that browser;
      // completion still rejects every previously superseded challenge ID.
      await ref.update({status:'challenge', challengeId, challengeOrigin:origin, challengeOptions:storedWebAuthnOptions(options), ...(kind === 'register' && !exchange.uid ? {uid} : {})});
      response.json({options, challengeId, operation:kind}); return;
    }
    if (route === '/native/exchange/complete') {
      if (!origins.has(origin)) throw new ApiError(403, 'This origin is not allowed.');
      const {ref:exchangeRef, exchange} = await loadNativeExchange(body.exchangeId, body.state);
      if (exchange.status !== 'challenge' || exchange.challengeId !== body.challengeId) throw new ApiError(409, 'This authentication request is no longer active.');
      if (!['register','login','stepup'].includes(exchange.operation)) throw new ApiError(400, 'This authentication request does not use a passkey.');
      const kind = exchange.operation as Challenge['kind'];
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
    if (route === '/native/exchange/provider-complete') {
      if (!origins.has(origin)) throw new ApiError(403, 'This origin is not allowed.');
      const {ref, exchange} = await loadNativeExchange(body.exchangeId, body.state);
      if (exchange.operation !== 'google-login' || exchange.status !== 'pending') {
        throw new ApiError(409, 'This authentication request is no longer active.');
      }
      if (typeof body.idToken !== 'string' || body.idToken.length > 12_000) throw new ApiError(400, 'The sign-in response is invalid.');
      const decoded = await identity.verifyIdToken(body.idToken, true);
      const provider = (decoded.firebase as {sign_in_provider?: string} | undefined)?.sign_in_provider;
      const method = provider === 'password' ? 'email' : provider === 'google.com' ? 'google' : null;
      if (!method || method !== 'google') {
        throw new ApiError(401, 'Use the sign-in method requested by LuLu.');
      }
      const customToken = (await issueSession(decoded.uid, next => {stage = next;}, method)).customToken;
      await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        const value = current.data() as NativeExchange | undefined;
        if (!value || value.status !== 'pending' || value.expiresAt <= Date.now() || value.operation !== exchange.operation) {
          throw new ApiError(409, 'This authentication request is no longer active.');
        }
        tx.update(ref, {status:'complete', uid:decoded.uid, customToken});
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
    if (route === '/auth/provider/session') {
      const authorization = request.get('authorization');
      if (!authorization?.startsWith('Bearer ')) throw new ApiError(401, 'Please sign in first.');
      const decoded = await identity.verifyIdToken(authorization.slice(7), true);
      const provider = (decoded.firebase as {sign_in_provider?: string} | undefined)?.sign_in_provider;
      const method = provider === 'password' ? 'email' : provider === 'google.com' ? 'google' : null;
      if (!method) throw new ApiError(401, 'Use email or Google to sign in.');
      response.json(await issueSession(decoded.uid, next => {stage = next;}, method)); return;
    }
    stage = 'session-lookup';
    const current = await sessionFor(request.get('authorization'));
    if (route === '/lu/live') {
      // Owner-only until server-side judge voice allowance is enforced.
      const user = await identity.getUser(current.uid);
      if (!mayReadAccountActivity(user)) throw new ApiError(403, 'Live voice is currently available to the owner for testing.');
      if (Object.keys(body).join(',') !== 'offer' || typeof body.offer !== 'string' || !body.offer.trim() || body.offer.length > 20000) throw new ApiError(400, 'Invalid voice connection.');
      if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Live voice is not configured.');
      try { response.json(await createLuLiveSession(process.env.OPENAI_API_KEY, body.offer)); }
      catch { throw new ApiError(502, 'Could not connect live voice. Please try again.'); }
      return;
    }
    if (route === '/lu/scrub') {
      await requireLuAiAccess(current.uid);
      if (Object.keys(body).length !== 1 || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4000) throw new ApiError(400, 'Enter text of up to 4,000 characters.');
      if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Cloud privacy processing is not configured.');
      const scrubbed = await scrubForLu(process.env.OPENAI_API_KEY, body.text);
      if (scrubbed === '[unable to safely scrub]') throw new ApiError(422, 'The text could not be prepared safely. Please edit it and try again.');
      const ticket = randomUUID();
      await db.collection('_luReviews').doc(hash(ticket)).create({uid:current.uid, textHash:hash(scrubbed), expiresAt:Date.now()+10*60_000});
      response.json({scrubbed, ticket}); return;
    }
    if (route === '/lu/chat') {
      await requireLuAiAccess(current.uid);
      if (Object.keys(body).sort().join(',') !== 'language,text,ticket' || typeof body.text !== 'string' || body.text.length > 12000 || typeof body.ticket !== 'string' || !/^[0-9a-f-]{36}$/.test(body.ticket) || !LU_LANGUAGES.includes(body.language)) throw new ApiError(400, 'Invalid reviewed chat request.');
      const ref=db.collection('_luReviews').doc(hash(body.ticket));
      await db.runTransaction(async transaction => {
        const review=await transaction.get(ref); const data=review.data();
        if (!data || data.uid!==current.uid || data.expiresAt<=Date.now() || data.textHash!==hash(body.text)) throw new ApiError(403, 'Review the prepared text again before sending.');
        transaction.delete(ref);
      });
      if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Lu chat is not configured.');
      const reply=await respondAsLu(process.env.OPENAI_API_KEY,body.text,body.language);
      response.json({reply}); return;
    }
    if (route === '/owner/account-activity') {
      if (Object.keys(body).length !== 0) throw new ApiError(400, 'Invalid request.');
      const owner = await identity.getUser(current.uid);
      if (!mayReadAccountActivity(owner)) {
        response.json({owner:false}); return;
      }
      const accounts: {createdAt:string; email:string|null; signInMethods:string[]}[] = [];
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const page = await identity.listUsers(1000, pageToken);
        for (const user of page.users) {
          if (user.uid === current.uid) continue;
          accounts.push({createdAt:user.metadata.creationTime, email:user.email ?? null, signInMethods:user.providerData.map(provider => provider.providerId)});
        }
        pageToken = page.pageToken;
      } while (pageToken && ++pages < 10);
      accounts.sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
      response.json({owner:true, accounts:accounts.slice(0,50), truncated: Boolean(pageToken)}); return;
    }
    if (route === '/judge/redeem') {
      if (Object.keys(body).length !== 1 || !Object.hasOwn(body, 'invitation')) throw new ApiError(400, 'Invalid invitation.');
      let digest: string;
      try { digest = judgeInviteDigest(body.invitation); }
      catch { throw new ApiError(400, 'Invalid invitation.'); }
      const inviteRef = db.collection('_judgeInvites').doc(digest);
      const accessRef = db.collection('_judgeAccess').doc(current.uid);
      const result = await db.runTransaction(async transaction => {
        const [invite, access] = await Promise.all([transaction.get(inviteRef), transaction.get(accessRef)]);
        if (!invite.exists || !isJudgeInviteActive(invite.data())) throw new ApiError(403, 'This invitation is not active.');
        const data = access.data();
        if (data?.enabled === false) throw new ApiError(403, 'This account no longer has judge access.');
        const previous = data?.voiceAllowance as JudgeAllowance | undefined;
        const refill = refillJudgeAllowance(previous ?? null, judgeVoicePolicy, Date.now());
        if (!refill.ok) {
          if (refill.reason === 'revoked') throw new ApiError(403, 'This account no longer has judge access.');
          return {judgeAccess: true, voiceAllowance: previous ?? null, refillAvailableAt: refill.retryAt};
        }
        transaction.set(accessRef, {enabled:true, role:'judge', inviteDigest:digest, voiceAllowance:refill.allowance, ...(access.exists ? {} : {createdAt:Timestamp.now()})}, {merge:true});
        return {judgeAccess:true, voiceAllowance:refill.allowance, refillAvailableAt:refill.allowance.lastRefillAt! + judgeVoicePolicy.refillCooldownMs};
      });
      response.json(result); return;
    }
    if (route === '/judge/access') {
      if (Object.keys(body).length !== 0) throw new ApiError(400, 'Invalid request.');
      const access = await db.collection('_judgeAccess').doc(current.uid).get();
      const data = access.data();
      const allowance = data?.voiceAllowance as JudgeAllowance | undefined;
      response.json({judgeAccess:access.exists && data?.enabled === true, voiceAllowance:allowance ?? null, refillAvailableAt:allowance?.lastRefillAt == null ? null : allowance.lastRefillAt + judgeVoicePolicy.refillCooldownMs}); return;
    }
    if (route === '/privacy/capability') {
      if (Object.keys(body).length !== 0) throw new ApiError(400, 'Invalid request.');
      const provider = configuredProvider(process.env, process.env.OPENAI_API_KEY);
      response.json(privacyCapability(provider)); return;
    }
    if (route === '/privacy/understand') {
      stage = 'privacy-processing';
      const privateSession = await sessionFor(request.get('authorization'), true, true);
      let reviewed;
      try { reviewed = validateReviewedPrivacyRequest(body); }
      catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid privacy request.'); }
      const provider = configuredProvider(process.env, process.env.OPENAI_API_KEY);
      if (!provider.enabled) throw new ApiError(503, 'Privacy understanding is not configured.');
      try {
        const result = await provider.understand(reviewed, AbortSignal.timeout(8_000));
        const stillPrivate = await sessionFor(request.get('authorization'), true, true);
        if (stillPrivate.sid !== privateSession.sid || stillPrivate.uid !== privateSession.uid) throw new ApiError(403, 'Please verify your passkey again.');
        response.json(result); return;
      } catch {
        // Do not convert an authority change into a provider failure.
        try { await sessionFor(request.get('authorization'), true, true); }
        catch { throw new ApiError(403, 'Please verify your passkey again.'); }
        throw new ApiError(502, 'Privacy understanding could not be completed.');
      }
    }
    if (route === '/session') { response.json({uid:current.uid,expiresAt:current.expiresAt,privateUntil:current.privateUntil,authMethod:current.authMethod}); return; }
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
