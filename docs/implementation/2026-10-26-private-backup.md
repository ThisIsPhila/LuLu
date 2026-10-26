# Per-record encrypted private backup and restore

**Status:** Implemented in the local app; synthetic browser verification and local tests pass. Native-phone acceptance is pending. No deployment or cloud mutation was performed.

## Scope

From the existing private journal flow, a user can prepare a password-encrypted backup of one saved text record and its complete saved revision history, or one saved media original and its encrypted metadata. A user can restore that record only while signed into the same account. Restore uses the current device key and preserves saved IDs, provenance, timestamps, hashes, metadata and original media bytes.

The file is not a whole-vault backup or account-recovery mechanism. It excludes drafts and unsaved edits and does not contain passkeys or device encryption keys. A lost backup file or passphrase cannot be recovered through the account. Restore does not overwrite a different record with a matching ID; an already-present identical record is treated as an idempotent restore.

## File and restore boundary

The encrypted plaintext payload starts with a four-byte big-endian JSON-manifest length, followed by the manifest and, for media, exact raw media bytes. It is encrypted through the existing versioned recovery-file primitive: PBKDF2-SHA-256 with 600,000 iterations, AES-256-GCM, a fresh salt and IV, and authenticated header fields. Files and decrypted payloads are bounded to 64 MiB; individual local media remains bounded to 25 MiB.

Restore checks the active owner against both local vaults and the encrypted manifest. Text restore validates one complete, unbranched original/revision chain and each content digest before preparing re-encrypted rows. Media restore validates the metadata, byte length and SHA-256. Nothing is written during preparation. Confirmation checks the expected stored state and writes the complete text history/head or media metadata/binary pair in one IndexedDB transaction. Conflicts, stale session generations and failed writes abort without partial records.

## Verification

- Nine backup-focused Node tests pass, including caller-mutation snapshot coverage, wrong passphrase/tamper/wrong owner, same-owner restore after deleting the old local database and key, idempotence/conflict handling, lock/race rejection, and text/media rollback. Exact media bytes and all saved metadata are checked. These fixtures are synthetic and use fake IndexedDB.
- The combined focused regression run passed **127 tests**. `npm run build:hosted` and `npm run guard:firebase` passed; the guard is a local configuration check, not a spending cap.
- A browser download was inspected: the downloaded `.lulubackup` decrypted to the expected format and source/original record, and its plaintext title was absent from the encrypted file. A separate synthetic two-version backup was restored through the browser file picker and explicit confirmation; the new record reopened with its original and revision. Quick exit locked the fixture. The browser tab and local server were closed. Screenshots and file verification are in [private-backup evidence](../../.sdd/evidence/private-backup/).
- The browser flow used a synthetic record. Fresh-key loss, imported media and byte-exact metadata restoration are unit/emulator-style fake-IndexedDB checks, not physical-phone acceptance. No real user record was used for testing.

## Source and evidence

- Service: `src/services/privateBackup.ts`
- Vault restore APIs: `src/services/vault/localVault.ts`, `src/services/vault/localMediaVault.ts`
- Existing crypto primitive: `src/services/recoveryFileCrypto.ts`
- UI integration: `src/components/PrivateBackupControls.tsx`, `src/components/LocalPrivateJournal.tsx`
- Focused tests: `tests/private-backup.test.mjs`
- Raw test, build, guard, download and browser evidence: [`.sdd/evidence/private-backup/`](../../.sdd/evidence/private-backup/)
- Reviewed source hashes: [`source-sha256.txt`](../../.sdd/evidence/private-backup/source-sha256.txt)

No server transport, cloud backup, passkey export, device-key transfer, native-phone test or external deployment is claimed.
