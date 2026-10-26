# Phase 000 — Passkey Authentication and Bounded Sessions (Retrospective) — Tasks

**Phase:** Phase 000 — Passkey Authentication and Bounded Sessions  
**Created:** 2026-10-25 (retrospective authoring date)  
**Status:** RETROSPECTIVE DRAFT  
**Approved:** UNAPPROVED — NO EXECUTION AUTHORITY  
**Requirements Approved:** UNAPPROVED  
**Design Approved:** UNAPPROVED  
**Depends On:** None (foundational capability implemented before formal SDD)  
**Precedes:** Phase 001 Architecture Foundation (draft, unapproved)  
**Strategy doc:** [Product Vision](../../../../memory/product-vision.md)  
**Authoring Exception:** All three artifacts drafted together for this bounded retrospective evaluation only, per owner authorization. This does not establish a precedent for forward phases.

---

## Implementation Rules

1. This is a **retrospective reconstruction only**. Do not run `phase.sh start`, task transitions, finish/archive commands, tests, builds, deployment, or approval commands while authoring this file.
2. When separately authorized, start only through `bash .sdd/scripts/phase.sh start phase-000-passkey-auth-bounded-sessions` after requirements, design, and tasks receive explicit approval.
3. Each top-level task is one bounded scope. It may use multiple focused commits carrying the same task ID; mark it `doing` before implementation and `done` only after its stated checks and evidence are complete; no nested checkbox subtasks are used.
4. Stage only paths owned by the active task. The frontend is a single React/Vite app (not a submodule).
5. Reuse existing visual, chart, evidence, validation, broker and layout components after contract/provenance review. Do not replace the design system or create a competing insight, job, conversation, order, or evidence store.
6. This phase owns the auth/session boundary (`passkeys.ts`, `AuthBoundary`, `OnboardingAuth`, `ProtectedGateModal`, `localVault`, `deviceVault`, `index.ts`, `policy.ts`). It does not own journal storage, privacy transforms, or outer-app UI.
7. Phase 001+ capabilities are future dependencies. Until they exist, agent/chat/workflow areas show an honest unavailable state; imported agents and gateways are never fallbacks.
8. Tests may use deterministic fixtures for UI states, but fixtures cannot be presented as observed market data, measured validation, broker fills, or provider output. No real order is submitted by automated checks.
9. Every task maps to exact requirement/design sections below and records scope exclusions. No phase.json, runtime change, remote change, hook change, or fabricated approval marker is part of this planning pass.
10. **Evidence classification:** Distinguish LOCAL (unit/contract tests, emulator), DEPLOYED (Firebase Hosting version `cf2ca69e213e14dd` at `https://khora-lulu-2026.web.app/`), LIVE-VERIFIED (2026-10-25 synthetic account test), and OWNER-ACCEPTANCE (pending). Unknowns explicitly marked.

---

## Tasks

