# Active context

## Launch copy and web release attempt — 26 October 2026

The README now presents the hosted web app as the recommended demo, distinguishes source-built native apps from released downloads, and avoids claiming a PWA install prompt or mobile data-journey acceptance. The web document title/description now identify LuLu as a journal and storybook. README and `index.html` were updated on GitHub branch `codex/lulu-development-commits` (commits `055531ca65a3fee9228768df886c7c57ef15f61a` and `f8366c998e26cdebb3f821a15c1f67afaa8ca959`). GitHub About description/homepage fields remain unchanged: the connected tool has no metadata-write operation, and the browser session is signed out. Suggested About description: “A journal and storybook for everyday writing and protected personal documentation—your story, your safety, your choice.” Website field: `https://lulu.thisisphila.co.za/`.

`npm run guard:firebase` passed with the recorded `native-email-password-sign-in` owner exception. `npm run build:hosted` and app-only packaging verification passed (37 LuLu files; demo, review, and test-fixture paths excluded). Hosting-only deploy was attempted with `CI=1` to avoid prompts and stopped because Firebase CLI credentials were expired; no service-account/CI credential is configured. No Hosting change went live, no Functions/Firestore/configuration mutation occurred, and visibility remains under owner control. Firebase MCP is unavailable in this session. Native icon work was deferred after owner direction; generated blue artwork was discarded and native icon assets restored.

## Curated Story reading sequence — 26 October 2026

When a saved Story is opened from Stories, its complete ordinary collection is passed into the existing Reader and ordered by saved timestamp, oldest first. The Reader shows accessible Previous/Next controls and a part count only for multi-entry groups, preserves each entry as its own source record, and scrolls to the top on part changes. The Stories collection name remains visible with the source kind. Five focused ordinary-browse tests pass, including chronology and protected/Journal exclusion; `build:app` passes. Local seeded browser check confirmed Stories → Reader → Stories with a single Story. No multi-entry live fixture was present, so the interactive multi-part controls were not browser-exercised. No new content, emulator, deployment or Firebase mutation. Report: ../../reports/story-sequence/2026-10-26-review.md; evidence: ../../evidence/story-sequence/.

## Home quick note/task integration — 26 October 2026

Home's existing reflection card now has low-emphasis Quick note and Task actions. Each routes to the matching Library Notes/Tasks section and opens the existing inline creation form with title focus; account-scoped service/CRUD remains shared. In the local seeded preview, both routes, cancel/empty states, normal Library navigation and spacing were inspected. No record saved. `tsc -b`, `npm run build:app`, and `git diff --check` pass; no Firebase release, emulator, auth prompt or target-device acceptance. Review: ../../reports/home-quick-capture/2026-10-26-review.md; observation record: ../../evidence/home-quick-capture/.

## Screen-to-screen UI smoke pass — 26 October 2026

Used the already-running local browser preview with seed data to traverse Home, Journal, Reader, Stories, Library Entries/Notes/Tasks, and Write, including back/edit/return routes and cancelling the inline note form. Checked alignment, card widths, spacing and empty states between screens. The existing “Write privately” header action had default browser button styling, so it now uses the app’s subtle text-link styling. TypeScript and `git diff --check` pass. No auth prompt, emulator, production-site mutation, deploy, or saved test content. This is local UI evidence only, not authenticated or deployed acceptance.

## Home activity accuracy — 26 October 2026

The fixed “06:00 AM Prompt” claim was removed; the existing reflection question is now labelled without a schedule. The seven-day Home total and seven-bar visual now derive from ordinary saved-entry timestamps, bucketed into rolling 24-hour periods. Static card layout is unchanged. Source review only; no tests, working-site/device acceptance or deployment.

## Story collection membership — 26 October 2026

The existing ordinary composer Options now lets an owner assign a Story collection name; the same label groups saved Story records in Stories. The account service validates/persists the optional field, the live watcher restores it, local development storage preserves it, and `firestore.rules` allows only a bounded label on ordinary Story records. Changing an entry to Journal clears membership. No collection description/cover editor, multi-entry collection manager, Firebase deployment, tests or working-site/device acceptance. Existing theme and navigation remain unchanged.

## Local private disclosure review — 26 October 2026

Saved text records in the active Firebase-authenticated/private session now expose a contextual disclosure review. The owner edits a separate in-memory copy, binds it to the exact saved revision, recipient label and stated purpose using the existing SHA-256 snapshot contract, reviews the frozen text, and can explicitly copy it to the device clipboard. Live vault authorization is rechecked before preparation and clipboard handoff. No copy persistence, outbound delivery, automatic PII/context detector, authenticated recipient, invitation, permission enforcement or audit is implemented. Clipboard copies can be exposed to other apps; the UI states that. Local source review only; no tests, working-site/device acceptance or deployment.

## Private support hub — 26 October 2026

The existing Private/Safety/Helplines controls now show distinct content. Safety prompts are session-only and explicitly not a complete plan. Helplines has a searchable, source-linked small South African national directory with checked dates and user-initiated phone links; no call/message is initiated by LuLu. Trusted contacts use the Firebase-authenticated UID and existing encrypted account service, with add/edit/remove/call controls; they are clearly described as saved phone notes, not authenticated companions or record-sharing grants. No invitation, recipient authentication, sharing, permissions, audit, referral, language/location search or verified-professional connection. Source review only; no tests, working-site/device acceptance or deployment.

## Physical iPhone startup repair — 26 October 2026

