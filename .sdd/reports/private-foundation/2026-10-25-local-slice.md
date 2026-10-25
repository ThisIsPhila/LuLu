# Local private-writing slice assessment

25 October 2026, Africa/Johannesburg. Base HEAD `0aad65790ca0a2c2910e10176cb2d3ee908960ce`, shared dirty checkout. No commit or publication performed. Assessed files/checks are captured under `../../evidence/private-foundation/`.

## Outcome

Reconciled the complete discussion into a product goal, flows, data responsibilities, current-code gaps and delivery order. Owner statements are separated from assistant proposals/research. Parent closeout of ordinary editable per-user starters and main-only Hosting was preserved; this session started independent module work and integrated only after the parent explicitly released shared files.

Implemented local encrypted JSON originals, append-only derived revisions and owner/session-bound discovery/reopen. Connected new private text save/list/edit/history to the existing app step-up and exit lifecycle. Ordinary new saves/edits still use their existing account-owned backend paths. Existing protected cloud records are not migrated. Added paragraph-at-a-time editor projection and manual preview/history reveal; text is absent from inactive paragraph DOM/accessibility values. Added Escape exit and cleared private selection on lock.

Privacy contracts bind disclosure review to exact content/source revisions/recipient/purpose/policy and expose no network transport. Companion grant checks are owner/recipient/resource-scoped with grant/expiry/revocation checks. These are local policy functions, not delivered sharing or a professional integration.

## Review changes

Initial review found mutable-input and identity-substitution gaps in the new vault; fixed by normalized JSON snapshots, immutable input identifiers, requested tuple checks and generation pinning. Head/revision snapshot validation detects incomplete chains, count mismatches and stale parents. Additional tests cover ciphertext relocation, delayed reads and owner/generation changes.

Integration review caught a canceled-gate draft reset and an active UI retaining an invalidated vault. Authentication-attempt cancellation now has a separate nonce; canceling an ordinary private-entry attempt preserves its draft, while closing a gate during an existing private session uses the full exit path. This is code-reviewed; real passkey/device interaction remains pending.

## Verification and evidence

- `tests.txt`: focused vault/private-capture/privacy contract run. Covers encrypted browser-store shapes, original preservation, instance reopening, no capture network path, Unicode text, duplicate/concurrent/stale revisions, identity/chain corruption, mutable input, session races, starter exclusion, exact disclosure review binding, paragraph projection and narrow permission failures.
- Final totals: 22 focused tests, 6 existing transform tests and 11 Firebase guard tests passed. TypeScript checking runs in the successful main-app build.
- `build.txt`: `npm run build:hosted` (TypeScript + main app build + output isolation). Main-only package verified; existing large-bundle warning retained.
- `existing-tests.txt`: existing transform suite.
- `guard-tests.txt` / `firebase-guard.txt`: guard regression tests and repository Firebase boundary check. A passing check is not deployment authority or a hard spend cap.
- `dependency-audit.json`: offline dependency audit returned no cached advisories; current registry coverage was not checked. No new dependencies introduced.
- `paragraphs-locked.png`: real local browser fixture locked after revealing paragraph one, switching to paragraph two, replacing it with mixed-language two-paragraph text, and revealing the split third paragraph. Accessibility snapshots showed only the active paragraph's text, then no original text when locked. This fixture is synthetic and tests component rendering, not account authentication or the complete app.

No focused failure remains. Initial localhost startup was sandbox-blocked (environment failure); authorized localhost-only startup succeeded. An initial fixture import referenced a missing Vite cache path (execution failure); replaced it with normal package imports and verified the interaction. Full authenticated app, phone passkey, keyboard, cross-tab UX, browser restart/eviction, media and complete offline flows are pending.

## Limits / next authorized action

The key remains browser-held and is not cryptographically bound to the passkey. Same-origin compromise can use it; full database rollback/deletion is undetectable. Hash/device time does not prove real events or legal validity. Originals are first saved captures, not autosaved drafts; quick exit discards unsaved work. Storage work crossing a lock may commit without an acknowledgment; reopening is required to inspect. There is no complete offline startup/unlock, media storage, portable backup/recovery or sharing delivery. Typed provenance cannot identify unlabelled fiction.

Next local work is authenticated target-device validation, reliable urgent/offline capture and media stop/save/exit lifecycle, followed by encrypted backup/export/restore and scoped sharing. No raw remote disclosure, service expansion or publication is inferred. Formal SDD progression remains paused.
