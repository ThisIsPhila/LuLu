# LuLu implementation tracker

Updated 26 October 2026 (SAST). Build-first tracker, not an SDD phase. Keep implementation, deployment and phone acceptance separate. The owner confirms native sign-in works. Latest parent Hosting release: cf2ca69e213e14dd. A subsequent bounded durable-private-text slice is implemented and verified locally; it has not been deployed or accepted on the owner's phone. See [delivery and limits](../implementation/2026-10-25-durable-private-capture.md).

## Completed foundation

| Task | Evidence / practical boundary |
| --- | --- |
| Host only the main app on Firebase | Main site deployed; demo/frame and internal review library stay local. |
| Passkey registration and returning sign-in | Runtime signing permission repaired; isolated live register/login/private-step-up test passed and temporary test account cleaned. Owner confirms native sign-in works. |
| Enter journal immediately after verified auth | Success/Continue gate removed and Hosting release verified. |
| Put sign-out in account/avatar menu | No permanent sign-out-only panel. Private exit controls preserved. |
| Owner-scoped Firestore ordinary journal | Save, load, add and same-ID ordinary edit implemented; owner/access/shape rules tested. |
| Database-backed starter content | Three fictional templates copied once into each account as editable private/unprotected entries. No shared read-only Sample journal UI. |
| Preserve starter changes across sign-ins | Real emulator tests cover concurrent initialization, edits/deletions and preexisting target IDs. |
| Keep real logo/branding assets | Main app serves the chosen logo assets. Full visual design acceptance is separate. |
| Firebase configuration guardrails | Staged pre-commit and predeploy checks, small resource limits, main-only output checks and documented Blaze/free-allowance boundary. These are not hard spend caps. |
| Document product direction and data/flow map | Full discussion retained; consolidated goal separates owner decisions from proposals and verified implementation. |

## Implemented but incomplete or awaiting acceptance

| Feature | Implemented | Next task |
| --- | --- | --- |
| Private text records | Local AES-GCM storage, save/reopen/list and original retention; integrated frontend code in the parent's build. Optional user-managed encrypted per-record backup/restore is available. | Verify native phone capture/save/reopen/lock and storage failure cases. Backup restore requires the same account and file passphrase; it is not automatic or account recovery. |
| Durable private drafts (new local slice) | Encrypted autosave snapshots, owner/session-gated restart recovery, optimistic version checks, quota/abort handling, atomic promotion and lost-acknowledgement reconciliation; 56 focused tests and a local browser fixture pass | Verify on target phones, actual eviction/quota/power interruption and the authenticated app journey. Only completed autosaves are recoverable; no complete offline unlock or key recovery. Not deployed. |
| Record revisions/history | Appended revisions and source relationships; local integrity/session checks, export, deletion and per-record backup/restore | Verify native phone behavior; ordinary/cloud lifecycle and scheduled retention remain open. |
| Per-record encrypted backup and restore | Password-encrypted saved text history or media-original file; same-account restore re-encrypts with the current device key and rejects conflicting IDs | Native-phone acceptance, ordinary/cloud lifecycle and scheduled retention remain open. This does not back up drafts, unsaved edits, the whole vault, passkeys or device keys. |
| Paragraph privacy | Reveal/edit one paragraph, conceal others, explicit history/preview reveal | Verify target-device UI and implement/evaluate actual contextual scrubbing. |
| Private entry/exit | Passkey step-up, Write privately route, quick exit, Escape/background/expiry cleanup and stale-result guards; new local autosave preserves committed recovery snapshots | Phone tests for draft behavior, keyboard, interruption and concealment. Newest uncommitted edits may be lost on sudden exit; no locked/background plaintext flush. |
| Privacy transformation | Configured entity replacements and narrative distancing | General PII/context detection, correction continuity and language-specific quality evaluation. |
| Trusted contacts | Encrypted names/phone numbers and explicit phone links | Actual companion invitations, authenticated sharing and permission enforcement. |
| Disclosure/companion contracts | Local typed scope, source/revision/purpose and permission policy functions | User-facing disclosure review, recipients, key delivery, revocation and audit integration. |
| Search/library/organisation | Existing browse/search/filter surfaces | Validate all ordinary/private boundaries; complete useful notes/tasks/settings flows. |
| Auth diagnostics/recovery | Tested safe server diagnostics and post-registration recovery code | Server diagnostic code remains local/unpublished; deploy deliberately if required. |