Owner-reported blank white screen reproduced on the connected iPhone. WebView/React loaded and secure storage returned, but Firebase auth initialization stalled. Native now uses explicit initializeAuth without the browser redirect resolver; iOS auth persistence uses localStorage with in-memory fallback following Confessions; Android retains IndexedDB and web retains in-memory auth. Existing loading status is visible inside safe areas. Encrypted vault/draft/media records and key storage are unchanged. App build/package verification/sync, Firebase guard, simulator and signed device builds pass. Updated iPhone app renders complete onboarding on two cold launches; simulator and localhost web preview also render onboarding. Evidence/report: ../../evidence/ios-startup/ and ../../reports/ios-startup/2026-10-26-fix.md. Startup acceptance only; live provider sign-in and journal persistence remain open. No Firebase deployment or push. Concurrent product/status docs preserved.

## Progress reader and screen alignment — 26 October 2026

Owner requested a thorough progress refresh, onboarding handoff for UI Design and comparison with Product Implementation's plan. Internal HTML now includes Current progress, an updated production checklist, onboarding UI handoff and screen alignment. Sunday 7/10 is marked submitted. Native email/Google/provider configuration is local and not deployed. Android install/launch and physical iPhone install/launch are recorded; usable UI and authenticated journeys remain unverified. The older simulator black screen is a separate observation.

Both existing chats were read without dispatching work. The private representation inspector correction is implemented locally; see `.sdd/reports/representation-inspector/2026-10-26-review.md`. UI Design last completed existing auth styling. The current-run app critique concerns newly built post-login pages; the previously approved welcome is outside that critique. Fourteen-screen onboarding is an unintegrated design flow with first-entry/auth order, secure temporary draft handling and Skip/resume decisions open. No tests/builds/cloud deployments were run for this documentation reconciliation.

## Durable private text delivery — 25 October 2026

Bounded goal requested by owner, coordinated here with Luna High implementation/review. New LOCAL source autosaves encrypted mutable drafts separately from originals; recovery is private-session-only after restart/reload. Save atomically creates an original or appends a revision and removes the draft. Includes version conflict protection, quota/abort retry, invalid-snapshot guards and exact-record reconciliation after a lost finalization acknowledgement. Quick exit still locks immediately and drops controller callbacks/queued references. Completed autosaves survive the tested reload; uncommitted edits/eviction/key loss cannot be guaranteed.

56 focused tests, app build/main-only packaging and local synthetic browser recovery/error checks pass; native-device/authenticated app acceptance remains open. No deployment/cloud resources/paid calls/push/commit by this goal. Parent-owned hackathon HTML/production progress JavaScript and unrelated reconstruction work were preserved. Delivery: `docs/implementation/2026-10-25-durable-private-capture.md`; evidence/assessment: `../../evidence/durable-private-capture/` and `../../reports/durable-private-capture/2026-10-25-delivery.md`. Offline startup/unlock, media, export/deletion/backup/key recovery, actual sharing, Trails and support remain on the product tracker; this is not whole-backlog completion.

## Product implementation session — 25 October 2026

Owner requested Sol Medium coordination with Luna High delegation, full product-discussion reconciliation and immediate implementation under the existing formal-SDD pause. Consolidated goal/current-code gap map: `docs/product/2026-10-25-product-direction.md`; complete owner/assistant source remains alongside it. No new phase or fabricated approval. Official OpenAI Decisions API contract verified; no provider transport or paid expansion added.

Parent chat released shared app files after finishing per-account editable starters and main-app-only Hosting (reported version `0fd97059aa2ceb7c`). This session preserves those changes. New LOCAL implementation routes new private text saves to encrypted IndexedDB, adds bounded-session local record reopen/append-only revision history, paragraph-at-a-time concealment, an ordinary-new-draft private-entry action, and Escape/quick-exit cleanup. Existing cloud-backed protected records retain their old read path; no silent migration. Details and limits: `docs/implementation/2026-10-25-local-private-writing.md`; verification assessment: `../../reports/private-foundation/2026-10-25-local-slice.md`.

Vault key is browser-held, not cryptographically passkey-bound; clearing/losing browser data can lose access. No backup/recovery, media capture, complete offline app/unlock, actual companion sharing, Trails or external interpretation integration is claimed. Quick exit closes unsaved drafts; save is explicit. Owner-device/authenticated acceptance remains pending. No deployment, commit, push or cloud mutation by this session.

2026-10-23 — Codex

## Current direction

**Latest sync/playback update:** Owner requested categorized GitHub commits of all latest work, excluding the video. Both original MP4 and browser-compatible WebM are local-only and covered by .gitignore. In-app browser displayed frames and played the WebM through 20.625 seconds without error; original MP4 remains the download/fallback and the Sonke upload is unchanged. Owner is working on per-page UI mockups; wait for those to guide the next visual implementation. This is repository sync and playback repair, not deployment or a new UI redesign.

**Internal review site:** `/docs/hackathon/review.html` now uses Documents / Media / Tasks with hover/focus/tap subheader navigation, preserving logo and Print. Media groups latest direction, earlier boards, pitch/source PDF and review captures. Tasks separate platform deadlines from internal build work; checkboxes track completed work only, not media selection or uploads triggered by the site. Confirmed team setup, SSDLC, canvas and pitch are prechecked; app/demo isolation and reference preservation are also complete. Manual changes persist in the same browser only. Programme PDF copied unmodified and key milestones transcribed with SAST times; schedule/source discrepancies are noted. No recurring automation created.

