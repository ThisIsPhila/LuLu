# LuLu: product direction and delivery map

25 October 2026. Product and engineering working document, maintained alongside implementation under the owner's build-first exception. This records the goal and the observed gaps; it does not approve the draft SDD phase, claim launch readiness or authorize external changes.

## The goal

LuLu lets someone use an ordinary writing application, privately preserve something important, return quickly to ordinary content, and later choose whether to understand, organise or share the record. Capture, documentation, understanding and support should remain connected in one experience. The person retains control of the original and when anyone else becomes involved.

Everyday use must be useful in its own right. Private capture defaults to device-local protection. Concealed prose is a representation of the original, not evidence that all identifying context was removed. An authorised disclosure is a separate copy for a named purpose; it never silently replaces the original.

Source: the complete [owner/assistant discussion](2026-10-25-product-discussion-source.txt) and the [current handoff](2026-10-25-direction-handoff.md). The source has no role delimiters; the opening request and the owner response beginning “I like the changeable app icon idea” are owner statements. The long competitive analysis and subsequent “Product and implementation foundation” are assistant responses. Their proposals are useful implementation inputs, not independently verified owner decisions or research.

## What the owner settled

- Keep a functional ordinary journal/notes surface, with lightweight tasks and quick entries as part of the direction. Do not force a formal incident report to capture something.
- Private viewing uses passkeys. Ordinary-to-private writing, paragraph concealment, editable scrubbing, quick capture and quick exit are central priorities.
- Private input stays on the device by default. The user learns the processing policy in advance; urgent capture must not depend on new disclosure decisions.
- Preserve originals for documentation, with traceable appended changes and companion contributions. Content remains the owner's.
- Trusted companions may help document voice notes, contribute statements, hold backups, and follow optional location “Trails”; permissions must reflect the specific action.
- Support South African languages, mixed-language content, offline use, long-term access and export/recovery.
- Offer grounded explanations and paths to people or services. Verified professional access and collective research are future extensions; models must never manufacture population counts.
- Native alternative app icons are desired for an eventual app. They are not a completed web capability.

The latest handoff corrects earlier mock-data wording: fictional starters are ordinary, account-owned, unprotected editable entries, copied once from Firestore with edits/deletions preserved. Daily mock generation is an earlier request still needing reconciliation with that later rule; this delivery adds no scheduler, fabricated personal history or recurring cloud usage. Starter provenance must remain identifiable and excluded from evidence/research even if its text is edited.

## How the experience connects

| Flow | Intended behaviour | Data consequence |
| --- | --- | --- |
| Start / return | Useful journal home, write, browse, organise; discreet private explanation and passkey setup | Ordinary content stays separate from private originals; starter provenance persists |
| Write ordinarily | Create/edit notes; later deliberate private conversion is possible | Conversion preserves the chosen original and creates a distinct private record/representation |
| Enter private | Protected entry, editor trigger or configured capture route; verify before private viewing | Open one bounded local session; server authentication and local decryption are separate authorities |
| Private writing | Write naturally; conceal completed paragraphs once focus moves a paragraph away, with optional correction/reveal while authorized | Original text and its versions persist independently from display projections; no automatic remote save of raw text |
| Quick text/image/voice capture | Minimal actions; locally acknowledge durable save before claiming success | Preserve exact input bytes, media type and device-reported capture metadata; transcript/translation is derived |
| Normal exit | Save chosen work locally, lock, return to ordinary content | Clear originals and private previews from UI state; no implicit disclosure |
| Quick exit / background / expiry | Conceal immediately, invalidate session and late asynchronous results; stop audio/camera tracks predictably | Pending storage completion is reported truthfully on return; no hidden recording or new outbound disclosure |
| Reopen / history | View original, revisions, annotations and actor/source relationships | Edits and contributions append; originals remain unchanged through the supported storage API |
| Understand | User selects records, sees possible themes and supporting passages/resources | Interpretation is separate, versioned derived content with uncertainty; no diagnosis or invented statistics |
| Privacy review / share | Prepare and inspect a recipient/purpose-specific disclosure under an established policy or deliberate action | Local redactions, source version and policy recorded; authorization does not mean anonymisation is proven |
| Companion | Invite, accept, grant a narrow scope, contribute or revoke | Viewing, appending, receiving voice, backup custody and Trail access are independent; contributed statements have their own actor |
| Trail | Explicit start, recipients, stop/expiry and history-retention choice | Location is separate from normal journal backups; active and historical access differ |
| Help | Choose a verified contact/referral; optionally prepare selected material | A phone link, referral, digital handoff and integrated provider are different capabilities |
| Backup / export / recovery | Select encrypted backup or deliberate readable export, verify restore and deletion behaviour | Key recovery is separate from account access; companion backup possession does not imply decryption authority |