## Remaining implementation tasks

1. Complete the phone acceptance journey for ordinary edits, private save/reopen/history, quick exit and record isolation.
2. Accept the new local durable-capture slice on target devices: encrypted autosave/restart recovery, quota retry, interrupted promotion and lock confidentiality are implemented/tested locally. Browser eviction, OS/power interruption and native acceptance remain open; do not promise recovery of uncommitted edits.
3. Complete offline access/capture: production static-shell caching is implemented and locally verified with the origin server stopped; server-verified online sign-in remains required. Design and implement prior online device/account provisioning and fresh local cryptographic unlock; cached app files alone do not authorize private access.
4. Accept/complete media capture: private image picker/camera hint, microphone controller, encrypted exact-byte originals and concealed reopening are implemented locally (93 focused tests and synthetic image journey pass). Native camera/microphone/codec and authenticated phone acceptance, ordinary attachments and text/media association remain open.
5. Complete export and lifecycle: readable local text/history and exact-media export, scoped local deletion, and password-encrypted per-record backup/restore are implemented. Synthetic browser download/restore, fresh-key fake-IndexedDB restore and 127 combined focused regressions pass. Native-phone acceptance, ordinary/cloud lifecycle and scheduled retention remain open. Backups exclude drafts/unsaved edits, the whole vault and device/passkey keys.
6. Implement local direct/indirect PII and contextual-risk detection, editable concealment and redacted disclosure copies. Do not claim complete anonymisation.
7. Connect approved Decisions API operations through the disclosure/privacy boundary, with evaluations and cost authorization; no provider transport is currently implemented.
8. Implement companions: invitations/acceptance, independent view/contribute/voice/backup permissions, statements, auditing and revocation.
9. Implement opt-in time-bounded Trails/location capture and separate active/history recipient permissions.
10. Build a maintained, verified support directory and explicit contact/referral flows; professional integration is separate from a phone link.
11. Add/evaluate South African interface languages, mixed-language processing, translation/transcription and original-language preservation by operation.
12. Complete ordinary notes/tasks organisation, settings and the latest page-by-page visual/accessibility/responsive work.
13. Resolve daily mock-content behavior against one-time editable starters before adding generation or a scheduler; keep generated content out of evidence/statistics.
14. Verify live artifact cleanup and actual usage/billing; guardrails do not establish a zero bill or a working retention policy.
15. Later extensions: verified professional access, properly governed genuine aggregate research and platform-supported alternate native app icons. No invented statistics, diagnosis or emergency-dispatch claims.

Recommended next implementation order: device acceptance → durable/offline text capture → media → export/backup/recovery → disclosure/PII → companions → Trails/support/language expansion. This is sequencing, not removal of the broader product goal.

## Local correction — 26 October 2026

- Existing private-writing components now reuse warm tactile light styling, LuLu branding, pill controls and limited charcoal preview/history. Responsive synthetic screenshots and short-viewport reachability are recorded in `.sdd/evidence/private-visual-alignment/`; authenticated phone/owner design acceptance remains pending. No new page designs adopted.
- Ordinary Home/Leaves now exclude legacy protected records from lists, counts, weekly totals and search. Leaves search/type filters work; Home tag search directly opens results. Removed invented Leaves deck/count/read-time metadata and the fixed “7 entries / 100% on-device” claim. Curated content is shown only when backed by matching ordinary records.
- 60 focused regression tests and hosted main-only build pass. Synthetic browser checks confirm Home tag search/open, Stories filtering and no protected search matches under All. Local fixture verification is not authenticated app or phone acceptance. No deployment.
- Ordinary Story creation now uses the existing Home Stories filter → lower Write action; editing preserves kind. Reclassification UI remains open. Offline authorization/capture, media and export/backup/recovery remain open in the order above.
- Usage tool reading conflicted with owner-visible usage. Do not use that source for pacing until independently reconciled; latest owner screenshot shows 85% session and 58% weekly remaining, not a continuing live reading.