**Latest app/design direction:** Main responsive web app at `/` from root `src/`; framed interactive implementation preserved at `/demo/` from independent `demo/src/`. Separate browser keys and production output folders prevent demo resets from modifying app records and prevent including the demo in the app build. The six latest owner images are in `docs/design/resources/2026-10-24-warm-tactile/`. Warm paper/stone/sage and charcoal supersede flat-white treatment; visual integration is next. UI critique should focus on aesthetics, and targeted changes should preserve unrelated elements. No per-page test endpoints implemented in this step.

**Operating mode: build-first hackathon delivery. Formal SDD progression is paused by owner direction on 24 October.** See [owner exception](../governance/2026-10-24-hackathon-sdd-pause.md). Implement requested changes directly; maintain documentation and reverse traceability alongside implementation. Advance phase approvals and lifecycle ceremonies are suspended for this mode. Existing framework, hooks, security review and relevant verification remain preserved.

Read ../product-vision.md with the dated updates below for product intent. Natural writing, automatic contextual concealment, responsive entity indicators, optional correction and original-intent retrieval are central. The owner selected a mobile-first journal/storybook experience. The broader safety purpose includes documentation, evidence continuity, selective disclosure and support; the journal is its everyday experience. The implementation route remains under discussion.

Phase 001 Architecture Foundation requirements drafted on 2026-10-24 at owner request. Approval pending; no design/tasks. A separately authorised local prototype now exists, as recorded below. The phase draft needs reframing toward implementation and reconciliation with the selected journal direction; do not infer technical approval.

## Shared project state

SDD core and visual workspace installed; initial verification recorded in ../../reports/framework-adoption.md. Private GitHub repository exists. Contributor guide and agent entry points are shared across Codex and Claude Code. Phila is initial integration owner; teammate task split not established here.

## Latest context change

Current product-vision.md is the owner-provided replacement. Rewrote current context and contributor explainer accordingly; marked prior handoffs historical and preserved prior reconciled context. Retained useful implementation distinctions without imposing a fixed processing pipeline, mandatory per-entry review, selected outer app or preselected runtime stack. SDD governance remains in the constitution/onboarding. No first spec authored.

## Onboarding correction

Restored framework-provided AGENTS.md and CLAUDE.md entry points. Removed duplicated lifecycle, approval, session and handoff procedures from CONTRIBUTING.md. It now contains only project orientation, cloning and the new-checkout hook note. Existing SDD onboarding and constitution remain the single workflow authority.

## Architecture phase authoring — 2026-10-24

Created phase-001-architecture-foundation through phase.sh new. Requirements cover the demo journey, entity continuity/retrieval, responsive processing, protected access, project topology and delivery evidence. No runtime stack selected. Requirements pending review; no phase sprint started.

## Design direction received — 24 October

Story/journal outer app confirmed. Saved product/frontend/brand handoff and four reference images; see ../project-context.md and docs/design/README.md. Ordinary writing has no always-on privacy processing; deliberate protected access/conversion activates transformation, including narrative distancing. Further design/frontend input forthcoming. Phase 001 remains draft and needs reframing toward implementation, as the owner corrected; no implementation or technical approval inferred.

## Agent session — 24 October 2026 (Antigravity)

Session started for project orientation, framework reconnaissance, and status assessment.
Verified SDD doctor health, repository state, product vision, hackathon timeline, and pending Phase 001 requirements draft.
Awaiting user direction on Phase 001 review/refinement and Lovable/v0 frontend integration.

## First local prototype — 24 October

Owner explicitly requested a modular component-based prototype. Implemented local React/TypeScript/Vite journal and protected-writing preview under bounded direction in ../governance/2026-10-24-prototype-direction.md. Components in src/components; storage hook in src/hooks; journal and transform domain modules in src/domain. Phase 001 remains DRAFT, not falsely approved. No backend/cloud AI/passkeys integrated. Preview at localhost:5173; local dev session running. Browser writing/conversion/alias-save/session-exit/reload journey observed. TypeScript/production build and 3 domain tests pass. Owner visual review pending.

## Current handoff — 24 October

Owner found the prototype insufficiently aligned with the supplied mobile-first design examples; design acceptance is pending and frontend correction remains outstanding. Frontend work is paused for hackathon materials. The SSDLC draft in docs/hackathon/ssdlc-draft-2026-10-24.md has been rewritten around intended architecture and security lifecycle, replacing the earlier prototype-led assessment. All five fields were entered into Sonke for owner review; no submission was made by the agent. Owner will review/edit/submit, then work on the 20-second pitch.

Sonke observed: KHÔRA has two members, nelsonmaker is Cybersecurity Lead, Lean Business Canvas marked filled, SSDLC not yet submitted, progress updates and submissions both zero. Programme confirms Saturday security 12:00–12:30, video 13:30 (30 MB max), feedback 14:00–17:00, evening progress update 23:00–00:00; final Monday 26 October 23:59. These are observation-time statuses, not guarantees of current platform state.

Owner explicitly authorised categorized commits and a GitHub push in this session. This does not approve Phase 001, the frontend design, SSDLC submission or deployment.

## Canvas review and SSDLC update — 24 October

Owner reports submitting the SSDLC after personal edits; the repository draft is not asserted to be the exact submitted wording. Reviewed live Sonke canvas, preserved the existing five fields, polished wording and completed metrics, distribution, cost and revenue sections using supplied discussion. Canvas Save Changes returned Success: Team Lean Business Canvas created successfully. Local review copy: docs/hackathon/lean-business-canvas-review-2026-10-24.md. Impact metrics prioritise user-defined outcomes; financial figures remain indicative assumptions. HSRC statistic checked against the 2022 study published in 2024. Owner review of canvas and pitch work remain next.

