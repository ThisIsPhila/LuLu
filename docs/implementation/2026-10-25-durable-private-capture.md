# Durable private text capture

25 October 2026. Bounded implementation goal under the existing build-first exception. Parent retains internal review HTML/progress JavaScript ownership. No deployment, external processing, new service, account or key authority follows from this work.

## Delivery decision

Autosave only inside an already-authorized private session. Store encrypted recovery drafts separately from original/evidence revisions in the same local vault. Drafts are mutable snapshots; first explicit Save creates an exact original, and later edits append revisions without rewriting it. Promotion and draft removal share an IndexedDB transaction. Conflicts preserve drafts rather than silently replacing another edit.

Start persistence promptly on each edit and coalesce rapid changes behind a single pending write. A visible saving/saved/error state describes the most recent accepted edit. Do not describe an in-memory or in-flight snapshot as durable. Recovery is available only after the existing account and private passkey flow opens a fresh session; no offline unlock, browser-key recovery or cross-device support is introduced.

Quick exit, background and expiry conceal immediately and invalidate authorization without awaiting storage. Stop the autosave controller and drop queued plaintext/callbacks on unmount. Existing vault generation checks still reject late private reads/results. Already committed encrypted snapshots can be recovered later; the newest uncommitted edit may be lost if interruption happens before commit. No background plaintext flush, localStorage fallback, model request or cloud upload is allowed after locking.

## Security review

Assets: unsaved title/text, original/version bytes, draft/source identity, owner ID, session epoch and device key. Threats: crash between finalization steps, duplicate retry after ambiguous commit, stale-tab overwrites, wrong-owner access, delayed callbacks after exit, storage quota/denial/abort, plaintext fallback and recovery previews in ordinary mode.

Mitigations: encrypted owner/draft/version-bound payloads; atomic draft/version promotion; optimistic version checks; serialized/coalesced updates; owner/epoch checks on every read/write; no raw storage fallback or content-bearing error messages; recovery list only in the private UI. Browser-held-key and same-origin-script limitations remain. Browser eviction/clearing can destroy access. A device timestamp and content hash are not proof of an incident or trusted time.

This note records the intended bounded change; completion and actual checks are appended after source review and verification. Native-device acceptance stays open.

## Delivered behaviour

Implemented in local source after the recorded parent Hosting release. No cloud resources, credentials, auth transport or cost policy changed.

- `LocalVault` schema v3 adds an encrypted `drafts` store and an owner index without replacing the existing heads/revisions stores. `saveDraft` compares the expected version; `getDraft` and `listDrafts` require a current owner/session. Ciphertext binds the draft/version/owner, and plaintext titles/bodies never enter localStorage or ordinary/cloud records.
- `finalizeDraft` checks the current draft version and target record head, then writes the immutable original or derived revision and removes the draft in one transaction. Conflict, quota and abort leave the draft/record state unchanged. If a commit succeeds but its acknowledgement is lost, reopening finds the record; retry does not make a duplicate original.
- `privateDraftAutosave.ts` starts writes on edits, serializes them and coalesces queued snapshots. Status becomes saved only for the newest acknowledged edit. Invalid/latest input cannot promote an older snapshot. Quota/unavailable errors retain the latest in-memory snapshot for explicit retry; conflicts cannot silently retry over another version.
- `PrivateDraftFields` is shared by protected composing, record editing and recovery. The ordinary-new-draft private-entry action retains the original title/body across verification, then starts encrypted autosave. Ordinary saved-entry edits retain their original backend path.
- Private writing lists **Continue a draft** after a fresh private session. Recovery preserves exact text/whitespace/Unicode and target source relationships. No ordinary view displays a draft title, count, text or recovery notification.
- Draft-save and record-finalization failures have separate retry actions. No storage failure falls back to plaintext or cloud persistence. Editing an existing record creates its recovery draft on the first change; merely opening it does not manufacture a revision.
- Quick exit/lock invalidates the existing generation before unmounting the controller. Stop suppresses callbacks and drops queued content references; it does not wait for or initiate a new raw flush. JavaScript garbage collection is not secure memory erasure.

## Verification observed

56 focused tests pass across original vault/capture/privacy contracts, new draft storage, autosave coordination and combined controller/storage interruption cases. Existing six transform tests and eleven Firebase guard tests pass. `npm run build:hosted` passes TypeScript, builds the main app and confirms demo/internal fixtures are excluded; the existing bundle-size warning remains.

The synthetic local browser fixture `docs/testing/private-draft-recovery.html` ran the actual components, WebCrypto and browser IndexedDB under React StrictMode. Observed: autosave acknowledgement without explicit record Save; lock/reload with no private content shown; unlock and recover both paragraphs; promote to original; autosave an edit, quick-exit/reload/recover and append; inspect the unchanged original and new revision. Injected quota and record-interruption controls verified that no saved claim appears on failure, the latest text remains editable, and the correctly labelled retry succeeds. Fixture injection is development-only, not an application auth bypass or native passkey verification.

Final review additionally fixed edits getting stuck after record-finalization errors, invalid latest snapshots allowing an older save, and the retry loop after a committed promotion's acknowledgement is lost. Finalization reconciliation reads the deterministic record/revision under the same vault authorization and accepts success only for matching owner (when configured), identity, kind, parent, provenance and exact content. New edits after a record-stage failure can still autosave; a draft-stage concurrent-version conflict remains blocked from blind overwrite. Browser checks verified new edits after promotion failure and successful reconciliation after a deliberately lost acknowledgement.

Raw test/build/check output, screenshots and assessed file hashes are in `.sdd/evidence/durable-private-capture/`; assessment is in `.sdd/reports/durable-private-capture/2026-10-25-delivery.md`.

## Acceptance limits and remaining backlog

The implementation preserves **completed** encrypted autosaves. It cannot guarantee the last keystroke if the page/process/device stops before storage commit, or guarantee survival of browser eviction/clearing, disk failure or loss of the browser key. No attempt is made to weaken session checks to conceal those limits. A local record may have committed just before a lock even if its success acknowledgement is suppressed; reopen before retrying.

Native-device acceptance is open: ordinary-to-private verification with the existing passkey; type, observe autosave, background/exit, reopen; edit/recover/promote and inspect originals; exercise quota/private-browsing errors, phone keyboard and abrupt app termination. The existing authentication flow still requires a connection. This slice does not implement offline app startup/unlock, write-only locked capture, backup/key recovery, cross-device access, media, export/deletion/retention, provider processing, companions, Trails or support integrations. Conflicting drafts remain preserved; automatic merge/rebase is deliberately absent. Refer to the [task tracker](../product/2026-10-25-task-status.md) for the full backlog.