The flow descriptions are intended behaviour. Browser app-switcher screenshots, monitored devices and operating-system history are outside an ordinary web UI's complete control; concealment is not a guarantee that these surfaces leave no trace.

## Surfaces and tools

Ordinary surfaces: home/recent entries, notebook/library and search, editor, quick notes/tasks, ordinary settings and starter identification. Private surfaces: record library, paragraph-aware editor, quick capture, original/history/evidence viewer, privacy review and disclosure preview, optional understanding, companions and permissions, Trails, support directory, secure settings/export/backup/recovery. These are responsibilities, not a requirement to add a visible navigation tab for every capability.

Use local browser storage/cryptography for the private foundation. Existing Firebase remains the account and ordinary-journal infrastructure. Media capture, offline shell caching, local language processing and disclosure policy enforcement need explicit adapters. None of the new foundation work should silently route input into existing cloud journal saves.

## Data responsibilities

| Object | Meaning and rules |
| --- | --- |
| Ordinary entry | Account-owned editable content. Protected status and starter provenance are separate fields/concepts |
| Private original | Exact captured bytes plus media/language/capture metadata, encrypted locally; no network dependency to store |
| Revision / annotation / transcript | Appended derived object linked to its source; actor and device-reported time retained; never substitutes for original bytes |
| Representation | Concealed writing for display; reversible private associations stay private; context may still identify someone |
| Evidence history | Source links, hashes and append-only operations through the application; hashes indicate byte consistency, not event truth, trusted time or legal admissibility |
| Disclosure | Source version, recipient, purpose, selected fields, redactions and policy/review state; created separately from originals |
| Decision result | Operation/schema/provider version, source references, supported output and review/uncertainty; cannot itself authorize sharing |
| Companion grant | Grantor, recipient, action, exact record/evidence/Trail scope, start/expiry and revocation history |
| Trail | Owner-approved interval and encrypted observations, recipient permissions and retention; device location/time are observations |
| Backup / export | Versioned encrypted package or deliberately selected readable copy, key/recovery method and restore verification |
| Starter provenance | Original catalogue/seed identity, retained independently of later edits; excluded from evidence/aggregate input |

Language metadata belongs to each captured/derived object, with original-language bytes preserved. UI localisation, text privacy detection, contextual understanding, transcription, speech output and translation need independent language coverage evaluations; Unicode storage alone does not establish that support.

## Observed baseline and gaps

Source inspection on 25 October, in a dirty shared checkout. These are local code observations unless explicitly described otherwise. Historical deployment reports are not evidence that this new direction is deployed.

