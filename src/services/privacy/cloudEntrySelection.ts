import type { Entry } from '../../domain/journal';

export const MAX_CLOUD_REVIEW_ENTRIES = 3;
export const MAX_CLOUD_REVIEW_CHARACTERS = 4_000;

type ReviewEntry = Pick<Entry, 'id' | 'title' | 'body' | 'kind' | 'date' | 'protected'>;

export type CloudEntrySelection =
  | { ok: true; text: string; entryCount: number }
  | { ok: false; message: string };

/**
 * Prepare a small, chronological set of ordinary entries for the cloud review
 * editor. Exact entry dates stay on device; only their older-to-newer order is
 * represented. The caller still requires PII review and explicit consent.
 */
export function prepareCloudEntrySelection(entries: readonly ReviewEntry[]): CloudEntrySelection {
  if (entries.length === 0) return { ok: false, message: 'Choose at least one Journal or Story entry.' };
  if (entries.length > MAX_CLOUD_REVIEW_ENTRIES) {
    return { ok: false, message: `Choose up to ${MAX_CLOUD_REVIEW_ENTRIES} entries for one review.` };
  }
  if (entries.some(entry => entry.protected)) {
    return { ok: false, message: 'Protected private writing cannot be used in this cloud demo.' };
  }

  const ordered = [...entries].sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
  const text = ordered.map((entry, index) => {
    const title = entry.title.trim();
    return `Passage ${index + 1} · ${entry.kind}${title ? `\nTitle: ${title}` : ''}\n${entry.body.trim()}`;
  }).join('\n\n---\n\n');

  if (!text.trim()) return { ok: false, message: 'The selected entries do not contain text to review.' };
  if (text.length > MAX_CLOUD_REVIEW_CHARACTERS) {
    return {
      ok: false,
      message: `The selected passages exceed ${MAX_CLOUD_REVIEW_CHARACTERS.toLocaleString()} characters. Choose fewer entries or paste a shorter excerpt.`,
    };
  }

  return { ok: true, text, entryCount: ordered.length };
}