### Collection persistence and UI correction — 26 October

Backend ordinary Story save/reclassification support and kind-preserving edits now pass nine emulator tests including starter preservation. Reader metadata reflects actual records. The new composer collection-selector controls were removed after owner rejected further UI changes; the later existing-filter/Write integration enables new Stories without that selector; reclassification UI remains open. Synthetic fixture screenshots are historical and unaccepted. Preserve the established interface; do not invent page layouts, side panels or controls. Local changes only; no deployment/phone acceptance. See `.sdd/reports/ordinary-collections/2026-10-26-review.md`.

### Offline startup prerequisite — 26 October

Generated production-only static-shell cache now loads the existing welcome/sign-in screens after the local preview server is stopped, including a fresh sign-in query route. It caches built app files/local logos only; auth, APIs, records, external fonts, docs/demo are excluded. Normal waiting updates avoid forced reloads. Nine worker tests and sixty ordinary/private regressions pass (69 total); hosted build/main-only packaging and Firebase guard pass. Offline account access/private unlock/capture remain incomplete. No layout changes, deployment or phone acceptance. See `.sdd/reports/offline-shell/2026-10-26-review.md`.

### Private media — 26 October

Private writing now captures local image files (native camera hint) and microphone audio into an immutable owner/session-bound binary vault. Metadata-only lists, explicit reveal/conceal, stop/exit cleanup and quota retry use the existing writing card/record list; no new page/sidebar/CSS.93 focused tests, build/main-only packaging and Firebase guard pass. Actual-component synthetic image save/reload/reveal/exit verified; no real hardware or authenticated phone test. Captures are separate records; ordinary attachments, text/media revision association, offline reauthentication, export/delete/backup remain open. No deployment. See [implementation](../implementation/2026-10-26-private-media.md).

### Readable local private export — 26 October

Existing private detail now prepares a readable copy and requires a separate explicit download after scope review. Text JSON includes the original/all saved revisions; media is exact original bytes without app metadata. Cancel/exit discard prepared exports; downloaded files remain outside LuLu.98 focused tests, hosted main-only build, Firebase guard and synthetic text/image downloads pass. Ordinary/legacy-cloud export, encrypted backup/restore, deletion and phone/native download acceptance remain open. No deployment or new page/sidebar/CSS. See [implementation](../implementation/2026-10-26-readable-private-export.md).

### Local private deletion —26October

Existing detail now confirms scoped permanent deletion of a local original/history/linked drafts or media pair. Atomic snapshots, owner/session checks, rollback and stale-autosave protection pass; historical-parent edits still save recovery drafts.118 focused tests, build/packaging/guard pass. Browser verified scope/acknowledgement/cancel/exit; no destructive browser click or owner deletion. Ordinary/cloud deletion, retention and phone acceptance remain open. Per-record encrypted backup/restore was implemented in a later batch; see the adjacent section and [implementation](../implementation/2026-10-26-private-backup.md). See also [deletion details](../implementation/2026-10-26-private-deletion.md).

### Encrypted per-record backup and restore — 26 October

Existing private journal flow now exports one saved text history or media original into a password-encrypted `.lulubackup` file. Restore requires the same authenticated account and re-encrypts under the current device key; identical history is idempotent and conflicting IDs are not overwritten. Nine backup-focused cases are included in 127 passing combined regressions; hosted build and Firebase guard pass. Browser download and synthetic-record restore/reopen were observed. Fresh-key loss/restore and exact media bytes/metadata are covered by fake-IndexedDB tests, not a physical-phone test. Per-record backups exclude drafts, unsaved edits, the full vault, passkeys and device keys. No deployment or cloud mutation. See [implementation](../implementation/2026-10-26-private-backup.md) and [.sdd review](../../.sdd/reports/private-backup/2026-10-26-review.md).