## High-fidelity mobile-first prototype aligned to design boards — 24 October (Antigravity)

Owner requested replacing the prior desktop card layout with a high-fidelity prototype adhering to the supplied design boards in `docs/design/references/`.
Implemented:
- Direction 02 humanist geometric LuLu SVG wordmark and app icon.
- Mobile Phone Frame (390px iPhone bezel, dynamic island, status bar, home indicator) with seamless toggle to Desktop Web layout (Screen 06).
- Screen A (Journal Home): tabs (All, Journal, Stories, Private), tactile stacked card for Today, grouped entry cards with time, snippet, and lock indicators.
- Screen B & D (Editor): normal writing, ambient entity recognition chips, floating 3-item recognition toast, inline popover (Update representation? David -> John [Keep/Change/Dismiss]), narrative distancing segmented control (1st-person "I" vs 3rd-person "She").
- Screen C (Protected Mode Gate): dark immersive modal (`#0E0E12`) with 3D liquid pearl orb, biometric scan simulation, PIN fallback, and light-dismiss `<dialog closedby="any">` with fallback.
- Screen E (Entity Controls Sheet): drawer displaying recognised items (Person, Location, Time, Topic), mention counts, inline alias editing, and custom reference creation.
- Screen F (Reader View): `Literata` serif editorial reading layout, date/time meta, floating reader pill dock (Lock/Exit, Read, Reveal Original Intent when unlocked, Listen audio wave simulation, Tr 1st/3rd person toggle, Aa font size).
- Screen G & 06 (Library): real-time search with author original-intent querying, category subtabs (Entries, People, Places, Topics), and multi-tag filtering chips.
- Verified: production build passes in 1.13s, 6 domain tests pass in 98ms, live hot reload running on port 5173.

## Compact home and composing correction — 24 October

Owner requested discreet home categories, compact expandable card stacks, keyboard-adjacent writing with processing above, and camera-safe top bars. Implemented in root app and deployed via Firebase MCP to https://khora-lulu-2026.web.app (Hosting version 869a7827d1480502). Build and live stack/preview interactions observed. Physical iPhone keyboard/safe-area verification pending. See ../../reports/hackathon-ui/2026-10-24-compact-home-writing.md. Preserved demo remains independent.

## Categorized snapshot and UI owner handoff — 24 October

Owner rejected the current card-stack interpretation and requested categorized commits plus implementation delegation to LuLu UI Design. Current UI remains unaccepted. Handoff: docs/handoffs/ui-design-2026-10-24.md. Main/demo builds pass; latest combined domain run is 9 passing / 6 failing (earlier all-green core evidence is historical). Preserve the snapshot and document contract drift for the functionality track; do not invent another visual replacement or recreate Firebase resources during this handoff.

## Backend implementation — 25 October 2026

Owner approved khora-lulu-2026 ID and Standard Firestore + second-gen functions in Johannesburg. DB created; custom-passkey Auth config and function deployed. Local app now uses verified passkey callbacks, owner-scoped cloud journal and encrypted private originals/contacts; no silent legacy migration. Deployment/runtime verification details and limitations: docs/implementation/backend-2026-10-25.md, .sdd/reports/backend/2026-10-25-review.md. Authenticated owner testing remains pending; do not infer acceptance. Firebase Hosting rejected the Johannesburg function rewrite; client now uses direct origin-restricted endpoint. Artifact cleanup-policy setup is still outstanding.

Owner resource preference: delegate suitable implementation/review work to GPT-6 Luna High; parent GPT-6.1 Sol reviews and integrates. Do not spawn full inherited-model agents for routine subtasks. Two Luna High reviews completed in this turn after correcting model selection.

## Firebase cost boundary and guardrails — 25 October 2026

Owner clarified: KEEP Blaze and use its included free allowances; KEEP Johannesburg and second-generation functions. No Spark downgrade or architecture migration is needed or authorized by this cost clarification. Proposed downgrade was not applied. Do not confuse potential overages with an actual bill. Mandatory decision: ../governance/2026-10-25-firebase-cost-boundary.md. Repository guardrails and hooks are being added; they are local checks, not a hard spending cap. Artifact cleanup and actual billing usage remain unverified operational follow-ups.

Firebase guardrails implemented and reviewed: `npm run guard:firebase`; pre-commit staged-config check and Hosting/Firestore/Functions/Auth predeploy hooks; policy in ../governance/firebase-guard-policy.json. Ten tests cover project/region/service drift, resource expansion, hidden extra exports, dynamic options, staged-vs-working changes, service configuration keys and Hosting backend rewrites. Guard/build/shell syntax checks pass. No live changes in this guardrail task. Guide: docs/operations/firebase-cost-and-guardrails.md; evidence/report in .sdd/evidence/firebase-guardrails and .sdd/reports/firebase-guardrails. Cleanup and actual usage remain unverified, and no hard spend cap is claimed.

## Database-backed samples and hosted phone test — 25 October 2026

Main app and current framed preview published at https://khora-lulu-2026.web.app/ and /demo/ (Hosting c351fa4f01598219). Three read-only fictional entries plus manifest created in demoCatalogues/johannesburg-v1 via create-only MCP writes; separate Personal/Sample journal controls; no sample-to-user copy. Root hardcoded entry fixture removed; compatibility local data preserved. Actual device passkey/save/reopen remains for owner testing. Internal document/media hosting access remains unanswered and is not publicly published. See docs/operations/phone-testing.md and .sdd/reports/phone-testing/2026-10-25-readiness.md.