- [ ] **[T000.1] Establish the server auth/session boundary and truth-state primitives**
  - **Objective and requirements:** Implement/reconstruct the Cloud Functions HTTPS handler with origin allowlist, rate limiting, challenge lifecycle, credential persistence, session minting, and step-up logic per REQ-000.1, REQ-000.2, REQ-000.6.
  - **Design references:** Design §2, §4.1, §4.3, §5.1; `functions/src/index.ts`, `functions/src/policy.ts`.
  - **Implementation and owned outputs:**
    - `functions/src/index.ts`: `api` handler with CORS, origin allowlist (4 origins), rate limit (60/15min/IP), knownRoutes allowlist.
    - `functions/src/policy.ts`: `CHALLENGE_TTL=5min`, `SESSION_TTL=12h`, `PRIVATE_TTL=10min`; `assertChallenge`, `assertSession`, `mintBeforePersist`, `withCompensation`, `failureDiagnostic`, `ApiError`, `documentId`.
    - Firestore collections: `_sessions/{sid}`, `_challenges/{challengeId}`, `_credentials/{hash(credentialId)}`, `_rateLimits/{hash(ip:bucket)}`.
    - Credential ID stored as SHA-256 hash; counter verified and updated atomically.
    - Compensated writes: `mintBeforePersist` (token → session), `withCompensation` (user creation → credential delete).
    - Bounded logging: only `route`, `stage`, `code`, `name`, `cleanupFailed`; never request data/tokens/stacks.
  - **Owned paths:** `functions/src/index.ts`, `functions/src/policy.ts`, `functions/package.json` (dependencies).
  - **Dependencies and inputs:** Firebase Admin SDK, `@simplewebauthn/server`, Blaze project `khora-lulu-2026`, africa-south1, 2nd-gen Functions enabled.
  - **Positive and negative verification:**
    - Valid registration → credential persisted, user created, session issued, custom token returned.
    - Duplicate credential ID → 409.
    - Expired/used/wrong-kind/wrong-origin challenge → 401.
    - Rate limit exceeded → 429.
    - Invalid origin → 403.
    - Missing/invalid auth header on `/session` → 401.
    - Step-up with mismatched `sid`/`uid` → 401.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.1-contract-report.md` with emulator run output; `.sdd/evidence/phase-000/T000.1-deployed-version.txt` with Functions deploy version.
  - **No-go conditions and handoff:** IAM `signBlob` permission missing blocks custom token minting (repaired 2026-10-25, evidence in `.sdd/evidence/passkey-auth-fix/approved-signing-permission.json`). Downstream: T000.2 client orchestration, T000.3 client session state.

- [ ] **[T000.2] Implement client passkey orchestration and session exchange**
  - **Objective and requirements:** Implement/reconstruct `src/services/backend/passkeys.ts` with `authenticate(create)`, `unlockPrivate()`, `lockPrivate()`, `logout()`, `request()`, `AppSession`, `BackendRequestError`, `authError()` per REQ-000.1, REQ-000.3.
  - **Design references:** Design §4.2, §5.1, §7; `src/services/backend/passkeys.ts`, `src/services/backend/firebase.ts`.
  - **Implementation and owned outputs:**
    - `passkeys.ts`: `authenticate(create)` → options → WebAuthn → verify → custom token → `signInWithCustomToken` → `/session`; `unlockPrivate()` → step-up options → WebAuthn → step-up verify → `privateUntil`; `lockPrivate()` → `/auth/lock`; `logout()` → `/auth/logout` → `signOut`; `request()` with Bearer token; `BackendRequestError` with `recoveryAction`.
    - `firebase.ts`: `initializeApp` with public config; `auth` with `inMemoryPersistence`; `authReady` promise; `database` (memory cache only).
    - Origin guard: `127.0.0.1` blocked with `local-origin` error; `localhost` allowed.
    - Error mapping: `NotAllowedError` → cancelled; `invalid domain` → localhost hint; else passthrough.
  - **Owned paths:** `src/services/backend/passkeys.ts`, `src/services/backend/firebase.ts`.
  - **Dependencies and inputs:** `@simplewebauthn/browser`, `firebase/auth`, `firebase/app`, server endpoints from T000.1.
  - **Positive and negative verification:**
    - Registration on `localhost:5173` → success, session returned.
    - Registration on `127.0.0.1:5173` → `local-origin` error with clickable localhost link.
    - Sign-in with existing credential → success, session returned.
    - Cancelled WebAuthn prompt → `cancelled` status.
    - Network failure → `network` reason.
    - Expired session → 401 → client triggers sign-out.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.2-contract-report.md` with unit test output; `.sdd/evidence/phase-000/T000.2-live-auth.txt` referencing 2026-10-25 synthetic test.
  - **No-go conditions and handoff:** Server must be reachable and IAM permission granted. Downstream: T000.3 client session state, T000.4 onboarding UI.

