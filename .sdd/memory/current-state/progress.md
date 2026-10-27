# Current State Progress

**Last updated:** 26 October 2026 (SAST)

Formal SDD progression remains paused. Phase 001 is an unapproved draft.

## Current implementation

- Existing web passkey sign-in and direct journal entry are live; account-owned Firestore entries and editable starters exist.
- A public `/privacy-demo` page now has local model storage controls and a before/highlighted/after PII review flow. Settings can copy the existing preview cache and prepare or unload the model in tab memory; the demo reuses that session. App build passes; local preview is at `http://127.0.0.1:5187/privacy-demo`. The new direct browser runtime still needs an end-to-end inference run; it is not deployed.
- Later ordinary actions and encrypted private capture/media/lifecycle work have local evidence and need release/device acceptance.
- Native iOS/Android packages have install/launch evidence. Usable screens and authenticated journeys remain unverified.
- Email/password and Google code/provider settings are local; no related Firebase deployment is recorded.
- Fourteen-screen onboarding and the broader screen plan are documented in the HTML reader.
- Avatar Settings now opens a full-screen account/settings view; a device-local reduced-motion preference, language availability, storage boundaries, model-settings navigation and sign-out are wired locally. Text enlargement follows device/browser controls. No browser/device acceptance or deployment was performed for this change.
- Stories now discovers all real curated groups in ordinary entries, and opening a group reveals its complete source-entry list. Layout is unchanged; no test or site/device review was run.
- Lower navigation now exposes Home, Journal, Write, Stories and Library; Library filters actual ordinary records by search, collection, favorite and saved tags. The Journal/Stories/Library slice is source-reviewed only; no tests, working-site check or device acceptance was performed.
- Read now hides protected titles/content/metadata until verification, permits original reveal only after the original is loaded in an active private session, and returns to the source section after back/edit/save/delete. Removed its fake Listen simulation and unavailable protected-edit affordance. Source review only; no tests/site/device acceptance.
- A saved private text revision now opens a manual disclosure-review flow: edit a separate copy, bind exact saved source/revision, recipient label and purpose, review the frozen copy, then explicitly copy it to the device clipboard. The copy is not persisted or sent; automated PII/context review, authenticated recipients, invitations and delivery remain unimplemented. Source review only; no tests/site/device acceptance.
- The existing private hub’s sections now switch content instead of showing the same cards for every selection. Safety prompts stay in memory for that view; Helplines provides searchable South African government-listed numbers with official sources, checked date and explicit call links. No automatic contact, advice or referral is claimed. Source review only; no tests/site/device acceptance.
- Trusted contacts now support edit and remove as well as add/call, with copy that distinguishes saved phone notes from companion authentication or journal sharing. Existing Firebase-authenticated account and encrypted-contact service remain the storage path. Source review only; no tests/site/device acceptance.
- Ordinary Story entries can now be assigned a collection name from the existing composer Options, and the account service, local development store, watcher and Firestore rule shape carry that label into Stories. This adds membership without a new page or sample content. Changes are local; no Firestore deployment, tests or working-site/device acceptance.
- Home’s activity bars now reflect actual ordinary entries in seven rolling 24-hour periods, with the total derived from the same buckets. The fixed reflection question no longer claims a scheduled delivery time. Existing card layout stays in place; source review only.
- Ordinary Write/Edit now checks changed title, text, kind and collection before the existing back action and asks whether to keep editing or discard. Private draft autosave/exit behavior is unchanged. Source review only; no tests/site/device acceptance.
- Library favorites and topic filters now read persisted ordinary-entry metadata: favorite and up to 12 normalized topic labels can be edited in the existing composer Options and carried through Firebase-authenticated account writes/live snapshots. Firestore rules bound both fields to ordinary entries. Local source/rules only; no deployment, tests, or working-site/device acceptance.

## Unfinished current work

- Library now includes Entries/Notes/Tasks sections; notes/tasks support account-owned create/edit/delete, searchable lists and task completion. The Firestore service and bounded rules reuse the Firebase-authenticated UID/session; local development storage remains isolated. TypeScript passes; no tests, working-site/device acceptance or rules deployment.
- Home now has compact Quick note and Task actions within the existing reflection card. They route to the matching Notes/Tasks section in Library and open its existing inline form, reusing account-scoped CRUD rather than duplicating it. Local preview transitions, focused form fields, cancel states and spacing were checked with seed data; no content was saved. TypeScript, `build:app`, and `git diff --check` pass. No Firebase release or target-device acceptance. Evidence: `../../evidence/home-quick-capture/` and review: `../../reports/home-quick-capture/2026-10-26-review.md`.
- Stories now passes the complete saved ordinary Story collection into the existing Reader. It orders entries by saved timestamp, oldest first, shows Previous/Next and a part count only for multi-entry groups, preserves each entry as its own source record, and scrolls to the top on part changes. A focused domain test verifies chronology and excludes protected/Journal entries. Local one-entry Stories → Reader → Stories navigation was observed; the seed has no multi-entry group, so the live multi-part control was not exercised. No content was saved or Firebase released. Review/evidence: `../../reports/story-sequence/2026-10-26-review.md` and `../../evidence/story-sequence/`.

- Local browser UI smoke pass: exercised Home → Journal → Reader and back, Stories, Library Entries/Notes/Tasks, inline note form cancel, Write, unsaved-change keep-editing, and Library entry → Reader/Edit/back. Checked screen-to-screen alignment, card widths, section spacing and return routes at the current preview viewport. Corrected the existing “Write privately” action to use the established subtle text-link style. TypeScript and `git diff --check` pass. This was a local development preview using seed data; no sign-in, emulator, production-site change, deployment, or saved test content.

- The private representation inspector correction is implemented locally: configured owner-entered mappings, staged edits/addition, encrypted owner/device storage and draft-derived match counts. Library now has a separate account-owned notes/tasks model alongside ordinary favorites/topics metadata; these code/rules changes remain local.
- UI Design can polish current post-login pages and develop the onboarding presentation. Resolve authentication order and secure pre-enrollment draft handling before integrating the fourteen-screen flow.
- Native UI/auth/persistence/private acceptance, offline authorization, broader recovery, interpretation, companions and support remain open.

## Readable status

Use /docs/hackathon/review.html#current-progress, #tasks-production, #onboarding-ui-handoff and #screen-alignment. Sunday 7/10 was submitted; final submission/materials remain unchecked.