## Owner correction: ordinary editable starters; main app only

The owner rejected the hosted interactive demo and shared read-only sample journal. Only the main app is hosted; demo/frame and internal library are strictly local. Starter template content is copied from Firestore once into each owner's ordinary private/unprotected journal; ordinary edit saves update the same ID. A one-time immutable initialization marker prevents duplicate creation, overwrite and restoring deletions on subsequent sign-ins. Real emulator tests cover concurrency and preservation. Read docs/operations/phone-testing.md; earlier phone readiness report remains historical and is superseded by this correction.

New owner-requested chat LuLu Product Implementation (01a172e8-cc35-79a3-a15d-647d816ae1c2) uses GPT-6.1 Sol Medium with Luna High delegation. Complete source discussion and parent handoff preserved in docs/product/2026-10-25-product-discussion-source.txt and 2026-10-25-direction-handoff.md. Formal SDD phase ceremonies remain paused. New chat documents/consolidates that goal and starts independent foundations while parent finishes ordinary starters/hosting correction.

## Passkey failure diagnosis and pending permission approval

Owner reports device passkey creation completes but account entry fails. Existing Auth users/session docs plus register/login HTTP500 were observed. Runtime service-account Editor role lacks iam.serviceAccounts.signBlob; no service-account bindings and required APIs already enabled. Scoped self Token Creator permission fix prepared, but automatic approval review rejected executing it without specific owner authorization. No IAM change applied; pending async question names exact recipient/scope. Local diagnostic/recovery improvements pass8 policytests/guard/build but are not deployed. See .sdd/reports/passkey-auth-fix/2026-10-25-diagnosis.md. Do not mark auth fixed or repeat grant before approval.

Owner subsequently explicitly approved the exact signing-permission fix. Applied Service Account Token Creator to runtime 687182197240-compute@developer.gserviceaccount.com on itself only; read-back verified. No project-wide grant/billing change/key export. Prior approval block is resolved. Existing deployed runtime picks up permission without redeploy; user must retry existing-passkey sign-in to confirm. Local auth diagnostic/recovery code is tested but not yet published. Evidence: .sdd/evidence/passkey-auth-fix/approved-signing-permission.json.

Live authentication test subsequently passed after owner-specific approval for one temporary synthetic account: real deployed registration, Firebase custom-token exchange, /session, returning login and private step-up. Temporary account/credential/two sessions/three challenges removed and verified absent; real accounts untouched. Evidence .sdd/evidence/passkey-auth-fix/live-authentication-test.txt and test-account-cleanup.json. Owner's native phone passkey UI still needs a fresh existing-passkey sign-in after reload; no new key needed. Server-flow success is now observed, not merely inferred from options/IAM configuration.

## Verified sign-in UX correction — 25 October 2026

Owner confirms native sign-in works. Removed separate success/Continue screen: verified authenticate() result immediately opens journal. Removed permanent sign-out-only panel in final shared UI; Sign out is in home avatar menu. Preserved private-only Quick exit/Private writing controls and existing visuals. Build/22 private regression tests/guard pass; Hosting-only update in progress. No backend/IAM/billing changes. Details .sdd/reports/signin-ux/2026-10-25-streamlined-entry.md.

Hosting-only correction succeeded, version cf2ca69e213e14dd. Live HTML asset hash matches the reviewed build. Refresh the hosted app to receive direct verified sign-in and avatar-menu Sign out.

## Internal production progress view — 25 October 2026