- [ ] **[T000.3] Implement client session state, private authority, and generation-scoped vault binding**
  - **Objective and requirements:** Implement/reconstruct `JournalApp` session management in `src/App.tsx` including `privateAuthority`, `localVault`, timers, `handleExitProtected`, `handleProtectedSuccess`, `navigatePrivate` per REQ-000.3, REQ-000.5.
  - **Design references:** Design §4.5, §5.2, §5.3, §6; `src/App.tsx:26-168`, `src/services/vault/localVault.ts`, `src/services/backend/deviceVault.ts`.
  - **Implementation and owned outputs:**
    - `App.tsx`: `privateAuthority` ref `{until, generation}`; `localVault` ref; `privateUntil` state; `protectedMode` state; `privateUnlockAttempt` ref; `originalReadRequest` ref.
    - Auto-expiry: `setTimeout` on `session.expiresAt` → `signOutAccount`; `setTimeout` on `privateUntil` → `handleExitProtected`.
    - `handleExitProtected()`: increments generation, nulls vault, resets state, calls `lockPrivate()` fire-and-forget.
    - `handleProtectedSuccess()`: calls `unlockPrivate()`, creates `LocalVault` with callbacks bound to current `privateAuthority`, sets `privateUntil`, `protectedMode`, opens pending view.
    - `navigatePrivate(view)`: if active and `privateUntil > now` → view; else → open `ProtectedGateModal`.
    - Escape key (when `privateUntil > 0`) and `visibilitychange` (hidden) → `handleExitProtected`.
    - `LocalVault` constructor captures `generation()` and `isUnlocked()` callbacks; every method re-asserts via `assertSession`.
    - `deviceVault.ts`: AES-GCM key per `uid` in IndexedDB `lulu.device-vault.v1`; `encryptPrivate`/`decryptPrivate` with AAD `uid/id`.
  - **Owned paths:** `src/App.tsx` (JournalApp), `src/services/vault/localVault.ts`, `src/services/backend/deviceVault.ts`, `src/services/privateCapture.ts`.
  - **Dependencies and inputs:** T000.2 `unlockPrivate`/`lockPrivate`, T000.4 `ProtectedGateModal`, `LocalVaultSession` interface.
  - **Positive and negative verification:**
    - Step-up success → `LocalVault` created, `protectedMode=true`, `privateUntil` set.
    - Timer expiry → `handleExitProtected` called, generation incremented, vault nulled.
    - Quick Exit button → `handleExitProtected` called.
    - Escape key → `handleExitProtected` called.
    - `visibilitychange` hidden → `handleExitProtected` called.
    - Vault operation after generation increment → `LocalVaultLockedError`.
    - Vault operation with wrong owner → `LocalVaultLockedError`.
    - Vault operation while locked → `LocalVaultLockedError`.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.3-state-machine-report.md` with trace logs; `.sdd/evidence/phase-000/T000.3-vault-guard-report.md` with `LocalVaultLockedError` test output.
  - **No-go conditions and handoff:** `LocalVault` key is browser-held, not passkey-bound (documented limitation). Downstream: T000.5 protected writing UI, T000.6 private sanctuary UI.

- [ ] **[T000.4] Deliver onboarding and protected-gate UI with honest failure surfaces**
  - **Objective and requirements:** Implement/reconstruct `OnboardingAuth`, `ProtectedGateModal`, `AuthBoundary` per REQ-000.4.
  - **Design references:** Design §4.4, §5.2, §6; `src/components/OnboardingAuth.tsx`, `src/components/ProtectedGateModal.tsx`, `src/components/auth/AuthBoundary.tsx`, `src/components/auth/auth.css`, `src/components/OnboardingAuth.css`, `src/components/ProtectedGateModal.css`.
  - **Implementation and owned outputs:**
    - `OnboardingAuth`: screens `welcome` → `orientation-one` → `orientation-two` → `create` / `signin`; `passkeySupport` detection; `AuthFailureReason` enum (8 reasons); `reasonCopy` mapping; `local-origin` link to `localhost:5173`; `recoveryAction: 'sign-in'` secondary button; ARIA `role="status"`/`role="alert"`.
    - `ProtectedGateModal`: `<dialog closedby="any">` with fallback; busy/error states; copy "Verify with a passkey to open a private session for up to ten minutes."; `onClose` exits protected if active; `onVerify` calls `handleProtectedSuccess`.
    - `AuthBoundary`: hosts `OnboardingAuth`; calls `authenticate`; blocks `127.0.0.1`; manages `session` state; `onAuthenticated` sets session.
  - **Owned paths:** `src/components/OnboardingAuth.tsx`, `src/components/ProtectedGateModal.tsx`, `src/components/auth/AuthBoundary.tsx`, `src/components/auth/auth.css`, `src/components/OnboardingAuth.css`, `src/components/ProtectedGateModal.css`.
  - **Dependencies and inputs:** T000.2 `authenticate`, `authError`, `BackendRequestError`; T000.3 `handleProtectedSuccess`, `handleExitProtected`.
  - **Positive and negative verification:**
    - Welcome → orientation → create → register success → session set.
    - Welcome → signin → sign-in success → session set.
    - Unsupported browser → `unsupported` error shown.
    - `127.0.0.1` → `local-origin` error with localhost link.
    - Cancelled prompt → "Passkey prompt closed. You can try again."
    - Registration with existing credential → `recoveryAction: 'sign-in'` shown.
    - Protected gate opens → dialog shows; verify → `handleProtectedSuccess`; close while active → `handleExitProtected`.
    - ARIA roles present on status/error elements.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.4-ui-contract-report.md` with screen captures; `.sdd/evidence/phase-000/T000.4-accessibility-check.md` with keyboard/ARIA verification.
  - **No-go conditions and handoff:** No recovery UX implemented (`recovery-required` reason exists but no flow). Downstream: T000.3 consumes `onAuthenticated`.

