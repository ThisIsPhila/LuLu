import { LocalVault, type LocalVaultRevision } from './vault/localVault.ts';

export type PrivateText = {
  format: 'lulu-private-text-v1';
  mediaType: 'text/plain';
  title: string;
  body: string;
  /** Empty means not evaluated; Unicode preservation is not language coverage. */
  languages: string[];
};

export function readPrivateText(revision: LocalVaultRevision): PrivateText {
  const value = revision.content as Partial<PrivateText> | null;
  if (!value || value.format !== 'lulu-private-text-v1' || value.mediaType !== 'text/plain' ||
      typeof value.title !== 'string' || typeof value.body !== 'string' ||
      !Array.isArray(value.languages) || !value.languages.every(item => typeof item === 'string')) {
    throw new Error('This record is not a supported private text record.');
  }
  return value as PrivateText;
}

function textPayload(title: string, body: string): PrivateText {
  if (typeof title !== 'string' || title.length > 200 || typeof body !== 'string' || !body.trim() || body.length > 50_000) {
    throw new Error('Use a title up to 200 characters and write between 1 and 50,000 characters.');
  }
  return { format: 'lulu-private-text-v1', mediaType: 'text/plain', title, body, languages: [] };
}

/** New private capture has no journal/cloud/model transport dependency. */
export async function capturePrivateText(vault: LocalVault, title: string, body: string) {
  const content = textPayload(title, body);
  return vault.createOriginal({recordId: crypto.randomUUID(), revisionId: crypto.randomUUID(), provenance: 'user-authored', content});
}

/** Editing appends a new version; the captured original remains available. */
export async function revisePrivateText(vault: LocalVault, source: LocalVaultRevision, title: string, body: string) {
  const content = textPayload(title, body);
  return vault.appendDerived({recordId: source.recordId, revisionId: crypto.randomUUID(), parentRevisionId: source.revisionId, content});
}
