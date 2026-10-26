# Phase 000 — Passkey Authentication and Bounded Sessions (Retrospective)

**Phase:** Phase 000 — Passkey Authentication and Bounded Sessions  
**Created:** 2026-10-25 (retrospective authoring date)  
**Revised:** 2026-10-25  
**Status:** RETROSPECTIVE DRAFT  
**Approved:** UNAPPROVED — NO EXECUTION AUTHORITY  
**Depends On:** None (foundational capability implemented before formal SDD)  
**Precedes:** Phase 001 Architecture Foundation (draft, unapproved)  
**Implementation Period:** 2026-10-23 to 2026-10-25 (observed via git history and evidence)  
**Authoring Exception:** All three artifacts (requirements, design, tasks) drafted together for this bounded retrospective evaluation only, per owner authorization. This does not establish a precedent for forward phases.

---

## Phase Overview

**Goal:** Document the as-implemented passkey-based authentication and bounded private-session system for LuLu, including WebAuthn registration/sign-in, Firebase custom-token exchange, server-side session records with separate expiry and private-step-up TTLs, client-side session guards, and explicit exit/cleanup behavior.

**Why This Phase Matters:** Passkey authentication is the sole identity and authorization mechanism for LuLu. The bounded private session (10-minute TTL, explicit lock/exit, generation-scoped local vault) is the gate to all private writing, entity mappings, and original-content retrieval. No conventional password/email flow exists. The implementation predates formal SDD phase approval; this retrospective spec establishes traceability from product intent (passkey-mediated protected access, device-side key custody, exit ends protected access) to implemented contracts, failure states, and evidence.

**Scope:** Client registration/sign-in/step-up flows (`src/services/backend/passkeys.ts`, `src/components/auth/`, `src/components/OnboardingAuth.tsx`, `src/components/ProtectedGateModal.tsx`), server endpoints (`functions/src/index.ts`, `functions/src/policy.ts`), session model (`AppSession`, `_sessions` collection), private-step-up TTL (10 min), session TTL (12 hr), challenge TTL (5 min), rate limiting, origin allowlist, client-side generation-scoped vault binding, quick-exit/Escape/visibility-change cleanup, and the IAM permission repair for `signBlob` (2026-10-25). Cloud Functions 2nd-gen, africa-south1, Firebase Auth (custom tokens), Firestore session/credential/challenge stores.

**Out of Scope:** Multi-device credential sync (not implemented), passkey-bound key derivation (local vault key is browser-held, not cryptographically passkey-bound), cross-device recovery, backup/recovery UX, real-money/trading authorization, imported agent runtimes, autonomous workflows, any capability not present in the 2026-10-25 implementation snapshot.

---

## Requirements

### REQ-000.1: Passkey-Only Registration and Sign-In

**User Story:**  
As a new or returning user, I need to create or use a passkey on this device so I can access my journal without passwords, email links, or identity-collection forms.

**Acceptance Criteria:**
1. Registration creates a WebAuthn credential with `residentKey: required`, `userVerification: required`, `attestationType: none`; credential ID is SHA-256 hashed for Firestore document ID.
2. Registration persists the credential (`uid`, `id`, `publicKey` base64, `counter`, `transports`, `createdAt`) and creates a Firebase Auth user (`uid`) only if no existing session; credential persistence and user creation are compensated (credential deleted on user-creation failure).
3. Sign-in generates authentication options (no `allowCredentials` filter; user selects credential in browser UI), verifies response against stored credential, updates counter atomically, and issues a session.
4. Both flows issue a Firebase custom token with claims `{sid, passkey: true}`; client exchanges it via `signInWithCustomToken` and immediately fetches `/session` for `AppSession {uid, expiresAt, privateUntil}`.
5. Client rejects passkey operations on insecure origins (`127.0.0.1` blocked; `localhost` allowed) with a recoverable error message directing to `http://localhost:5173`.
6. `NotAllowedError` (user cancels prompt) returns a cancellable status; other WebAuthn errors surface as generic retryable errors.
7. Server enforces origin allowlist (`https://khora-lulu-2026.web.app`, `https://khora-lulu-2026.firebaseapp.com`, `http://localhost:5173`, `http://127.0.0.1:5173`); CORS headers echo the request origin.