- [ ] **[T000.5] Implement protected writing view and entity inspector integration**
  - **Objective and requirements:** Implement/reconstruct `ProtectedWritingView` and `EntityInspectorView` consuming `entities` state and `privateAuthority` per REQ-000.3, REQ-000.5.
  - **Design references:** Design §6; `src/components/ProtectedWritingView.tsx`, `src/components/EntityInspectorView.tsx`, `src/domain/transform.ts`.
  - **Implementation and owned outputs:**
    - `ProtectedWritingView`: masked/unmasked toggle (`isMasked`); `transform(bodyText, initialEntities, {perspectiveDistancing: true})` for masked prose; enclave toast showing "3 entities transformed"; `onOpenEntityInspector` → `navigatePrivate('inspector')`; `onDone` → home.
    - `EntityInspectorView`: lists entities with `id`, `alias`, `mentionCount`; `onUpdateAlias` updates `entities` state (session-scoped); `onConfirm` → home with notice.
    - `handleUpdateAlias` in `App.tsx`: checks `Date.now() < privateAuthority.current.until` before updating.
  - **Owned paths:** `src/components/ProtectedWritingView.tsx`, `src/components/EntityInspectorView.tsx`, `src/domain/transform.ts`, `src/domain/transform.test.ts`.
  - **Dependencies and inputs:** T000.3 `privateAuthority`, `entities` state, `navigatePrivate`; `transform` domain module.
  - **Positive and negative verification:**
    - Masked view shows transformed aliases (David → John).
    - Unmasked view shows original text.
    - Entity inspector shows current aliases; alias edit updates session state.
    - Alias edit blocked after `privateUntil` expiry.
    - Enclave toast click opens entity inspector.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.5-transform-report.md` with transform test output (12 domain tests pass).
  - **No-go conditions and handoff:** Entity recognition is deterministic configured replacement (not general PII). Downstream: T000.6 private sanctuary.

- [ ] **[T000.6] Implement private sanctuary view with quick exit and trusted contacts**
  - **Objective and requirements:** Implement/reconstruct `PrivateSanctuaryView` and `TrustedContacts` per REQ-000.3, REQ-000.4.
  - **Design references:** Design §6; `src/components/PrivateSanctuaryView.tsx`, `src/components/TrustedContacts.tsx`, `src/domain/privacy/companions.ts`.
  - **Implementation and owned outputs:**
    - `PrivateSanctuaryView`: tabs Private/Safety/Resources; quick-exit button (top and bottom); safety planning, understand options, trusted contacts, helplines, calm focus cards; `onQuickExit` → `handleExitProtected`; `onOpenJournal` → home.
    - `TrustedContacts`: modal for adding/removing contacts; stored via `companions.ts` (local only, not synced).
    - Privacy assurance box: "Original records and trusted contacts are encrypted before cloud storage. Their key stays in this browser."
  - **Owned paths:** `src/components/PrivateSanctuaryView.tsx`, `src/components/TrustedContacts.tsx`, `src/domain/privacy/companions.ts`.
  - **Dependencies and inputs:** T000.3 `handleExitProtected`; `companions.ts` local storage.
  - **Positive and negative verification:**
    - Quick exit (top/bottom) → `handleExitProtected` called.
    - Trusted contacts modal opens/closes.
    - Helpline numbers displayed (SA GBV Command Centre 0800 428 428, etc.).
    - Calm focus cards interactive.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.6-sanctuary-report.md` with UI verification.
  - **No-go conditions and handoff:** Trusted contacts not encrypted/synced (local only). Distress ping not implemented. Downstream: Phase 004+ for companion sharing.

