import { randomUUID, randomBytes, createHash } from 'node:crypto';
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
import { scrubForLuDetailed, scrubTextsForLu, respondAsLuWithTools, LU_LANGUAGES, type LuAgentAction, type LuAgentHistoryMessage, type LuSurfaceReference } from './lu-chat.js';
import { explicitlyRequestsDestination, explicitlyRequestsDraft, explicitlyRequestsLuDestination, explicitlyRequestsOpen, explicitlyRequestsSurfaceSearch, isJournalAccessCapabilityQuestion, isLuLuScopeRequest, journalAccessCapabilityReply, luNavigationReply, luSurfaceSearchReply, outOfScopeReply, luSearchTerms } from './lu-agent-policy.js';
import { createLuLiveSession } from './lu-live.js';
import { refillJudgeAllowance, reserveJudgeVoice, settleJudgeVoice, type JudgeAllowance } from './judge-allowance.js';
import { assessBehaviourPatterns } from './pattern-intelligence.js';
import { quotaUsage, readAiAccountLimits, type AiRequestKind } from './ai-access-policy.js';

const judgeVoicePolicy = {refillCredits: 300, maxCredits: 300, refillCooldownMs: 24 * 60 * 60_000, accessDurationMs: 24 * 60 * 60_000};

initializeApp();
const db = getFirestore();
const identity = getAuth();
const knownRoutes = new Set(['/auth/register/options', '/auth/register/verify', '/auth/login/options', '/auth/login/verify', '/auth/stepup/options', '/auth/stepup/verify', '/auth/provider/session', '/auth/lock', '/auth/logout', '/session', '/judge/redeem', '/judge/access', '/owner/account-activity', '/owner/ai-access', '/owner/judge-invite', '/lu/scrub', '/lu/chat', '/lu/live', '/lu/live/action', '/lu/live/end', '/privacy/capability', '/privacy/understand', '/privacy/patterns', '/native/exchange/create', '/native/exchange/options', '/native/exchange/complete', '/native/exchange/provider-complete', '/native/exchange/redeem', '/native/exchange/cancel']);
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
  if (!access || access.enabled !== true) throw new ApiError(403, 'Full Lu AI access requires a judge invitation or account grant.');
  if (access.ownerManaged === true) return;
  if (typeof access.inviteDigest !== 'string') throw new ApiError(403, 'Full Lu AI access requires a judge invitation or account grant.');
  const invitation = (await db.collection('_judgeInvites').doc(access.inviteDigest).get()).data();
  if (!isJudgeInviteActive(invitation)) throw new ApiError(403, 'This judge invitation is no longer active.');
}
async function consumeAiQuota(uid:string,kind:AiRequestKind) {
  const user=await identity.getUser(uid);
  if(mayReadAccountActivity(user))return;
  const accessRef=db.collection('_judgeAccess').doc(uid);
  const dayKey=new Date().toISOString().slice(0,10);
  await db.runTransaction(async transaction=>{
    const snapshot=await transaction.get(accessRef);
    const data=snapshot.data();
    if(!data||data.enabled!==true)throw new ApiError(403,'AI access is disabled for this account.');
    const limits=readAiAccountLimits(data);
    const limit=kind==='decisions'?limits.decisionsPerDay:limits.luMessagesPerDay;
    if(limit===null)return;
    const usage=data.usage&&typeof data.usage==='object'?data.usage as Record<string,unknown>:{};
    const used=usage.dayKey===dayKey&&Number.isSafeInteger(usage[kind])?usage[kind] as number:0;
    const next=quotaUsage(limit,used);
    if(!next.allowed)throw new ApiError(429,kind==='decisions'?'This account has reached its daily Decisions allowance.':'This account has reached its daily Lu message allowance.');
    transaction.set(accessRef,{usage:{dayKey,[kind]:next.nextUsed,[kind==='decisions'?'luMessages':'decisions']:usage.dayKey===dayKey&&Number.isSafeInteger(usage[kind==='decisions'?'luMessages':'decisions'])?usage[kind==='decisions'?'luMessages':'decisions']:0}},{merge:true});
  });
}
async function reserveLiveVoiceAccess(uid: string, now: number): Promise<{owner:boolean;reservedSeconds:number;durationSeconds:number;voiceDailyLimit:number}> {
  const user = await identity.getUser(uid);
  if (mayReadAccountActivity(user)) return {owner:true,reservedSeconds:0,durationSeconds:300,voiceDailyLimit:0};
  const accessRef = db.collection('_judgeAccess').doc(uid);
  const reservation = await db.runTransaction(async transaction => {
    const accessSnapshot = await transaction.get(accessRef);
    const access = accessSnapshot.data();
    if (!access || access.enabled !== true) throw new ApiError(403,'AI access is disabled for this account.');
    if (access.ownerManaged !== true) {
      if(typeof access.inviteDigest!=='string')throw new ApiError(403,'Full Lu AI access requires an active judge invitation.');
      const inviteRef = db.collection('_judgeInvites').doc(access.inviteDigest);
      const inviteSnapshot = await transaction.get(inviteRef);
      if (!isJudgeInviteActive(inviteSnapshot.data())) throw new ApiError(403,'This judge invitation is no longer active.');
    }
    const voiceDailyLimit=readAiAccountLimits(access).voiceSecondsPerDay;
    if(voiceDailyLimit===0)throw new ApiError(403,'Live voice is disabled for this account.');
    const allowance = access.voiceAllowance as JudgeAllowance | undefined;
    const result = reserveJudgeVoice(allowance ?? null,voiceDailyLimit,now);
    if (!result.ok) {
      if (result.reason === 'revoked') throw new ApiError(403,'This account no longer has judge voice access.');
      throw new ApiError(429,result.reason === 'expired' ? 'Judge voice time has expired. Reopen the invitation when its refill is available.' : 'Your judge voice time is used. Reopen the invitation when its refill is available.');
    }
    transaction.update(accessRef,{voiceAllowance:result.allowance});
    return {reservedSeconds:result.reservedSeconds,voiceDailyLimit};
  });
  return {owner:false,reservedSeconds:reservation.reservedSeconds,durationSeconds:reservation.reservedSeconds,voiceDailyLimit:reservation.voiceDailyLimit};
}
async function refundUnopenedVoiceReservation(uid:string,reservedSeconds:number) {
  if(reservedSeconds<=0)return;
  const accessRef=db.collection('_judgeAccess').doc(uid);
  await db.runTransaction(async transaction=>{
    const accessSnapshot=await transaction.get(accessRef);
    const data=accessSnapshot.data();
    const allowance=data?.voiceAllowance as JudgeAllowance|undefined;
    if(!allowance||allowance.revoked)return;
    const maximum=readAiAccountLimits(data).voiceSecondsPerDay;
    transaction.update(accessRef,{voiceAllowance:{...allowance,credits:Math.min(maximum,allowance.credits+reservedSeconds)}});
  });
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


async function searchOrdinaryEntries(uid: string, sourceText: string, modelQuery: string, kind: string, apiKey: string) {
  if (!explicitlyRequestsSurfaceSearch(sourceText)) return {output:{error:'Only search saved writing when the user clearly asks to find or discuss it.'},references:[],ids:new Map<string,string>()};
  const requestedKind = kind === 'Journal' || kind === 'Story' ? kind : 'Any';
  const terms = [...new Set([...luSearchTerms(sourceText), ...luSearchTerms(modelQuery)])];
  const snapshot = await db.collection('users').doc(uid).collection('entries').orderBy('createdAt','desc').limit(100).get();
  const candidates = snapshot.docs.flatMap(doc => {
    const data = doc.data();
    // Only explicitly ordinary records are searchable. Missing/true protected flags fail closed.
    if (data.ownerId !== uid || data.protected !== false || (data.kind !== 'Journal' && data.kind !== 'Story') ||
        (requestedKind !== 'Any' && data.kind !== requestedKind) || typeof data.body !== 'string') return [];
    const title = typeof data.title === 'string' ? data.title : '';
    const searchable = `${title}\n${data.body}`.normalize('NFKC').toLocaleLowerCase('und');
    const score = terms.reduce((total, term) => total + (title.toLocaleLowerCase('und').includes(term) ? 3 : searchable.includes(term) ? 1 : 0), 0);
    const createdAt = data.createdAt && typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : 0;
    return [{id:doc.id,kind:data.kind as 'Journal'|'Story',title,body:data.body as string,score,createdAt}];
  });
  const ranked = candidates.filter(item => terms.length === 0 || item.score > 0).sort((a,b) => b.score-a.score || b.createdAt-a.createdAt).slice(0,3);
  const selected: Array<{reference:string;entryId:string;kind:'Journal'|'Story';title:string;excerpt:string}> = [];
  const ids = new Map<string,string>();
  for (const [index,item] of ranked.entries()) {
    const reference = `entry_${index+1}`;
    const bodyLower = item.body.normalize('NFKC').toLocaleLowerCase('und');
    const firstMatch = terms.map(term => bodyLower.indexOf(term)).filter(index => index >= 0).sort((a,b)=>a-b)[0] ?? 0;
    const start = Math.max(0, firstMatch - 350);
    const excerpt = item.body.slice(start, start + 1000);
    selected.push({reference,entryId:item.id,kind:item.kind,title:item.title.slice(0,200),excerpt});
    ids.set(reference,item.id);
  }
  if(selected.length===0)return {output:{matches:[]},references:[],ids};
  // Scrub all matching excerpts together; the response model only receives this sanitized batch.
  const scrubbedBatch=await scrubTextsForLu(apiKey,selected.flatMap(item=>[item.title,item.excerpt]));
  const references:LuSurfaceReference[]=selected.map((item,index)=>({reference:item.reference,entryId:item.entryId,kind:item.kind,title:scrubbedBatch[index*2],content:scrubbedBatch[index*2+1]}));
  for(const item of references)if(item.title==='[unable to safely scrub]'||item.content==='[unable to safely scrub]')ids.delete(item.reference);
  const safeReferences=references.filter(item=>ids.has(item.reference));
  return {output:{matches:safeReferences.map(({reference,kind,title,content})=>({reference,kind,title,content}))},references:safeReferences,ids};
}
async function executeLuTool(uid:string,sourceText:string,call:{name:string;arguments:Record<string,unknown>},apiKey:string,entryIds:Map<string,string>) {
  const args=call.arguments;
  if(call.name==='search_surface_entries'){
    if(typeof args.query!=='string'||args.query.length>300||!['Journal','Story','Any'].includes(args.kind as string))return {output:{error:'Invalid search request.'}};
    const search=await searchOrdinaryEntries(uid,sourceText,args.query,args.kind as string,apiKey);
    for(const [reference,id] of search.ids)entryIds.set(reference,id);
    return {output:search.output,references:search.references};
  }
  if(call.name==='navigate_app'){
    if(typeof args.destination!=='string'||!explicitlyRequestsDestination(sourceText,args.destination))return {output:{error:'Navigate only when the user explicitly requested that destination.'}};
    const action:LuAgentAction={kind:'navigate',destination:args.destination as Extract<LuAgentAction,{kind:'navigate'}>['destination']};
    return {output:{navigated:true,destination:args.destination},action};
  }
  if(call.name==='open_entry'){
    if(typeof args.reference!=='string'||!explicitlyRequestsOpen(sourceText))return {output:{error:'Open an entry only when the user explicitly asks to open or read one.'}};
    const entryId=entryIds.get(args.reference);
    if(!entryId)return {output:{error:'That entry was not found in the current search results.'}};
    const action:LuAgentAction={kind:'open-entry',entryId};
    return {output:{opened:true},action};
  }
  if(call.name==='create_draft'){
    if(!explicitlyRequestsDraft(sourceText)||typeof args.title!=='string'||typeof args.body!=='string'||args.title.length>300||args.body.length>6000||!['Journal','Story'].includes(args.kind as string))return {output:{error:'Create a draft only after an explicit request for a journal or story draft.'}};
    const [title,draftBody]=await scrubTextsForLu(apiKey,[args.title,args.body]);
    if(title==='[unable to safely scrub]'||draftBody==='[unable to safely scrub]')return {output:{error:'The draft could not be safely prepared.'}};
    const entryKind=args.kind as 'Journal'|'Story';
    const action:LuAgentAction={kind:'create-draft',title,body:draftBody,entryKind};
    return {output:{draftPrepared:true,entryKind},action};
  }
  return {output:{error:'That Lu tool is not available.'}};
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
export const api = onRequest({region: 'africa-south1', memory: '256MiB', maxInstances: 2, minInstances: 0, concurrency: 10, timeoutSeconds: 90, invoker: 'public', secrets: ['OPENAI_API_KEY', 'RESEND_API_KEY']}, async (request, response) => {
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
      if (!['offer','history'].every(key=>Object.hasOwn(body,key)) || Object.keys(body).some(key=>!['offer','history'].includes(key)) || typeof body.offer !== 'string' || !body.offer.trim() || body.offer.length > 20000 || !Array.isArray(body.history) || body.history.length>12 || body.history.some((item:unknown)=>!item||typeof item!=='object'||!['You','Lu'].includes((item as {speaker?:unknown}).speaker as string)||typeof (item as {text?:unknown}).text!=='string'||!(item as {text:string}).text.trim()||(item as {text:string}).text.length>2000) || body.history.reduce((sum:number,item:{text:string})=>sum+item.text.length,0)>8000) throw new ApiError(400, 'Invalid voice connection.');
      if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Live voice is not configured.');
      const now=Date.now();
      const reservation=await reserveLiveVoiceAccess(current.uid,now);
      let createdLive:{sessionId:string;answer:string};
      try {
        createdLive=await createLuLiveSession(process.env.OPENAI_API_KEY, body.offer,body.history as Array<{speaker:'You'|'Lu';text:string}>);
        const createdAt=Date.now();
        const expiresAt=createdAt+reservation.durationSeconds*1000;
        await db.collection('_luLiveSessions').doc(hash(createdLive.sessionId)).create({uid:current.uid,sessionId:createdLive.sessionId,createdAt,expiresAt,status:'active',owner:reservation.owner,reservedSeconds:reservation.reservedSeconds,voiceMaximum:reservation.voiceDailyLimit,references:{},purgeAfter:Timestamp.fromMillis(expiresAt+60*60_000)});
        const access=(await db.collection('_judgeAccess').doc(current.uid).get()).data();
        const allowance=access?.voiceAllowance as JudgeAllowance|undefined;
        response.json({...createdLive,expiresAt,voiceSecondsRemaining:reservation.owner?null:allowance?.credits??0,voiceDailyLimit:reservation.owner?null:reservation.voiceDailyLimit});
      } catch {
        await refundUnopenedVoiceReservation(current.uid,reservation.reservedSeconds).catch(()=>{});
        throw new ApiError(502, 'Could not connect live voice. Reserved judge time was returned; please try again.');
      }
      return;
    }
    if(route==='/lu/live/action'){
      await requireLuAiAccess(current.uid);
      if(Object.keys(body).sort().join(',')!=='arguments,name,sessionId,transcript'||typeof body.sessionId!=='string'||!/^live_[A-Za-z0-9_-]{1,120}$/.test(body.sessionId)||typeof body.name!=='string'||typeof body.transcript!=='string'||!body.transcript.trim()||body.transcript.length>4000||!body.arguments||typeof body.arguments!=='object'||Array.isArray(body.arguments))throw new ApiError(400,'Invalid Lu voice action.');
      if(!process.env.OPENAI_API_KEY)throw new ApiError(503,'Lu voice actions are not configured.');
      const sessionRef=db.collection('_luLiveSessions').doc(hash(body.sessionId));
      const snapshot=await sessionRef.get();
      const session=snapshot.data();
      if(!session||session.uid!==current.uid||session.status!=='active'||typeof session.expiresAt!=='number'||session.expiresAt<=Date.now())throw new ApiError(403,'This voice session has ended. Start a new conversation.');
      const referencesData=session.references&&typeof session.references==='object'?session.references as Record<string,unknown>:{};
      const entryIds=new Map<string,string>(Object.entries(referencesData).filter((item):item is [string,string]=>typeof item[1]==='string'));
      const call={name:body.name,arguments:body.arguments as Record<string,unknown>};
      const result=await executeLuTool(current.uid,body.transcript,call,process.env.OPENAI_API_KEY,entryIds);
      if(result.references?.length){await sessionRef.update({references:Object.fromEntries(entryIds)});}
      response.json({output:result.output,action:result.action??null,references:result.references??[]});return;
    }
    if(route==='/lu/live/end'){
      if(Object.keys(body).join(',')!=='sessionId'||typeof body.sessionId!=='string'||!/^live_[A-Za-z0-9_-]{1,120}$/.test(body.sessionId))throw new ApiError(400,'Invalid live session.');
      const sessionRef=db.collection('_luLiveSessions').doc(hash(body.sessionId));
      const ended=await db.runTransaction(async transaction=>{
        const sessionSnapshot=await transaction.get(sessionRef);
        const session=sessionSnapshot.data();
        if(!session||session.uid!==current.uid)throw new ApiError(404,'Live session not found.');
        if(session.status!=='active')return {ended:false,chargedSeconds:session.chargedSeconds??0,refundedSeconds:session.refundedSeconds??0};
        const endedAt=Date.now();
        const startedAt=typeof session.createdAt==='number'?session.createdAt:endedAt;
        let chargedSeconds=0,refundedSeconds=0;
        if(session.owner!==true&&Number.isSafeInteger(session.reservedSeconds)&&session.reservedSeconds>0){
          const accessRef=db.collection('_judgeAccess').doc(current.uid);
          const accessSnapshot=await transaction.get(accessRef);
          const allowance=accessSnapshot.data()?.voiceAllowance as JudgeAllowance|undefined;
          if(allowance&&!allowance.revoked){
            const voiceMaximum=Number.isSafeInteger(session.voiceMaximum)?session.voiceMaximum:judgeVoicePolicy.maxCredits;
            const settled=settleJudgeVoice(allowance,session.reservedSeconds,startedAt,endedAt,voiceMaximum);
            chargedSeconds=settled.chargedSeconds;refundedSeconds=settled.refundedSeconds;
            transaction.update(accessRef,{voiceAllowance:settled.allowance});
          }else chargedSeconds=Math.min(session.reservedSeconds,Math.ceil(Math.max(0,endedAt-startedAt)/1000));
        }
        transaction.update(sessionRef,{status:'ended',endedAt,chargedSeconds,refundedSeconds});
        return {ended:true,chargedSeconds,refundedSeconds};
      });
      response.json(ended);return;
    }
    if (route === '/lu/scrub') {
      await requireLuAiAccess(current.uid);
      if (Object.keys(body).length !== 1 || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4000) throw new ApiError(400, 'Enter text of up to 4,000 characters.');
      await consumeAiQuota(current.uid,'luMessages');
      if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Cloud privacy processing is not configured.');
      const scrubbed = await scrubForLuDetailed(process.env.OPENAI_API_KEY, body.text);
      const ticket = randomUUID();
      await db.collection('_luReviews').doc(hash(ticket)).create({uid:current.uid, sourceHash:hash(body.text), textHash:hash(scrubbed.text), expiresAt:Date.now()+10*60_000});
      response.json({scrubbed:scrubbed.text, entities:scrubbed.entities, ticket}); return;
    }
    if (route === '/lu/chat') {
      await requireLuAiAccess(current.uid);
      if (Object.keys(body).sort().join(',') !== 'history,language,sourceText,text,ticket' || typeof body.text !== 'string' || body.text.length > 12000 || typeof body.sourceText !== 'string' || !body.sourceText.trim() || body.sourceText.length > 4000 || typeof body.ticket !== 'string' || !/^[0-9a-f-]{36}$/.test(body.ticket) || !LU_LANGUAGES.includes(body.language) || !Array.isArray(body.history) || body.history.length>6 || body.history.some((item:unknown)=>!item||typeof item!=='object'||!['user','assistant'].includes((item as {role?:unknown}).role as string)||typeof (item as {text?:unknown}).text!=='string'||!(item as {text:string}).text.trim()||(item as {text:string}).text.length>1200) || body.history.reduce((sum:number,item:{text:string})=>sum+item.text.length,0)>7200) throw new ApiError(400, 'Invalid reviewed chat request.');
      const ref=db.collection('_luReviews').doc(hash(body.ticket));
      await db.runTransaction(async transaction => {
        const review=await transaction.get(ref); const data=review.data();
        if (!data || data.uid!==current.uid || data.expiresAt<=Date.now() || data.textHash!==hash(body.text) || data.sourceHash!==hash(body.sourceText)) throw new ApiError(403, 'Review the prepared text again before sending.');
        transaction.delete(ref);
      });
      if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Lu chat is not configured.');
      const apiKey=process.env.OPENAI_API_KEY;
      const safeHistory=body.history.length ? await scrubTextsForLu(apiKey,body.history.map((item:{text:string})=>item.text)) : [];
      const history:LuAgentHistoryMessage[]=body.history.map((item:{role:'user'|'assistant'},index:number)=>({role:item.role,text:safeHistory[index]}));
      if (!isLuLuScopeRequest(body.text, history)) {
        response.json({reply:outOfScopeReply(body.language),actions:[],references:[]}); return;
      }
      if (isJournalAccessCapabilityQuestion(body.text)) {
        response.json({reply:journalAccessCapabilityReply(body.language),actions:[],references:[]}); return;
      }
      // A clear request to find saved writing must not depend on the model
      // deciding to call a function. Search the account's ordinary entries
      // directly, scrub every returned excerpt, and show those results in the
      // chat. The assistant response model receives only the scrubbed request
      // and scrubbed excerpts; the separate cloud privacy pass handles raw excerpts.
      if (explicitlyRequestsSurfaceSearch(body.text)) {
        const query=luSearchTerms(body.text).join(' ').slice(0,300);
        const search=await searchOrdinaryEntries(current.uid,body.text,query,'Any',apiKey);
        response.json({reply:luSurfaceSearchReply(body.language,search.references.length),actions:[],references:search.references}); return;
      }
      const destination=explicitlyRequestsLuDestination(body.text);
      if (destination) {
        response.json({reply:luNavigationReply(body.language),actions:[{kind:'navigate',destination}],references:[]}); return;
      }
      const entryIds=new Map<string,string>();
      const result=await respondAsLuWithTools(apiKey,body.text,body.language,{
        history,
        execute:call=>executeLuTool(current.uid,body.text,call,apiKey,entryIds),
      });
      // Only open entries returned by the server's current ordinary-entry search.
      response.json({reply:result.reply,actions:result.actions,references:result.references}); return;
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
    if(route==='/owner/judge-invite'){
      const owner=await identity.getUser(current.uid);
      if(!mayReadAccountActivity(owner))throw new ApiError(403,'Only the verified LuLu owner can manage the shared judge invitation.');
      const inviteCollection=db.collection('_judgeInvites');
      if(body.action==='status'&&Object.keys(body).length===1){
        const active=await inviteCollection.where('enabled','==',true).limit(1).get();
        const invite=active.docs[0]?.data();
        const createdAt=invite?.createdAt&&typeof invite.createdAt.toDate==='function'?invite.createdAt.toDate().toISOString():null;
        response.json({enabled:Boolean(invite),createdAt});return;
      }
      if(body.action==='disable'&&Object.keys(body).length===1){
        const active=await inviteCollection.where('enabled','==',true).get();
        const batch=db.batch();const now=Timestamp.now();
        for(const invite of active.docs)batch.update(invite.ref,{enabled:false,disabledAt:now,disabledByUid:current.uid});
        if(active.size)await batch.commit();
        response.json({enabled:false,disabledCount:active.size});return;
      }
      if(body.action==='create'&&Object.keys(body).length===1){
        const token=randomBytes(32).toString('base64url');
        const digest=judgeInviteDigest(token);
        const newInvite=inviteCollection.doc(digest);
        const activeQuery=inviteCollection.where('enabled','==',true);
        await db.runTransaction(async transaction=>{
          const active=await transaction.get(activeQuery);
          if(active.size>499)throw new ApiError(409,'Too many active invitation records to rotate safely.');
          const now=Timestamp.now();
          for(const invite of active.docs)transaction.update(invite.ref,{enabled:false,disabledAt:now,disabledByUid:current.uid});
          transaction.create(newInvite,{enabled:true,createdAt:now,createdByUid:current.uid});
        });
        response.json({enabled:true,token,createdAt:new Date().toISOString()});return;
      }
      throw new ApiError(400,'Invalid judge invitation action.');
    }
    if(route==='/owner/ai-access'){
      const owner=await identity.getUser(current.uid);
      if(!mayReadAccountActivity(owner))throw new ApiError(403,'Only the verified LuLu owner can manage account AI access.');
      if(body.action==='list'&&Object.keys(body).length===1){
        const invites=db.collection('_judgeInvites');
        const users:Awaited<ReturnType<typeof identity.listUsers>>['users']=[];
        let pageToken:string|undefined;let pages=0;let truncated=false;
        do{
          const page=await identity.listUsers(100,pageToken);
          users.push(...page.users.filter(user=>user.uid!==current.uid));
          pageToken=page.pageToken;
          if(users.length>=100){truncated=Boolean(pageToken)||users.length>100;break;}
        }while(pageToken&&++pages<10);
        truncated=truncated||Boolean(pageToken);
        const accounts=await Promise.all(users.slice(0,100).map(async user=>{
          const access=(await db.collection('_judgeAccess').doc(user.uid).get()).data();
          const limits=readAiAccountLimits(access);
          const invitation=access?.ownerManaged===true||typeof access?.inviteDigest!=='string'?null:(await invites.doc(access.inviteDigest).get()).data();
          const effectiveEnabled=access?.enabled===true&&(access.ownerManaged===true||isJudgeInviteActive(invitation));
          const usage=access?.usage&&typeof access.usage==='object'?access.usage as Record<string,unknown>:{};
          const today=new Date().toISOString().slice(0,10);
          return {uid:user.uid,email:user.email??null,createdAt:user.metadata.creationTime,signInMethods:user.providerData.map(provider=>provider.providerId),enabled:effectiveEnabled,accessSource:access?.ownerManaged===true?'account grant':access?.inviteDigest?'judge invitation':'none',decisionsPerDay:limits.decisionsPerDay,luMessagesPerDay:limits.luMessagesPerDay,voiceSecondsPerDay:limits.voiceSecondsPerDay,decisionsUsed:usage.dayKey===today&&Number.isSafeInteger(usage.decisions)?usage.decisions as number:0,luMessagesUsed:usage.dayKey===today&&Number.isSafeInteger(usage.luMessages)?usage.luMessages as number:0};
        }));
        accounts.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
        response.json({owner:true,accounts,truncated});return;
      }
      const expected=['action','email','enabled','decisionsPerDay','luMessagesPerDay','voiceSecondsPerDay'].sort().join(',');
      if(body.action!=='update'||Object.keys(body).sort().join(',')!==expected||typeof body.email!=='string'||body.email.length>320||body.email.trim()!==body.email||typeof body.enabled!=='boolean')throw new ApiError(400,'Invalid account AI settings.');
      const validRequestLimit=(value:unknown)=>value===null||(Number.isSafeInteger(value)&&(value as number)>=0&&(value as number)<=100_000);
      if(!validRequestLimit(body.decisionsPerDay)||!validRequestLimit(body.luMessagesPerDay)||!Number.isSafeInteger(body.voiceSecondsPerDay)||(body.voiceSecondsPerDay as number)<0||(body.voiceSecondsPerDay as number)>3_600)throw new ApiError(400,'AI limits must be whole numbers, unlimited, or within the supported range.');
      let target;
      try{target=await identity.getUserByEmail(body.email.toLocaleLowerCase('und'));}catch{throw new ApiError(404,'No LuLu account uses that email address.');}
      if(mayReadAccountActivity(target))throw new ApiError(400,'The owner account always retains full AI access.');
      const accessRef=db.collection('_judgeAccess').doc(target.uid);
      await db.runTransaction(async transaction=>{
        const snapshot=await transaction.get(accessRef);const previous=snapshot.data();const now=Date.now();
        const oldAllowance=previous?.voiceAllowance as JudgeAllowance|undefined;
        const voiceMaximum=body.voiceSecondsPerDay as number;
        let voiceAllowance:JudgeAllowance|undefined=oldAllowance;
        if(!body.enabled||voiceMaximum===0){if(oldAllowance)voiceAllowance={...oldAllowance,credits:0,revoked:true};}
        else if(!oldAllowance||oldAllowance.expiresAt<=now||oldAllowance.revoked){voiceAllowance={credits:voiceMaximum,lastRefillAt:now,expiresAt:now+judgeVoicePolicy.accessDurationMs,revoked:false};}
        else voiceAllowance={...oldAllowance,credits:Math.min(oldAllowance.credits,voiceMaximum),revoked:false};
        transaction.set(accessRef,{enabled:body.enabled,ownerManaged:true,role:'account',decisionsPerDay:body.decisionsPerDay,luMessagesPerDay:body.luMessagesPerDay,voiceSecondsPerDay:voiceMaximum,...(voiceAllowance?{voiceAllowance}:{}),updatedAt:Timestamp.now(),...(snapshot.exists?{}:{createdAt:Timestamp.now()})},{merge:true});
      });
      response.json({updated:true});return;
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
        const accountLimits=readAiAccountLimits(data);
        const usage=data?.usage&&typeof data.usage==='object'?data.usage as Record<string,unknown>:{};
        const today=new Date().toISOString().slice(0,10);
        const decisionsUsedToday=usage.dayKey===today&&Number.isSafeInteger(usage.decisions)?usage.decisions as number:0;
        const luMessagesUsedToday=usage.dayKey===today&&Number.isSafeInteger(usage.luMessages)?usage.luMessages as number:0;
        const voiceDailyLimit=accountLimits.voiceSecondsPerDay;
        if(voiceDailyLimit===0){
          transaction.set(accessRef,{enabled:true,ownerManaged:false,role:'judge',inviteDigest:digest,...(access.exists?{}:{createdAt:Timestamp.now()})},{merge:true});
          return {judgeAccess:true,voiceRefilled:false,voiceAllowance:previous??null,voiceSecondsRemaining:0,voiceDailyLimit:0,decisionsPerDay:accountLimits.decisionsPerDay,luMessagesPerDay:accountLimits.luMessagesPerDay,decisionsUsedToday,luMessagesUsedToday,refillAvailableAt:null};
        }
        const refill = refillJudgeAllowance(previous ?? null, {...judgeVoicePolicy,refillCredits:voiceDailyLimit,maxCredits:voiceDailyLimit}, Date.now());
        if (!refill.ok) {
          if (refill.reason === 'revoked') throw new ApiError(403, 'This account no longer has judge access.');
          return {judgeAccess: true, voiceRefilled:false, voiceAllowance: previous ?? null, voiceSecondsRemaining:previous&&previous.expiresAt>Date.now()?previous.credits:0, voiceDailyLimit, decisionsPerDay:accountLimits.decisionsPerDay, luMessagesPerDay:accountLimits.luMessagesPerDay, decisionsUsedToday, luMessagesUsedToday, refillAvailableAt: refill.retryAt};
        }
        transaction.set(accessRef, {enabled:true, ownerManaged:false, role:'judge', inviteDigest:digest, voiceAllowance:refill.allowance, ...(access.exists ? {} : {createdAt:Timestamp.now()})}, {merge:true});
        return {judgeAccess:true, voiceRefilled:true, voiceAllowance:refill.allowance, voiceSecondsRemaining:refill.allowance.credits, voiceDailyLimit, decisionsPerDay:accountLimits.decisionsPerDay, luMessagesPerDay:accountLimits.luMessagesPerDay, decisionsUsedToday, luMessagesUsedToday, refillAvailableAt:refill.allowance.lastRefillAt! + judgeVoicePolicy.refillCooldownMs};
      });
      response.json(result); return;
    }
    if (route === '/judge/access') {
      if (Object.keys(body).length !== 0) throw new ApiError(400, 'Invalid request.');
      const access = await db.collection('_judgeAccess').doc(current.uid).get();
      const data = access.data();
      const allowance = data?.voiceAllowance as JudgeAllowance | undefined;
      const limits=readAiAccountLimits(data);
      const usage=data?.usage&&typeof data.usage==='object'?data.usage as Record<string,unknown>:{};
      const today=new Date().toISOString().slice(0,10);
      response.json({judgeAccess:access.exists && data?.enabled === true, voiceAllowance:allowance ?? null, voiceSecondsRemaining:allowance&&allowance.expiresAt>Date.now()?allowance.credits:0, voiceDailyLimit:limits.voiceSecondsPerDay, decisionsPerDay:limits.decisionsPerDay, luMessagesPerDay:limits.luMessagesPerDay, decisionsUsedToday:usage.dayKey===today&&Number.isSafeInteger(usage.decisions)?usage.decisions:0, luMessagesUsedToday:usage.dayKey===today&&Number.isSafeInteger(usage.luMessages)?usage.luMessages:0, refillAvailableAt:allowance?.lastRefillAt == null ? null : allowance.lastRefillAt + judgeVoicePolicy.refillCooldownMs}); return;
    }
    if (route === '/privacy/capability') {
      if (Object.keys(body).length !== 0) throw new ApiError(400, 'Invalid request.');
      await requireLuAiAccess(current.uid);
      const provider = configuredProvider(process.env, process.env.OPENAI_API_KEY);
      response.json(privacyCapability(provider)); return;
    }
    if (route === '/privacy/understand') {
      stage = 'privacy-processing';
      const privateSession = await sessionFor(request.get('authorization'), true, true);
      await requireLuAiAccess(privateSession.uid);
      let reviewed;
      try { reviewed = validateReviewedPrivacyRequest(body); }
      catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid privacy request.'); }
      const provider = configuredProvider(process.env, process.env.OPENAI_API_KEY);
      if (!provider.enabled) throw new ApiError(503, 'Privacy understanding is not configured.');
      try {
        await consumeAiQuota(privateSession.uid,provider.id==='openai_decisions'?'decisions':'luMessages');
        const result = await provider.understand(reviewed, AbortSignal.timeout(25_000));
        const stillPrivate = await sessionFor(request.get('authorization'), true, true);
        if (stillPrivate.sid !== privateSession.sid || stillPrivate.uid !== privateSession.uid) throw new ApiError(403, 'Please verify your passkey again.');
        response.json(result); return;
      } catch (error) {
        // Do not convert an authority change into a provider failure.
        try { await sessionFor(request.get('authorization'), true, true); }
        catch { throw new ApiError(403, 'Please verify your passkey again.'); }
        if (error instanceof ApiError) throw error;
        throw new ApiError(502, 'Privacy understanding could not be completed.');
      }
    }
    if (route === '/privacy/patterns') {
      stage = 'privacy-processing';
      const accountSession = await sessionFor(request.get('authorization'));
      await requireLuAiAccess(accountSession.uid);
      let reviewed;
      try { reviewed = validateReviewedPrivacyRequest(body); }
      catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid privacy request.'); }
      if (!process.env.OPENAI_API_KEY || configuredProvider(process.env, process.env.OPENAI_API_KEY).id !== 'openai_decisions') {
        throw new ApiError(503, 'Pattern understanding is not configured for OpenAI Decisions.');
      }
      try {
        await consumeAiQuota(accountSession.uid,'decisions');
        const result = await assessBehaviourPatterns({apiKey:process.env.OPENAI_API_KEY,request:reviewed,signal:AbortSignal.timeout(25_000)});
        const stillSignedIn = await sessionFor(request.get('authorization'));
        if (stillSignedIn.sid !== accountSession.sid || stillSignedIn.uid !== accountSession.uid) throw new ApiError(403, 'Please sign in again.');
        response.json(result); return;
      } catch (error) {
        try { await sessionFor(request.get('authorization')); }
        catch { throw new ApiError(403, 'Please sign in again.'); }
        if (error instanceof ApiError) throw error;
        throw new ApiError(502, 'Pattern understanding could not be completed.');
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
