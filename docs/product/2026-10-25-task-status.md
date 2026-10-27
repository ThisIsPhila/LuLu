# LuLu implementation tracker

**Latest release update:** Login is the default entry with optional Onboarding; localhost has isolated development entry. Email/passkey live checks passed on `lulu.thisisphila.co.za`; Product Implementation on Luna High saved the missing Google OAuth callback; interactive Google/native acceptance remains open. See [current release and verification](../implementation/2026-10-26-auth-domain-release.md). Older snapshot statements below are historical where superseded by this release.
Updated 26 October 2026 (SAST). Build-first tracker, not an SDD phase. Keep implementation, deployment and phone acceptance separate. The owner confirms the existing hosted passkey sign-in works. Latest recorded parent Hosting release: cf2ca69e213e14dd. New email/password and Google provider code remains local. Later private capture and native work have not been accepted as a complete phone journey. See [latest progress assessment](../implementation/progress-assessment-2026-10-26.md).

## Completed foundation

| Task | Evidence / practical boundary |
| --- | --- |
| Host only the main app on Firebase | Main site deployed; demo/frame and internal review library stay local. |
| Passkey registration and returning sign-in | Runtime signing permission repaired; isolated live register/login/private-step-up test passed and temporary test account cleaned. Owner confirms the existing hosted passkey sign-in works. |
| Enter journal immediately after verified auth | Success/Continue gate removed and Hosting release verified. |
| Put sign-out in account/avatar menu | No permanent sign-out-only panel. Private exit controls preserved. |
| Owner-scoped Firestore ordinary journal | Save, load, add, same-ID edit/reclassification, single ordinary-entry deletion, and saved-source export implemented; emulator and export whitelist tests pass. Not deployed or device-accepted in this slice. |
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
| Trusted contacts | Encrypted names/phone numbers can be added, edited, removed and called from the private hub. The UI identifies them as saved notes, not authenticated companions. Safety prompts are session-only; a small source-linked South African government support list supports search and phone handoff. | Actual companion invitations, authenticated sharing and permission enforcement; broaden and maintain the verified support directory, language/location search and referral workflows. |
| Disclosure/companion contracts | Local typed scope, source/revision/purpose and permission policy functions | User-facing disclosure review, recipients, key delivery, revocation and audit integration. |
| Search/library/organisation | Lower navigation now follows Home, Journal, Write, Stories, Library. Library has ordinary search, collection/favorites/topic filters, plus account-owned Notes/Tasks CRUD and task completion; entry cards are shared with Journal/Stories. Home Quick note/Task now route into the matching existing Library form. | Validate ordinary/private boundaries on the working app; deployment/rules and target-device acceptance remain open. |
| Stories | Ordinary Story entries can be assigned a collection name in existing composer Options; Stories opens matching source entries, and grouped entries now read chronologically in the existing Reader with previous/next navigation. | Local code/rules/UI only; no Firebase deployment or owner-device acceptance. Collection description/cover and explicit ordering/curation remain open. No sample content was added. |
| Library notes, tasks, favorites and topics | The Library now has Entries/Notes/Tasks sections. Notes/tasks support account-scoped create/edit/delete; tasks can be completed/reopened. Favorite and up to 12 normalized topics are edited in the existing composer Options and carried by Firebase account writes/live snapshots. Firestore rules bound both record types and metadata. | Local source/rules only; no rules deployment, tests, working-site/device acceptance. |
| Home activity | The reflection card no longer claims a 06:00 schedule; the seven-bar activity graphic and seven-day total now come from ordinary saved-entry timestamps. | Source review only; no tests, working-site/device acceptance or deployment. |
| Read/Edit | Ordinary and protected entry content is access-scoped; fake listen playback and unavailable protected-edit affordances were removed. Back/edit/save/delete route back to the originating section. | Read/browser/device acceptance remains pending. Ordinary revision history and richer provenance need real data before UI. |
| Ordinary Write/Edit exit | The existing back action now checks for unsaved title, text, kind or collection changes and offers Keep editing or Discard and leave. Private draft behavior is unchanged. | Source review only; no tests, working-site/device acceptance or deployment. |
| Profile/settings | Avatar now opens a full-screen account/settings destination with a device-local reduced-motion preference, current language availability, account/device storage notes, model-settings navigation and sign-out. Preferences use a browser-local service. | Review on the working app and target devices; language expansion and retention controls remain open. This code change is local and not owner-accepted or deployed. |
| Auth diagnostics/recovery | Tested safe server diagnostics and post-registration recovery code | Server diagnostic code remains local/unpublished; deploy deliberately if required. |