- [ ] **[T000.7] Record IAM repair, live authentication test, and deployment evidence**
  - **Objective and requirements:** Document the 2026-10-25 operational evidence: IAM `signBlob` permission grant, synthetic account live test, cleanup verification, hosting deployment, owner native sign-in confirmation per REQ-000.6.
  - **Design references:** Design §8; `.sdd/evidence/passkey-auth-fix/`, active-context 2026-10-25 entries.
  - **Implementation and owned outputs:**
    - No code changes — this task is evidence consolidation.
    - Evidence map:
      - `approved-signing-permission.json`: IAM grant to runtime SA on itself, timestamp `2026-10-25T12:38:33.669Z`, scope "Only this existing service account".
      - `live-authentication-test.txt`: `result=pass uid=af659051-a60c-44cf-8e0f-b9c84f23528c` with credential ID SHA-256 and ledger path.
      - `test-account-cleanup.json`: synthetic account/credential/sessions/challenges removed and verified absent.
      - `policy-tests.txt`: 10 policy tests pass (rate limit, challenge consumption, counter check, etc.).
      - Hosting version `cf2ca69e213e14dd` deployed (streamlined sign-in UX: removed success screen, sign-out in avatar menu).
      - Active-context: "Owner confirms native sign-in works" (2026-10-25).
    - Gaps recorded: physical-device acceptance of all private flows open; new diagnostic/recovery server changes unpublished.
  - **Owned paths:** `.sdd/evidence/phase-000/T000.7-evidence-index.md` (new), referencing existing `.sdd/evidence/passkey-auth-fix/`.
  - **Dependencies and inputs:** Existing evidence files; no code dependencies.
  - **Positive and negative verification:**
    - All evidence files exist and are readable.
    - IAM grant verified via read-back.
    - Live test shows registration → custom token → session → step-up → cleanup.
    - Hosting version hash matches reviewed build.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.7-evidence-index.md` with cross-references and gap register.
  - **No-go conditions and handoff:** Evidence is retrospective; no automated test harness for live auth. Downstream: Phase 001/004+ consume stable contracts.

- [ ] **[T000.8] Run phase verification gate and preserve SDD evidence**
  - **Objective and requirements:** Execute local verification (build, domain tests, policy tests, emulator if available) and record evidence per REQ-000.6, Design §8.
  - **Design references:** Design §7, §8.
  - **Implementation and owned outputs:**
    - `npm run build` → production build passes.
    - `npm run test` → 12 domain tests pass (transform, journal, privacy).
    - `npm run test:firebase-guard` → 10 guard tests pass.
    - Emulator tests (if run): `functions/src/policy.test.ts` → pass.
    - Evidence recorded in `.sdd/evidence/phase-000/` with command, environment, commit, timestamp, result, limitations.
    - Reports in `.sdd/reports/phase-000/` with assessment and limitations.
  - **Owned paths:** `.sdd/evidence/phase-000/`, `.sdd/reports/phase-000/`.
  - **Dependencies and inputs:** T000.1–T000.7 complete; existing test scripts.
  - **Positive and negative verification:**
    - Build succeeds (1.13s observed).
    - Domain tests pass (98ms observed).
    - Guard tests pass.
    - No deployment, merge, archive, or real-money enablement follows.
  - **Acceptance evidence:** `.sdd/evidence/phase-000/T000.8-verification-report.md` with command outputs; `.sdd/reports/phase-000/T000.8-assessment.md`.
  - **No-go conditions and handoff:** This task is a gate only after explicit implementation authorization; this task plan itself runs no checks.

---

## Critical Path

```text
T000.1 Server auth/session boundary + truth primitives
  → T000.2 Client passkey orchestration + session exchange
    → T000.3 Client session state + private authority + vault binding
      → T000.4 Onboarding + protected-gate UI
      → T000.5 Protected writing + entity inspector
      → T000.6 Private sanctuary + trusted contacts
  → T000.7 Evidence consolidation (parallel after T000.1–T000.3)
    → T000.8 Verification gate