Local review HTML now includes Tasks → Production progress (#tasks-production), 31 read-only entries covering verified foundations, implemented/acceptance work and remaining goals. Legacy #tasks-delivery opens the same current view. Logo/Print/other library sections preserved. Current data in docs/hackathon/production-tasks.js mirrors docs/product/2026-10-25-task-status.md. Browser rendering verified; local only, no Firebase publication or paid service change.

## Project orientation — 25 October 2026 (Kimi)

Owner requested a detailed project summary before choosing the next piece of work. Reviewed current product direction, implementation tracker, application/backend structure and local private-writing boundaries. No implementation, deployment, external mutation or phase approval is implied by this orientation session.

## Local browse and visual correction — 26 October 2026

Existing private components now use scoped warm tactile light styling; no new unapproved page design. Ordinary Home/Leaves exclude legacy protected records from results/counts, working Leaves query/type filters and Home tag results replace inert controls; fabricated statistics/metadata removed. 60 focused tests and main-only hosted build pass; synthetic browser search/open/filter/isolation observed. Local only, no deployment or phone/design acceptance. Reports: ../../reports/private-visual-alignment/2026-10-25-review.md and ../../reports/ordinary-browse/2026-10-26-review.md. Broader product goal remains active; ordinary Story creation, offline/media/export/backup remain open. Owner flagged usage-tool figures as inaccurate; stop using that source for pacing and prefer owner-visible figures (latest supplied85% session/58% weekly remaining, observation only).

## Existing controls and offline shell — 26 October 2026

Owner rejected further UI additions/layout changes; removed new composer collection controls and closed test tabs. Existing Home Stories filter → existing lower Write action now supplies Story kind; existing Story edits retain kind. Backend write/reclassification support is tested by nine local emulator cases including starter preservation; reclassification UI remains open. No new page/layout/side panel.

Production-only service worker caches generated app shell/assets/local logos, excludes runtime data/auth/API/docs/demo/externalfonts, and updates through natural waiting lifecycle. Actual app root and fresh sign-in query rendered with local preview server stopped. Nine worker tests + sixty ordinary/private regressions (69) pass; final hosted build/main-only packaging and Firebase guard pass. Offline auth/private unlock/capture are still open; current online authority remains unchanged. Reports: ../../reports/offline-shell/2026-10-26-review.md and ../../reports/ordinary-collections/2026-10-26-review.md. No deployment/cloud mutation/commit/push. Production tracker source and local HTML data updated.

OpenUsage CLI found at /usr/local/bin/openusage; read succeeded and matched owner-visible percentages at first comparison. State the fetch time because it shares a five-minute cache. Last read here fetched03:33UTC,69% session/56% weekly remaining; this is observation-time data, not a live guarantee. Do not use the conflicting app usage tool for pacing.

## Local private media — 26 October 2026

Private writing card now uses the existing composer image/mic tool pattern; existing private list/detail handles independent immutable media originals, explicit reveal/conceal and cleanup. No new page/sidebar/CSS. Same account/unlock/generation authority gates AES-GCM raw bytes and encrypted metadata. Split metadata/binary stores prevent loading all ciphertexts for lists; atomic inserts and quota rollback preserve originals. Recorder cancels delayed permission, releases tracks, retains final encoded chunks on Stop, limits bytes and schedules about60s stop; elapsed metadata is approximate. Ordinary media icons explain the working private route; ordinary attachments and text/media association remain open.

93 focused tests, final hosted main-only build and Firebase guard pass. Actual-component synthetic image picker→save→reload→concealed reopen→reveal→conceal/exit observed; final cleanup recheck showed zero media elements after exit. No native camera/mic or owner-authenticated phone acceptance, cloud transport/deploy/push/commit. Browser-held key/passkey-binding, offline reauthentication, export/deletion/backup/recovery remain open. Report ../../reports/private-media/2026-10-26-review.md; raw evidence ../../evidence/private-media/. Owner's latest supplied usage was50% session/53% weekly; no Codex CLI used, only OpenUsage provider command.

## Readable private export — 26 October 2026

Existing private detail now exports local text originals/all saved revisions as readable JSON, or exact original media bytes. Explicit scope review/download; unencrypted/not-backup/no-unsaved-edits labels; cancel/exit revoke prepared URLs and authority rechecked before download. No new destination/sidebar/CSS, cloud transport/deploy/push/commit. LocalVault/LocalMediaVault gain assertions only, not new authorization. One runtime.ts import suffix in concurrently added native deviceKeyStore restored standard Node tests; native key semantics/work preserved.

98 focused tests, hosted main-only build and Firebase guard pass. Actual-component synthetic JSON/image downloads inspected; image bytes/hash exact. Initial download observation interrupted by concurrent native packaging HMR; repeated successfully against stable no-HMR local server. Cancel/quick-exit cleanup observed; server/tab closed. Report ../../reports/private-export/2026-10-26-review.md. Readable export is not backup/recovery. Ordinary/legacy-cloud export, deletion/retention, encrypted backup/restore/cross-device keys, offline reauthentication and phone/native acceptance remain open. Goal remains active.

## Local deletion —26October2026

One LunaHigh lifecycle implementation + root review/combined pass. Existing private detail now prepares scoped irreversible deletion with acknowledgement; text original/history/linked drafts or media pair delete atomically only if unchanged and still authorized. Unsaved edits gate confirmation. Historical-parent recovery remains allowed; deleted-target autosaves reject.118 focused tests (including16 deletion and4 recovery-file crypto) and hosted build/packaging/Firebase guard pass. Browser confirmation/ack/cancel/exit verified; no browser permanent-deletion click/owner deletion. Report ../../reports/private-lifecycle/2026-10-26-review.md. No deployment/cloud/push/commit.

Password-encrypted recovery-file primitive exists/tested; no backup/restore UI or recovery claim until restore integration verifies metadata/history/conflicts acrossfreshdevicekeys. Ordinary/cloud lifecycle, retention, backup/restore, offline authorization, phone/native acceptance and broader product backlog remain open; goalactive.

Latest owner direction: STOP usage CLI checks (password prompts). Use supplied screenshots; prioritize five-hour allowance, reset time and burnrate, ignore weekly concern for today'sdelivery. Latest screenshot06:23SAST:90%session left, resets4h49, projected exhaustion1h47. Aim roughly18%/hour orless acrossremainingwindow toavoidresetwait, batchwork/reviews/tests, LunaHigh boundeddelegation. No automaticusagechecks.

## Capacitor mobile implementation — 26 October 2026

Capacitor 8 local iOS/Android shells, app-only bundle verification, platform boundaries, native passkey bridge/client and exchange backend, native key adapter, and camera/audio adapters are implemented locally. `npm run build:app`, `npm run native:sync`, Functions build + 12 tests, 65 focused private/media/offline tests, Android debug build, iOS generic build, and iOS simulator build pass. Simulator install/launch succeeds but the current WebView screen is black; startup rendering needs diagnosis before ordinary mobile authentication/journaling can be accepted. Android emulator has no complete system image; no physical Android device is attached. The hosted bridge and Functions changes are not deployed, so authenticated account-owned journal persistence, native private storage isolation, and capture recovery remain unverified. No external deployment or signing configuration was changed. Details and exact release requirements: ../../implementation/2026-10-26-capacitor-mobile.md; build/runtime artifact: ../../evidence/native-mobile/.

## Per-record encrypted private backup and restore — 26 October 2026

Existing private journal flow now backs up one saved text history or media original into a password-encrypted `.lulubackup`; same-account restore re-encrypts using the current device key. It excludes drafts, unsaved edits, whole-vault contents, passkeys and device keys. Conflict IDs are not overwritten; identical saved records are idempotent. Fresh-key IndexedDB restore and exact media bytes/metadata pass local tests. Nine backup-focused cases are part of 127 passing combined regressions; hosted build and Firebase guard pass. Browser download and synthetic two-version restore/reopen/quick-exit were observed; tab and server are closed. No real owner record, physical phone, cloud mutation, commit, push or deployment. See ../../implementation/2026-10-26-private-backup.md, ../../reports/private-backup/2026-10-26-review.md, and ../../evidence/private-backup/.

## Privacy model compatibility spike — 26 October 2026

This session owns technical privacy/model work from the complete saved discussion in docs/technical/2026-10-26-privacy-intelligence-context.md. Formal SDD remains paused. The initial isolated GLiNER ONNX/Capacitor compatibility spike is recorded below. Preserve concurrent UI/onboarding/auth work; Google authentication remains with Product Implementation. No external deployment, paid inference, push or publication authorized here.

## Privacy model compatibility outcome — 26 October 2026

Real GLiNER Small v2.1 INT8 runs in isolated desktop-browser WASM through Cantoo3.3.0 and the new shared PrivacyProcessor, with lightweight Tokenizers.js0.2.0; independent Rust tokenizer IDs/masks and Python CPU inference pass. Model/tokenizer/config download is192,063,469bytes; synthetic email miss and author-pronoun distancing limitation are recorded. Clean replay: model load1,257ms, nine inference calls113–180ms; desktop-only, no native/offline phone/memory claim.

Published plugin's Swift Capacitor7.x constraint fails against LuLu8.5. Shared processor/detector contracts and explicit journal_only/local/cloud_demo selection remain. The browser work below uses direct ONNX Runtime Web and does not install the incompatible native plugin. The earlier spike evidence, accidental root npmci recovery, and existing limitations remain in .sdd/reports/privacy-model/2026-10-26-compatibility.md and docs/technical/2026-10-26-privacy-model-spike.md.

## Browser privacy model demo — 26 October 2026

Added an unauthenticated `/privacy-demo` route, an account-menu Settings screen, checksum-verified model storage in IndexedDB, local model discovery/removal/storage status, and a before/highlighted-source/after view with editable replacement-library choices. In local preview, model artifacts can be copied from the existing local cache. Settings can now prepare the ONNX session in tab memory, keep it warm across Settings/demo navigation, show readiness, and unload it; text processing only happens after an explicit Run action. Email and phone patterns have a separate visible “format check” label; GLiNER model matches show confidence. Repeated identical mentions share a replacement. Text is not sent or saved by the demo; only model/tokenizer files enter IndexedDB. The browser cannot offer a consistent arbitrary-folder picker, so this uses private site storage and explains that in Settings. The pinned package is about192MB. Production route fallback is already configured for Firebase Hosting, but no host deployment or model download from the production domain occurred.

The Vite built-preview server exposes only four allowlisted files from `/tmp/lulu-privacy-spike` through a loopback-only development route. Settings detects those files and offers to copy them into IndexedDB locally; production still fetches the pinned Hugging Face artifacts. `npm run build:app` and its app-only bundle verifier pass. A local built preview is at http://127.0.0.1:5187/privacy-demo. The new direct ONNX Runtime Web installation, warm-up and inference path has not yet completed browser acceptance; only the earlier isolated plugin-based spike has inference evidence. Existing model email misses/English-only limits remain, every result needs review, and physical mobile behavior is untested. No cloud deployment, push, commit or publication.

## Profile/settings destination — 26 October 2026

Avatar Settings now routes to a full-screen account/settings page matching the warm paper direction; optional model settings remain a linked full-screen destination. Device-local preference storage supports reduced motion; text enlargement follows device/browser controls, and current English availability is stated. Storage wording distinguishes ordinary account entries from encrypted device-local private records and per-record export/backup. No side panel or bottom-nav change. Source changes were reviewed only; working-site/owner/device acceptance and deployment remain pending. No tests were run.

## Stories collection navigation — 26 October 2026

The existing Stories browse now derives each curated group from actual ordinary saved entries. Both existing collection actions filter the existing list to the group's complete source entries; search/type filters still apply, and a dismissible collection chip clears the selection. No new panel/layout or sample content. Source review only; no tests, working-site/device acceptance or deployment.

## Everyday navigation and Library — 26 October 2026

Lower navigation now uses the saved Home, Journal, Write, Stories and Library component-reference destinations. The existing Leaves list is reused for Journal and Stories with per-destination collection defaults. Library uses a separate page module and shared ordinary-entry card, with search, collection/favorite filters and tags derived from saved records. The former fictional People/Places/Protected controls are removed from this route. Notes/tasks still need a data model. Source review only; no tests, working-site/device acceptance or deployment.

## Read/Edit behavior — 26 October 2026

Read now conceals protected title/body/tags/date until verification; original display requires an active private session and loaded original bytes. Removed the fake Listen indicator and unavailable protected Edit button. Ordinary Back, Edit, save and delete retain the originating Home/Journal/Stories/Library route. The existing private journal still owns local revision history; ordinary history and richer provenance are not claimed. Source review only; no tests or site/device acceptance.

## Ordinary composer exit guard — 26 October 2026

The existing ordinary Write/Edit back action now checks for unsaved title, body, kind or collection edits and offers a focused Keep editing / Discard and leave confirmation. Styling follows the existing warm LuLu surface and the product screen plan's confirmation-sheet direction; no side panel or new destination was added. Private composer behavior is unchanged. Source review only; no tests, browser/site or device acceptance, deployment, push or commit.

## Library ordinary metadata — 26 October 2026

Library favorites and topic filters were disconnected from Firestore because the watcher always supplied `false` and an empty tag list. The existing composer Options now edits a favorite boolean and up to 12 comma-separated topics; cloud writes/snapshots and local development storage preserve them. Firestore rules bound the optional fields to ordinary entries, preventing private-entry metadata from being written in cleartext. No page or navigation changes. Source review only; no tests, rules deployment, working-site/device acceptance, push or commit.

## Library notes and tasks — 26 October 2026

Library now switches between Entries, Notes and Tasks within the existing destination. Notes and tasks use separate account-owned Firebase records with live updates; note/task creation, editing and scoped deletion are provided, and tasks can be completed/reopened. The local-development fixture has its own browser-storage collection. Firestore rules require the active authenticated session and bound fields. TypeScript passed; no rules deployment, tests or working-site/device acceptance.


### Native passkey prompt repair — 2026-10-26

Confirmed native exchange creation HTTP 200 followed by hosted options HTTP 500: undefined SimpleWebAuthn option fields were being cached in Firestore. Also confirmed native /session origin rejection. Repaired option JSON persistence, restricted native session origin policy, hosted error/retry controls, and explicit support for passkeys on either existing trusted LuLu hostname. API and Hosting deployed successfully; 15 backend tests and guarded live handoff/security checks passed. Hosted bridge asset verified. Commit c7935a1; report .sdd/reports/native-auth/2026-10-26-passkey-handoff-repair.md. Owner asked to retry iPhone; real biometric/callback acceptance remains pending. No native rebuild required for these hosted/backend changes.


### iPhone passkey acceptance — 2026-10-26

After the deployed native passkey repair (c7935a1), the owner confirmed the iPhone passkey prompt and return to journal succeeded: "Done, it worked." Android passkey acceptance and journal edit/restart persistence remain separate checks.

### Privacy processing and guide release — 27 October 2026

The owner-approved main app Hosting release `f7fc164cbd450924` is served by the custom domain. The existing Johannesburg API is active with the owner-created server-only `OPENAI_API_KEY` Secret Manager binding and `openai_decisions` selected; 20 requests per UTC day are enforced. No signed-in live OpenAI inference has yet been verified. The model inventory and Loo Lu's local navigation/capture guide are in the app. Local browser checks exercised guide navigation, unsaved capture and discard; hosted build, Firebase guard, 12 guard tests and 26 backend tests passed. Firestore rules and Auth configuration were not deployed. Review the full limits and evidence in `../../reports/web-privacy-pipeline/2026-10-27-release-and-guide.md`.

Owner corrected the guide's name to **Lu**. User-facing labels and accessibility text were updated and deployed in Hosting release `7a94e0b97063407f` on 27 October 2026; the custom domain served the new bundle. Build and Firebase guard passed. Earlier references to “Loo Lu” record the previous name only.

### Session, account and navigation work — 27 October 2026

Owner requested the refresh, sign-in, email, header, greeting, swipe and Lu guide fixes and confirmed the orb remains floating. Local implementation and checks are recorded in `../../reports/2026-10-27-session-and-navigation.md`. No new deployment was authorized or performed for these changes. Live provider enablement, real linking/refresh and mobile gesture acceptance are unverified; in-app native Google linking and welcome/security notification delivery remain open.

### README and public website link — 27 October 2026

At the owner's request, replaced the verbose local README with a concise hackathon introduction, kept the top navigation and added `docs/mobile-installation.md` for Android and iPhone steps. Confirmed the existing Android preview APK and that no public iOS download exists. The GitHub repository About website field now points to `https://lulu.thisisphila.co.za/`; verified through the GitHub API. README and guide edits are local and have not been pushed.

The owner clarified that the goal was to restore their earlier README presentation, not simply shorten it. Rebuilt the local README from the owner-authored `b56af3c` version, retained its original introduction, experience table, navigation and project context, removed release/status reporting, and updated only the live-domain and mobile-access information. README and guide remain local.


### Mobile preview distribution — 2026-10-27

Published private GitHub prerelease android-ios-preview-2026-10-27 with debug Android APK, existing registered-iPhone development App.app ZIP and SHA-256 checksums. Updated GitHub main README in e09f5ca and set repository description; verified downloaded package checksums, Android archive integrity and iOS app signature. Release packages were built from a dirty local working tree and are not reproducible from the tag; this is disclosed on GitHub. iPhone profile expires 2026-11-02 05:22 UTC. Exact published builds have not been device-accepted; TestFlight and full mobile journal/model acceptance remain pending. Report: .sdd/reports/mobile-distribution/2026-10-27-preview.md.


### Public GitHub visibility — 2026-10-27

Owner made ThisIsPhila/LuLu public in Arc and chose to keep the iPhone development archive private because its provisioning profile contains a device identifier. Removed that release asset; local verified ZIP remains in dist/mobile. Old iOS URL returned HTTP 404; Android APK URL returned HTTP 302. Release notes/checksum now reference Android only; GitHub main README updated in b28897c. The iOS asset may have been available during the short interval between the public visibility change and removal.