## Remaining implementation tasks

1. Complete the phone acceptance journey for ordinary edits, private save/reopen/history, quick exit and record isolation.
2. Accept the new local durable-capture slice on target devices: encrypted autosave/restart recovery, quota retry, interrupted promotion and lock confidentiality are implemented/tested locally. Browser eviction, OS/power interruption and native acceptance remain open; do not promise recovery of uncommitted edits.
3. Complete offline access/capture: production static-shell caching is implemented and locally verified with the origin server stopped; server-verified online sign-in remains required. Design and implement prior online device/account provisioning and fresh local cryptographic unlock; cached app files alone do not authorize private access.
4. Accept/complete media capture: private image picker/camera hint, microphone controller, encrypted exact-byte originals and concealed reopening are implemented locally (93 focused tests and synthetic image journey pass). Native camera/microphone/codec and authenticated phone acceptance, ordinary attachments and text/media association remain open.
5. Complete export and lifecycle: readable local text/history and exact-media export, scoped local deletion, and password-encrypted per-record backup/restore are implemented. Synthetic browser download/restore, fresh-key fake-IndexedDB restore and 127 combined focused regressions pass. Native-phone acceptance, ordinary/cloud lifecycle and scheduled retention remain open. Backups exclude drafts/unsaved edits, the whole vault and device/passkey keys.
6. Implement local direct/indirect PII and contextual-risk detection, editable concealment and redacted disclosure copies. One saved private text revision now has a manual, purpose/recipient-labelled copy review with exact source/hash binding and deliberate clipboard handoff; there is no automatic identifier/risk detection, persistence, authenticated recipient, remote delivery, or complete anonymisation claim.
7. Connect approved Decisions API operations through the disclosure/privacy boundary, with evaluations and cost authorization; no provider transport is currently implemented.
8. Implement companions: invitations/acceptance, independent view/contribute/voice/backup permissions, statements, auditing and revocation.
9. Implement opt-in time-bounded Trails/location capture and separate active/history recipient permissions.
10. Build a maintained, verified support directory and explicit contact/referral flows; professional integration is separate from a phone link.
11. Add/evaluate South African interface languages, mixed-language processing, translation/transcription and original-language preservation by operation.
12. Home quick note/task affordances now open the existing Library forms locally; complete settings and page-by-page visual/accessibility/responsive acceptance.
13. Resolve daily mock-content behavior against one-time editable starters before adding generation or a scheduler; keep generated content out of evidence/statistics.
14. Verify live artifact cleanup and actual usage/billing; guardrails do not establish a zero bill or a working retention policy.
15. Later extensions: verified professional access, properly governed genuine aggregate research and platform-supported alternate native app icons. No invented statistics, diagnosis or emergency-dispatch claims.

Recommended next implementation order: device acceptance → durable/offline text capture → media → export/backup/recovery → disclosure/PII → companions → Trails/support/language expansion. This is sequencing, not removal of the broader product goal.

## Local correction — 26 October 2026

