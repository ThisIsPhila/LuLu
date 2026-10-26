import { readPrivateText } from './privateCapture.ts';
import type { LocalVault } from './vault/localVault.ts';
import type { LocalMediaVault } from './vault/localMediaVault.ts';

export interface PreparedPrivateExport {
  blob: Blob;
  fileName: string;
  /** Call immediately before handing the Blob to a download/browser API. */
  assertCurrent: () => void;
}

interface ReadableTextExport {
  format: 'lulu-readable-private-text-v1';
  encrypted: false;
  recoveryBackup: false;
  exportedAt: string;
  exportedAtNote: string;
  recordId: string;
  revisions: Array<{
    recordId: string;
    revisionId: string;
    parentRevisionId: string | null;
    kind: 'original' | 'derived';
    provenance: 'user-authored' | 'user-captured' | null;
    clientCreatedAt: string;
    sha256: string;
    content: unknown;
  }>;
}

/** Prepare a readable JSON export while preserving the complete append-only text history. */
export async function prepareTextExport(vault: LocalVault, recordId: string): Promise<PreparedPrivateExport> {
  vault.assertUnlocked();
  const revisions = await vault.listRevisions(recordId);
  vault.assertUnlocked();
  if (revisions.length === 0) throw new Error('This private text record is not available.');

  const payload: ReadableTextExport = {
    format: 'lulu-readable-private-text-v1',
    encrypted: false,
    recoveryBackup: false,
    exportedAt: new Date().toISOString(),
    exportedAtNote: 'This export time comes from the device clock and is not verified.',
    recordId,
    revisions: revisions.map((revision) => {
      // Validate each history item with the same reader used by the private text UI.
      const content = readPrivateText(revision);
      return {
        recordId: revision.recordId,
        revisionId: revision.revisionId,
        parentRevisionId: revision.parentRevisionId,
        kind: revision.kind,
        provenance: revision.provenance,
        clientCreatedAt: revision.clientCreatedAt,
        sha256: revision.sha256,
        content,
      };
    }),
  };
  vault.assertUnlocked();
  return {
    blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    fileName: 'lulu-private-text-export.json',
    assertCurrent: () => vault.assertUnlocked(),
  };
}

const MEDIA_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
};

/** Prepare exact local media bytes as one generic named file; metadata is not bundled. */
export async function prepareMediaExport(mediaVault: LocalMediaVault, mediaId: string): Promise<PreparedPrivateExport> {
  mediaVault.assertUnlocked();
  const result = await mediaVault.get(mediaId);
  mediaVault.assertUnlocked();
  const extension = MEDIA_EXTENSIONS[result.metadata.mimeType];
  if (!extension) throw new Error('This private media type cannot be exported.');
  return {
    blob: result.blob,
    fileName: `lulu-private-${result.metadata.kind}.${extension}`,
    assertCurrent: () => mediaVault.assertUnlocked(),
  };
}
