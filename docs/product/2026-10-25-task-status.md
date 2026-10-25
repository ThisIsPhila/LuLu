# LuLu implementation tracker

Updated 25 October 2026 (SAST). Build-first tracker, not an SDD phase. Keep implementation, deployment and phone acceptance separate. The owner confirms native sign-in works. Latest parent Hosting release: cf2ca69e213e14dd. The Product Implementation chat is currently idle; its original local-only report predates the parent's later integrated frontend release.

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
| Private text records | Local AES-GCM storage, save/reopen/list and original retention; integrated frontend code in the parent's build | Verify native phone capture/save/reopen/lock and storage failure cases. No cross-device recovery implied. |
| Record revisions/history | Appended revisions and source relationships; local integrity/session tests | Add export/deletion/retention controls and stronger evidence metadata/media lifecycle. |
| Paragraph privacy | Reveal/edit one paragraph, conceal others, explicit history/preview reveal | Verify target-device UI and implement/evaluate actual contextual scrubbing. |
| Private entry/exit | Passkey step-up, Write privately route, quick exit, Escape/background/expiry cleanup and stale-result guards | Phone tests for draft behavior, keyboard, interruption and concealment; unsaved drafts are not durable autosave. |
| Privacy transformation | Configured entity replacements and narrative distancing | General PII/context detection, correction continuity and language-specific quality evaluation. |
| Trusted contacts | Encrypted names/phone numbers and explicit phone links | Actual companion invitations, authenticated sharing and permission enforcement. |
| Disclosure/companion contracts | Local typed scope, source/revision/purpose and permission policy functions | User-facing disclosure review, recipients, key delivery, revocation and audit integration. |
| Search/library/organisation | Existing browse/search/filter surfaces | Validate all ordinary/private boundaries; complete useful notes/tasks/settings flows. |
| Auth diagnostics/recovery | Tested safe server diagnostics and post-registration recovery code | Server diagnostic code remains local/unpublished; deploy deliberately if required. |

## Remaining implementation tasks

1. Complete the phone acceptance journey for ordinary edits, private save/reopen/history, quick exit and record isolation.
2. Make urgent capture durable: reliable autosave/restart behavior, storage-quota errors and interrupted operations.
3. Add offline app startup and a deliberately designed offline unlock/capture path; browser-local persistence alone is insufficient.
4. Implement actual image/camera and voice/audio capture, exact-byte storage, metadata and predictable stop/save/exit behavior.
5. Implement private-record export, deletion/retention controls, encrypted backup, recovery and tested restore/cross-device key transfer.
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