- Existing private-writing components now reuse warm tactile light styling, LuLu branding, pill controls and limited charcoal preview/history. Responsive synthetic screenshots and short-viewport reachability are recorded in `.sdd/evidence/private-visual-alignment/`; authenticated phone/owner design acceptance remains pending. No new page designs adopted.
- Ordinary Home/Leaves now exclude legacy protected records from lists, counts, weekly totals and search. Leaves search/type filters work; Home tag search directly opens results. Removed invented Leaves deck/count/read-time metadata and the fixed “7 entries / 100% on-device” claim. Curated content is shown only when backed by matching ordinary records.
- 60 focused regression tests and hosted main-only build pass. Synthetic browser checks confirm Home tag search/open, Stories filtering and no protected search matches under All. Local fixture verification is not authenticated app or phone acceptance. No deployment.
- Ordinary Story creation now uses the existing Home Stories filter → lower Write action; editing preserves kind. Reclassification UI remains open. Offline authorization/capture, media and export/backup/recovery remain open in the order above.
- The private representation inspector now lists only user-configured references, stages Add/Change/Keep and encrypts Confirmed data in an owner/session-bound local store. It returns to the still-mounted private composer with the current draft intact; counts shown there derive from the draft text. TypeScript passes; no tests/browser verification were run for this slice. Manual working-app acceptance remains pending. See `.sdd/reports/representation-inspector/2026-10-26-review.md`.
- Usage tool reading conflicted with owner-visible usage. Do not use that source for pacing until independently reconciled; latest owner screenshot shows 85% session and 58% weekly remaining, not a continuing live reading.

### Collection persistence and UI correction — 26 October

Backend ordinary Story save/reclassification support and kind-preserving edits pass local Firestore emulator coverage including starter preservation. Reader metadata reflects actual records. New Stories use the existing Home Stories filter → Write action; existing composer Options support reclassification. The ordinary-actions synthetic browser review confirms Story editing, saved-source export and the scoped delete-confirmation screen; it did not click the destructive action. Preserve the established interface; do not invent page layouts, side panels or controls. Local changes only; owner-device acceptance and deployment remain pending. See `.sdd/reports/ordinary-collections/2026-10-26-review.md` and `.sdd/reports/ordinary-actions/2026-10-26-review.md`.

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

### Ordinary saved-entry actions — 26 October

The existing composer More/Options controls now select Journal or Story for new writing and same-ID edits, export a saved-source JSON copy using a field allowlist, and permanently delete one ordinary entry after explicit acknowledgement. Backend deletion checks the requested owner and `protected === false`; Firestore session rules remain authoritative. Eight local Firestore emulator cases cover kind persistence, protected/foreign-owner/anonymous/expired-session denial, selected-record scope, and starter non-reseeding; two export tests check the whitelist and protected-record rejection; TypeScript passes. Local synthetic browser evidence verifies Story edit, saved-source download with private fields excluded, and the scoped deletion confirmation screen; no destructive browser click was recorded. Owner-device acceptance and deployment remain pending. No private-record or cloud-collection lifecycle is added. See [.sdd review](../../.sdd/reports/ordinary-actions/2026-10-26-review.md) and [browser evidence](../../.sdd/evidence/ordinary-actions/browser-check.txt).

### Native providers and device installation — 26 October

Local auth now offers passkey, email/password and Google paths. The local Firebase configuration enables the additional providers and records LuLu's support email; no Auth, Hosting or Functions deployment was performed. The native Google/passkey bridge and API exchange therefore still need an authorized release and live verification. Private access continues to require passkey step-up.

A refreshed Android debug package installed and its launch command passed. LuLu also built, installed and launched on the owner's iPhone after a free-profile slot was released. These are installation/process results; no usable screen, successful native login, account-owned journal restart/persistence or private-capture journey is evidenced on either device. The earlier black iPhone simulator screen remains a separate recorded observation. See the native-auth report and current progress assessment.

### Current product batch and UI handoff — 26 October

The ordinary saved-entry batch has local emulator evidence and synthetic browser review of Story edit, saved-source export and scoped delete confirmation; the browser did not execute the destructive delete action. The representation inspector now uses actual configured values and encrypted session-bound local references; see `.sdd/reports/representation-inspector/2026-10-26-review.md`. No authenticated owner/device acceptance or deployment is implied.

The screen plan maps this work to Journal/Write and contextual People/representation controls. The fourteen-screen onboarding is documented but not integrated; it conflicts with the current sign-in-first order by creating an entry before enrollment. UI Design's upcoming handoff and this flow decision are rendered in the internal reader. Current post-login page critique remains distinct from the previously approved welcome screen.
