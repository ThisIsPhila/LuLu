# Local private writing: first implementation slice

25 October 2026. Implements the first delivery slice in the [product direction](../product/2026-10-25-product-direction.md). Local code only; no deployment, owner acceptance or native-device verification is claimed.

## What works in code

An ordinary new draft has a **Write privately** action that opens the existing real passkey step-up. Successful verification creates a `LocalVault` bound to the authenticated owner and current private-session generation. The current draft is retained during that transition. Ordinary existing-entry edits remain ordinary and update their existing Firestore record; they are not silently converted.

New protected text saves use `capturePrivateText` and IndexedDB. They do not call the cloud journal save service or any model. The original title/text is encrypted using the existing browser-held AES-GCM key, with owner/record/revision identity in authenticated additional data. UTF-8 JSON payloads include a digest. Record IDs, relationships and client timestamps remain local plaintext metadata; content is encrypted. This is text/JSON storage, not implemented image/audio capture.

After save, **Private writing** lists locally discoverable records within the unlocked session. Opening one supports paragraph-at-a-time editing. Saving an edit appends a revision with a parent reference; the first saved capture remains unchanged. Original/history text mounts only after an explicit reveal action. New private records never enter the ordinary entry array, ordinary search or ordinary reader. Older protected cloud entries retain their existing read path and are not migrated or deleted.

The private paragraph editor keeps inactive paragraphs out of editable DOM values and accessible text. Revealing a paragraph conceals the previous one. Newlines/pasted paragraphs and Unicode are preserved. Spellcheck/autocorrect are disabled on these private fields. Representation preview is opt-in and closes when private body text changes. This implements display concealment; the existing dictionary substitutions are not a comprehensive PII scrubber.

Quick exit, Escape, backgrounding and private expiry invalidate the session generation, drop the local vault reference, unmount private editing/list/history and clear private selection. The vault checks authorization before/after asynchronous work so pre-exit results cannot reopen into a new generation. The server lock request is best effort; local concealment does not wait for its network completion.

## Security review and limits

Assets are raw text, private titles, originals/history, encryption keys, owner identity and disclosure intent. Threats reviewed include ordinary-view leakage, late reads after exit/re-entry, wrong-owner/record ciphertext substitution, concurrent saves, head/history corruption, mutable caller inputs and accidental starter ingestion. Mitigations are separate local storage/UI, generation pinning, AAD identity checks, JSON snapshots, authenticated decryption, single-transaction head/revision insertion, stale-parent rejection and explicit provenance checks. Tests exercise these boundaries. No secrets or new dependencies were added.

The device key is non-extractable through WebCrypto but stored by the same browser origin; it is **not** derived from or cryptographically unlocked by the passkey. Same-origin malicious script or a compromised device can invoke it. Application authorization is a separate boundary. A complete IndexedDB rollback/deletion cannot be detected. Hashes and device clock values cannot establish that an incident occurred, a trusted capture time, authorship beyond the application's account attribution, or legal admissibility.

Only supported plain JSON values are accepted; media bytes require a future attachment store. The original is the first **saved capture**, not a keystroke log. There is no autosave yet: quick exit closes unsaved text/revisions, as the composer states. An operation interrupted around storage commit may have saved even when no success acknowledgement was shown; reopen to inspect before retrying. The append API rejects stale heads instead of silently overwriting concurrent edits.

Browser storage eviction/clearing or loss of the original browser key can lose access. No backup, portable key, export/import, recovery or cross-device synchronization was added. The existing passkey unlock and app authentication still require a connection; local storage operations do not establish a complete offline app. No service worker/offline shell or write-only locked capture exists yet. Native passkey prompts, phone keyboard/safe areas and app-switcher snapshots remain device checks; the web app cannot promise invisible history or resistance to device monitoring.

There is no private-record deletion UI in this first slice. Add explicit whole-record deletion/retention handling alongside export and recovery; append-only revision operations must not be interpreted as a decision that users cannot delete their records.

Starter markers are rejected by the evidence store, and typed provenance contracts distinguish starter content from authored records. This is caller-attested provenance, not semantic detection of fiction. There is no automatic starter-to-evidence conversion. Companion contracts are policy foundations only; actual sharing, invitations, key delivery, recipient authentication and revocation enforcement are not implemented. Decision/disclosure contracts have no remote transport or provider spending enabled.

## Verification

- Focused local tests: encrypted original/revision persistence and reopening, identity substitution/tampering, concurrent duplicate and stale-parent protection, session-generation races, malformed/lossy input, starter exclusion, disclosure snapshot/purpose/recipient/policy checks, companion scope/time checks, paragraph projection and mixed-language text persistence.
- Existing transform tests and Firebase guard tests run separately; app TypeScript and main-only packaging pass. The bundle-size warning remains and is not a test failure.
- A local synthetic browser fixture at `docs/testing/private-paragraphs.html` verifies reveal-one/conceal-previous, multilingual pasted splitting and all-concealed locked state. It is not authentication testing and is excluded from the production app build.
- `npm audit --offline --json` returned no cached advisories. Offline audit is limited to locally available advisory information; it is not a current registry or production security assessment.

Raw results and screenshot: `.sdd/evidence/private-foundation/`. Assessment: `.sdd/reports/private-foundation/2026-10-25-local-slice.md`.

Next: test the complete authenticated capture/reopen/exit flow on the owner's device, implement reliable offline startup/unlock and durable urgent capture, then add media lifecycle and backup/restore. Follow the product map for scoped companions, Trails and verified support. External provider requests and publication require their existing separate authority.