**Priority:** CRITICAL

---

### REQ-000.2: Server Session Model and TTL Boundaries

**User Story:**  
As the system, I need server-authoritative session records with separate expiry and private-access TTLs so private access is strictly bounded and revocable without ending the authenticated session.

**Acceptance Criteria:**
1. Session document (`_sessions/{sid}`) stores `uid`, `expiresAt` (SESSION_TTL = 12 hours), `privateUntil` (epoch ms, initially 0), `purgeAfter` (Firestore TTL = `expiresAt`).
2. `/session` endpoint returns `{uid, expiresAt, privateUntil}` only for valid, non-expired sessions where `token.passkey === true` and `token.sid` matches; missing/expired/mismatched → 401.
3. Private step-up (`/auth/stepup/verify`) requires a valid session with matching `sid` and `uid`; on success, updates `privateUntil = now + PRIVATE_TTL` (10 minutes = 600,000 ms).
4. `/auth/lock` sets `privateUntil = 0` without ending the session.
5. `/auth/logout` deletes the session document and signs out the client.
6. Rate limiting: 60 requests per 15-minute bucket per IP for `/auth/*` routes; 429 on exceedance.
6. Challenge documents (`_challenges/{challengeId}`) store `challenge`, `kind` (register/login/stepup), `uid`/`sid` (nullable), `origin`, `rpID`, `expiresAt` (CHALLENGE_TTL = 5 min), `used`, `purgeAfter`; `takeChallenge` marks `used: true` atomically; expired/used/wrong-kind/wrong-origin → 401.

**Priority:** CRITICAL

---

### REQ-000.3: Client Session State and Private-Step-Up Flow

**User Story:**  
As a signed-in user, I need to explicitly step up into a time-bounded private session to access protected writing, original content, and entity mappings, and have that session end automatically or on my command.

**Acceptance Criteria:**
1. `AppSession` type: `{uid: string; expiresAt: number; privateUntil: number}` (from `/session`).
2. `authenticate(create: boolean)` orchestrates: origin check → `authReady` → `/auth/{register|login}/options` → WebAuthn ceremony → `/auth/{register|login}/verify` → `signInWithCustomToken` → `/session`.
3. `unlockPrivate()` calls `/auth/stepup/options` → WebAuthn authentication → `/auth/stepup/verify` → returns `privateUntil` (epoch ms).
4. `lockPrivate()` calls `/auth/lock`; `logout()` calls `/auth/logout` then `signOut(auth)`.
4. Client auto-refreshes session at `expiresAt` via timeout (line 66: `setTimeout` on `session.expiresAt - Date.now()`); on expiry, clears state and calls `logout()`.
5. Client auto-locks private session at `privateUntil` via timeout (line 71); on expiry, calls `handleExitProtected()`.
6. `handleExitProtected()` increments `privateUnlockAttempt`, `originalReadRequest`, and `privateAuthority.generation`; nulls `localVault`; resets `privateUntil=0`, `protectedMode=false`, `entities=initialEntities`, clears `selectedEntry`, `editingEntry`, `notice`, `backendError`; sets view to `home`; calls `lockPrivate()` (fire-and-forget).
7. Quick-exit button (JournalHome, PrivateSanctuaryView) and Escape key (when `privateAuthority.until > 0`) and `visibilitychange` (document hidden) all invoke `handleExitProtected()`.
8. `privateAuthority` ref holds `{until: number; generation: number}`; `generation` increments on every exit/lock/account-change; `LocalVault` constructor captures `generation()` and `isUnlocked()` callbacks bound to current `privateAuthority`.
9. `originalReadRequest` ref increments on each protected-entry read; read completes only if request ID and generation match current at response time (stale reads discarded).

**Priority:** CRITICAL

---

### REQ-000.4: Onboarding and Protected-Gate UI Contracts

**User Story:**  
As a user, I need clear, accessible onboarding screens for passkey creation and sign-in, and a distinct protected-access gate modal that communicates the time-bounded nature of private sessions.