| Capability | What exists | Gap / next integration |
| --- | --- | --- |
| Account onboarding | `OnboardingAuth`, `AuthBoundary`, WebAuthn client and Firebase-backed verification | Existing private step-up requires the network; offline authenticated unlocking and device recovery unresolved |
| Ordinary journal | Home/story leaves, compose/reader, owner-scoped Firestore watcher/save | Tasks/organisation are not complete; parent chat owns ordinary editable starter closeout |
| Starters | Parent is implementing one-time catalogue-to-account copy and ordinary editing | Preserve provenance for future evidence exclusion; do not revert to read-only shared samples |
| Private sessions / exit | App has step-up expiry, visibility lock, generation/read guards, UI return and server lock request | New local vault needs integration; all capture and private drafts must respect the same lock; no screenshot safety guarantee |
| Concealment | Local entity substitutions/narrative distancing and session alias editing | Dictionary-based transform is not general PII/context detection; no completed paragraph concealment flow |
| Private persistence | `deviceVault.ts` AES-GCM non-extractable device key in IndexedDB; encrypted originals/contacts in Firestore | Existing protected save uploads concealed display text plus encrypted original. This differs from new on-device default; migrate via an explicit adapter without silently deleting or rewriting old records |
| Integrity | Existing journal save creates records; protected editing restricted | No original/revision/evidence history in the active UI; add local append-only foundation first |
| Media | Image/microphone affordances in existing components | No verified camera/recording, durable media capture or stop/save/exit lifecycle |
| Offline | Browser persistence helpers and retained legacy data | No complete offline launch/capture/reopen flow or key recovery; local module tests alone cannot prove device reliability |
| Understanding | No connected interpretation provider | Typed operations and disclosure boundary first; do not send raw content to a model |
| Companions | Encrypted contact names/phone numbers and telephone links | Not invitations, permissioned collaboration, sharing, delivery or backup recovery |
| Trails | No implementation observed | Permission model, time bounds, location consent, storage and expiry enforcement needed |
| Support | Existing UI help/contacts affordances | No maintained verified service directory, provider integration or professional portal |
| Backups / export | Existing encryption key is browser-bound, non-extractable | No portable key custody or verified backup/export/restore; account access does not restore a lost key |
| Hosting | Main-app-only correction belongs to parent chat | This chat neither deploys nor reintroduces demo/internal hosting |

## Decisions API: checked, not connected

Official OpenAI documentation was searched and opened on 25 October 2026. The [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) documents `POST /v1/decisions` with `gpt-6-luna`, with predicate, choice and score questions over text, images and JSON. It does not accept audio/files directly. These are provider question types; LuLu's operations such as disclosure-risk assessment or support-category selection are application contracts, not additional endpoints.

The published contract establishes an available service, not account access, an enabled integration or permission to spend. Typed model responses do not establish factual accuracy or immunity to hallucination. A remote service receives whatever input is sent to it. The foundation has no provider transport, paid API expansion or raw-content disclosure. Future use requires the local disclosure boundary, an authorized processing policy and representative evaluation; translation/transcription are separate operations.

Competitive and support-service claims in the pasted assistant response are research leads only. No competitor comparison, phone number, service availability, clinical/legal claim or statistical figure is promoted to verified product content here. Verify primary sources when building those specific paths; a future professional portal also needs actual organisation verification and access policy.

## Delivery order

The first local slice is now implemented and connected to the app: see [local private writing](../implementation/2026-10-25-local-private-writing.md). The baseline table above describes the starting point; the implementation note and dated evidence distinguish the new local capabilities from remaining gaps and historical deployment.

The next bounded local slice adds [encrypted draft autosave and restart recovery](../implementation/2026-10-25-durable-private-capture.md), with atomic promotion and storage-failure handling. This advances durable text capture, not offline unlocking, key recovery, media or the rest of the backlog.

1. Preserve the parent chat's ordinary-journal/starter/hosting work. Add independent local encrypted originals, append-only derived records and identity-bound integrity checks. Add typed privacy/interpretation/disclosure and scoped permission contracts. Test lock, tampering, concurrency and negative authorization cases locally.
2. Integrate local text capture and reopening with existing passkey success/exit callbacks after shared-file ownership clears. Route new private saves locally; label older cloud-backed records accurately. Add paragraph concealment projection and editing. Test delayed authentication/read/save races against exit.
3. Add real media capture and stop/save/exit handling, restart durability and offline app availability. Cover quota/storage failures and interrupted writes on target devices. Persist language metadata without assuming detection quality.
4. Add reviewed disclosure copies and local detection evaluations. Connect any external processing only under the established privacy and cost boundaries. No raw disclosure fallback after detection failure.
5. Build narrow companion sharing/contributions, encrypted backup and verified restore/export, bounded Trails, and verified support referrals. Professional access and collective research remain on the goal map but follow their own concrete integration/governance work.

No phase scaffolding, push, commit, publication, deployment or Firebase resource changes follow from this document. Keep Blaze/Johannesburg/second-generation resource limits and existing hooks; do not imply a hard spending cap or verified zero bill.
