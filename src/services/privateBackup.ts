import { decryptRecoveryFile, encryptRecoveryFile, MAX_RECOVERY_PAYLOAD_BYTES } from './recoveryFileCrypto.ts';
import type { LocalVault, LocalVaultRevision } from './vault/localVault.ts';
import type { LocalMediaVault, MediaMetadata } from './vault/localMediaVault.ts';

const FORMAT = 'lulu-record-backup-v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export interface PreparedPrivateBackup {
  blob: Blob;
  fileName: 'lulu-private-record.lulubackup';
  assertCurrent: () => void;
}

type TextManifest = { format: typeof FORMAT; ownerId: string; kind: 'text'; revisions: LocalVaultRevision[] };
type MediaManifest = { format: typeof FORMAT; ownerId: string; kind: 'media'; metadata: MediaMetadata };
type BackupManifest = TextManifest | MediaManifest;

function packPayload(manifest: BackupManifest, mediaBytes?: ArrayBuffer): Blob {
  const jsonBytes = encoder.encode(JSON.stringify(manifest));
  const mediaLength = mediaBytes?.byteLength ?? 0;
  if (jsonBytes.byteLength < 1 || jsonBytes.byteLength > MAX_RECOVERY_PAYLOAD_BYTES - 4 ||
      4 + jsonBytes.byteLength + mediaLength > MAX_RECOVERY_PAYLOAD_BYTES) {
    throw new RangeError('The private record backup exceeds the 64 MiB recovery-file limit.');
  }
  const header = new Uint8Array(4);
  new DataView(header.buffer).setUint32(0, jsonBytes.byteLength, false);
  return new Blob(mediaBytes ? [header, jsonBytes, mediaBytes] : [header, jsonBytes], { type: 'application/octet-stream' });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);
}

async function decodePayload(payload: Blob, assertCurrent: () => void): Promise<{ manifest: unknown; mediaBytes: Uint8Array }> {
  if (!(payload instanceof Blob) || payload.size < 5 || payload.size > MAX_RECOVERY_PAYLOAD_BYTES) {
    throw new Error('The decrypted recovery payload has an invalid size.');
  }
  const bytes = new Uint8Array(await payload.arrayBuffer());
  assertCurrent();
  if (bytes.byteLength < 5 || bytes.byteLength > MAX_RECOVERY_PAYLOAD_BYTES) throw new Error('The decrypted recovery payload has an invalid size.');
  const manifestLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  if (manifestLength < 2 || manifestLength > MAX_RECOVERY_PAYLOAD_BYTES - 4 || manifestLength > bytes.byteLength - 4) {
    throw new Error('The recovery file manifest length is invalid.');
  }
  let manifest: unknown;
  try { manifest = JSON.parse(decoder.decode(bytes.subarray(4, 4 + manifestLength))); }
  catch { throw new Error('The recovery file manifest is malformed.'); }
  assertCurrent();
  return { manifest, mediaBytes: bytes.slice(4 + manifestLength) };
}

/** Prepare one saved text record and its complete immutable history as a password-encrypted file. */
export async function prepareTextBackup(vault: LocalVault, recordId: string, passphrase: string): Promise<PreparedPrivateBackup> {
  vault.assertUnlocked();
  const ownerId = vault.getOwnerId();
  const revisions = await vault.listRevisions(recordId);
  vault.assertUnlocked();
  if (!revisions.length) throw new Error('This private record is not available.');
  const payload = packPayload({ format: FORMAT, ownerId, kind: 'text', revisions });
  const blob = await encryptRecoveryFile(payload, passphrase, () => vault.assertUnlocked());
  vault.assertUnlocked();
  return { blob, fileName: 'lulu-private-record.lulubackup', assertCurrent: () => vault.assertUnlocked() };
}

/** Prepare one saved media original; metadata remains encrypted in the file header. */
export async function prepareMediaBackup(
  mediaVault: LocalMediaVault,
  mediaId: string,
  passphrase: string,
): Promise<PreparedPrivateBackup> {
  mediaVault.assertUnlocked();
  const ownerId = mediaVault.getOwnerId();
  const { metadata, blob: original } = await mediaVault.get(mediaId);
  mediaVault.assertUnlocked();
  const mediaBytes = await original.arrayBuffer();
  mediaVault.assertUnlocked();
  if (mediaBytes.byteLength !== metadata.byteLength) throw new Error('The saved media length changed during backup preparation.');
  const payload = packPayload({ format: FORMAT, ownerId, kind: 'media', metadata }, mediaBytes);
  const blob = await encryptRecoveryFile(payload, passphrase, () => mediaVault.assertUnlocked());
  mediaVault.assertUnlocked();
  return { blob, fileName: 'lulu-private-record.lulubackup', assertCurrent: () => mediaVault.assertUnlocked() };
}

export interface PreparedBackupRestore {
  kind: 'text' | 'media';
  revisionCount: number;
  existing: boolean;
  confirm: () => Promise<void>;
}

/** Open an authenticated backup and prepare a same-account non-overwriting restore plan. */
export async function prepareBackupRestore(
  vault: LocalVault,
  mediaVault: LocalMediaVault,
  file: Blob,
  passphrase: string,
): Promise<PreparedBackupRestore> {
  vault.assertUnlocked();
  mediaVault.assertUnlocked();
  const ownerId = vault.getOwnerId();
  if (mediaVault.getOwnerId() !== ownerId) throw new Error('The private vaults do not belong to the same account.');
  const assertCurrent = () => { vault.assertUnlocked(); mediaVault.assertUnlocked(); };
  const decrypted = await decryptRecoveryFile(file, passphrase, assertCurrent);
  assertCurrent();
  const { manifest, mediaBytes } = await decodePayload(decrypted, assertCurrent);
  assertCurrent();
  if (!isPlainObject(manifest) || manifest.format !== FORMAT || manifest.ownerId !== ownerId ||
      (manifest.kind !== 'text' && manifest.kind !== 'media')) {
    throw new Error('This recovery file is not a supported backup for the current account.');
  }

  if (manifest.kind === 'text') {
    if (!Array.isArray(manifest.revisions) || manifest.revisions.length < 1 || mediaBytes.byteLength !== 0 ||
        Object.keys(manifest).sort().join(',') !== 'format,kind,ownerId,revisions') {
      throw new Error('The text recovery file manifest is invalid.');
    }
    const plan = await vault.prepareRestoreRecord(manifest.revisions as LocalVaultRevision[]);
    assertCurrent();
    return {
      kind: 'text',
      revisionCount: manifest.revisions.length,
      existing: plan.existing,
      confirm: async () => { assertCurrent(); await plan.confirm(); assertCurrent(); },
    };
  }

  if (!isPlainObject(manifest.metadata) || Object.keys(manifest).sort().join(',') !== 'format,kind,metadata,ownerId') {
    throw new Error('The media recovery file manifest is invalid.');
  }
  const metadata = manifest.metadata as unknown as MediaMetadata;
  if (!Number.isSafeInteger(metadata.byteLength) || metadata.byteLength !== mediaBytes.byteLength) {
    throw new Error('The recovery media length does not match its metadata.');
  }
  const raw = mediaBytes.slice().buffer;
  const plan = await mediaVault.prepareRestoreOriginal({ ownerId, metadata }, new Blob([raw], { type: metadata.mimeType }));
  assertCurrent();
  return {
    kind: 'media',
    revisionCount: 1,
    existing: plan.existing,
    confirm: async () => { assertCurrent(); await plan.confirm(); assertCurrent(); },
  };
}