**Acceptance Criteria:**
1. `OnboardingAuth` screens: `welcome` → `orientation-one` → `orientation-two` → `create` (register) OR `welcome` → `signin` (login). Orientation explains journal vs protected writing separation.
2. `passkeySupport` prop or auto-detection via `PublicKeyCredential in window && window.isSecureContext`; unsupported shows error with copy.
4. Failure reasons mapped to user-facing copy: `credential-missing`, `challenge-expired`, `verification-failed`, `network`, `recovery-required`, `unsupported`, `local-origin`, `unknown`.
5. `local-origin` error provides a clickable link to reopen on `localhost:5173`.
6. `recoveryAction: 'sign-in'` surfaced when registration fails because credential already exists (server returns `canOfferRegistrationSignInRecovery`).
7. `onAuthenticated` callback fires only after host verifies server session (AuthBoundary sets session state).
8. `ProtectedGateModal`: `<dialog>` with `closedby="any"` fallback; shows passkey prompt on verify; busy/error states; `onClose` exits protected if active, otherwise just closes modal; `onVerify` calls `handleProtectedSuccess`.
9. Modal copy: "Verify with a passkey to open a private session for up to ten minutes."
10. ARIA roles: `role="status"` for errors, `role="alert"` for passkey errors, `aria-labelledby` on dialog.

**Priority:** CRITICAL

---

### REQ-000.5: Private Session Generation Scoping and Local Vault Authorization

**User Story:**  
As the private writing subsystem, I need every LocalVault instance cryptographically bound to the current authenticated owner (via AES-GCM additional authenticated data and per-uid key lookup) and runtime-guarded by the live session generation and unlocked state so that exit/lock/account-change immediately invalidates all vault operations.

**Acceptance Criteria:**
1. `LocalVaultSession` interface: `ownerId: string`, `generation: () => number`, `isUnlocked: () => boolean`. Owner identity participates in encryption/key lookup/AAD; generation and isUnlocked are runtime authorization guards checked by LocalVault (not cryptographically encoded).
2. `LocalVault` constructor asserts `session.ownerId` non-empty, `generation()` non-negative safe integer, and `assertSession(session, ownerId, generation)` passes (unlocked, owner match, generation match).
3. Every vault operation (`createOriginal`, `appendDerived`, `getRevision`, `getLatest`, `listRevisions`, `listRecords`) re-asserts session validity at transaction start and after each async await point (`assertSession`).
4. `assertSession` throws `LocalVaultLockedError` if not unlocked, owner mismatch, generation mismatch, or non-safe-integer generation.
5. `handleProtectedSuccess` creates new `LocalVault` with callbacks: `generation: () => privateAuthority.current.generation`, `isUnlocked: () => !signingOut.current && Date.now() < privateAuthority.current.until`.
6. `handleExitProtected` increments generation → all in-flight/pending vault operations fail on next `assertSession`.
7. Local vault key (IndexedDB `lulu.device-vault.v1` per `uid`) is **not** cryptographically derived from or bound to the passkey; it is a browser-held AES-GCM key generated on first use. Losing browser data loses this key; no cross-device recovery is implemented or claimed.

**Priority:** CRITICAL

---

### REQ-000.6: Security Boundaries, Error Handling, and Operational Evidence

**User Story:**  
As the operator, I need verifiable security boundaries (origin allowlist, rate limits, challenge consumption, credential counter checks, no request data in logs), honest error surfaces, and recorded operational evidence for the live authentication repair.