```

Notes:
- T000.4, T000.5, T000.6 may proceed in parallel after T000.3 where their UI contracts are independent.
- T000.7 consolidates existing evidence; no code changes.
- T000.8 is a gate only after explicit implementation authorization; this task plan itself runs no checks.

---

## Estimate Summary

Sizing assumes one engineer familiar with the existing React/Firebase codebase, available server endpoints, and existing test scripts. Ranges are planning effort for **retrospective documentation**, not measured duration or a promise of elapsed time.

| Task | Estimate |
| :--- | :--- |
| T000.1 Server auth/session boundary + truth primitives | 0.5–1 engineer-days (documentation only) |
| T000.2 Client passkey orchestration + session exchange | 0.5–1 engineer-days (documentation only) |
| T000.3 Client session state + private authority + vault binding | 0.5–1 engineer-days (documentation only) |
| T000.4 Onboarding + protected-gate UI | 0.5–1 engineer-days (documentation only) |
| T000.5 Protected writing + entity inspector | 0.5–1 engineer-days (documentation only) |
| T000.6 Private sanctuary + trusted contacts | 0.5–1 engineer-days (documentation only) |
| T000.7 Evidence consolidation | 0.5 engineer-days |
| T000.8 Verification gate | 0.5 engineer-days |
| **Total sequential sizing** | **~4–7 engineer-days (documentation only)** |

---

## Phase Completion Criteria (Retrospective)

Phase 000 may be considered documented when:

1. All eight top-level task descriptions are complete with each commit scoped to one task ID (multiple focused commits under a task ID are permitted), with no nested checkbox state.
2. Requirements, design, and tasks traceability matrix is complete (REQ → Design § → Task → Evidence).
3. Evidence index distinguishes LOCAL (unit/contract/emulator), DEPLOYED (Hosting `cf2ca69e213e14dd`), LIVE-VERIFIED (2026-10-25 synthetic test), and OWNER-ACCEPTANCE (pending).
4. Gaps explicitly recorded: local vault key not passkey-bound; no multi-device sync; no recovery UX; physical-device acceptance open; diagnostic/recovery changes unpublished.
5. Automated contract/page checks and manual responsive/keyboard checks cover stated scenarios, with command/environment/commit and fixture-vs-observed evidence plus unverified limitations recorded.
6. Existing useful UI, components, routes preserved; no deployment, merge, archive, or phase-start action follows automatically.

---

## Approval Gate

**RETROSPECTIVE DRAFT — UNAPPROVED — NO EXECUTION AUTHORITY**

The owner explicitly authorized requirements, design, and tasks co-authoring for this single retrospective spec on 2026-10-25, overriding sequential document creation. No intermediate authoring approvals are required. This task plan remains a draft review artifact and does not authorize implementation, `phase.sh start`, tests, deployment, merge, archive, or new hook behavior. Formal SDD progression remains paused per `.sdd/memory/governance/2026-10-24-hackathon-sdd-pause.md`. Phase 001 Architecture Foundation remains an unapproved draft.

Final task/start and deployment authority remain separate. Do not invent approval timestamps to satisfy generic lifecycle lint.