**Acceptance Criteria:**
1. Server origin allowlist enforced before any processing; CORS headers set per-request.
2. Rate limit: 60 req/15min/IP for `/auth/*`; tracked in `_rateLimits/{hash(ip:bucket)}` with 2-bucket TTL.
3. Challenge single-use: `takeChallenge` marks `used: true` in transaction; reused/expired/wrong-kind/wrong-origin → 401.
4. Credential counter verified on authentication: transaction reads current counter, rejects if mismatched, updates to `newCounter`.
5. Compensated writes: `mintBeforePersist` (token then session), `withCompensation` (user creation then credential delete on failure).
6. Server logs only bounded diagnostics: `route`, `stage`, `code`, `name`, `cleanupFailed`; never request body, tokens, messages, or stacks.
7. Client `authError` maps: `NotAllowedError` → cancellation message; `invalid domain` → localhost hint; else message passthrough.
8. **Operational Evidence (2026-10-25):**
   - IAM repair: `roles/iam.serviceAccountTokenCreator` granted to `687182197240-compute@developer.gserviceaccount.com` on itself (`.sdd/evidence/passkey-auth-fix/approved-signing-permission.json`, timestamp `2026-10-25T12:38:33.669Z`).
   - Live authentication test: synthetic account `af659051-a60c-44cf-8e0f-b9c84f23528c` registered, custom-token exchanged, `/session` returned, login and private step-up verified; account/credential/sessions/challenges cleaned up (`.sdd/evidence/passkey-auth-fix/live-authentication-test.txt`, `.sdd/evidence/passkey-auth-fix/test-account-cleanup.json`).
   - Owner confirmed native sign-in works post-repair (2026-10-25 active-context entry).
   - Hosting-only update deployed version `cf2ca69e213e14dd` with streamlined sign-in UX (removed success/Continue screen; sign-out in avatar menu).
9. Unknown: Physical-device acceptance of all private flows remains open per project snapshot; new diagnostic/recovery server changes remain unpublished.

**Priority:** CRITICAL

---

## Privacy & Security Model

**Data Classification:** Restricted — authentication credentials, session tokens, private session state, user identifiers.

**PII Risk:** Yes — Firebase Auth `uid`, passkey credential IDs (hashed), session IDs, IP addresses (rate-limit buckets).

### Masking Strategy
- Encryption Required: HTTPS enforced; Firebase Auth tokens in memory only (`inMemoryPersistence`); private originals encrypted in IndexedDB via AES-GCM (device key).
- Tokenization/Pseudonymization: Credential IDs stored as SHA-256 hashes; session IDs are UUIDs; owner references in vault are `uid` only.
- Data minimization: No email, phone, display name, or biometric data collected or stored by LuLu. Passkey verification handled by browser/platform.
- Ownership enforced server-side: Every Firestore read/write checks `uid` match; client filters are not authorization.
- Sign-out/account change invalidates sensitive cached projections: `handleExitProtected` clears vault, entities, entries; `signOutAccount` clears entries and signs out.
- Paper/demo mode: N/A (no demo auth path; `local-origin` blocked).

---

## Phase Success Criteria (Retrospective Assessment)

1. Passkey registration and sign-in work end-to-end on allowed origins (localhost, Firebase Hosting) — **IMPLEMENTED, LIVE-VERIFIED 2026-10-25**.
2. Session model enforces 12-hour authenticated TTL and 10-minute private TTL with separate lock/logout — **IMPLEMENTED**.
3. Client auto-expiry, quick-exit, Escape, visibility-change all invoke consistent cleanup — **IMPLEMENTED**.
4. LocalVault operations fail closed on generation mismatch or lock — **IMPLEMENTED**.
5. Onboarding and protected gate UI meet accessibility and copy requirements — **IMPLEMENTED**.
6. Server logs bounded diagnostics; no request secrets in logs — **IMPLEMENTED**.
7. IAM `signBlob` permission repaired; live auth test passed; synthetic cleanup verified — **EVIDENCE RECORDED 2026-10-25**.
8. **GAPS / UNACCEPTED:** Physical-device acceptance of all private flows remains open; multi-device/recovery not implemented; local vault key not passkey-bound; new diagnostic/recovery server changes unpublished; owner acceptance of deployed version `cf2ca69e213e14dd` pending.

---

## Approval Gate

**RETROSPECTIVE DRAFT — UNAPPROVED — NO EXECUTION AUTHORITY**

This document reconstructs requirements from the as-implemented system as of 2026-10-25. It does not authorize any code changes, tests, builds, deployment, merge, archive, or hook behavior. Formal SDD progression remains paused per `.sdd/memory/governance/2026-10-24-hackathon-sdd-pause.md`. Phase 001 Architecture Foundation remains an unapproved draft. This retrospective spec is for documentation and traceability only. Owner review required before any formal approval.