import type { Entry } from '../domain/journal.ts';

/** Create a saved ordinary-entry copy using an explicit field whitelist. */
export function prepareOrdinaryEntryExport(entry: Entry): { blob: Blob; fileName: 'lulu-ordinary-entry.json' } {
  if (!entry || entry.protected !== false) throw new Error('Only saved ordinary entries can be exported here.');
  if (typeof entry.id !== 'string' || !entry.id.trim() || entry.id.length > 200 ||
      typeof entry.title !== 'string' || entry.title.length > 200 ||
      typeof entry.body !== 'string' || !entry.body.trim() || entry.body.length > 50_000 ||
      (entry.kind !== 'Journal' && entry.kind !== 'Story') ||
      typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.date)) ||
      (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string')))) {
    throw new TypeError('This saved ordinary entry cannot be exported.');
  }
  const savedCopy = {
    id: entry.id,
    title: entry.title,
    body: entry.body,
    kind: entry.kind,
    date: entry.date,
    ...(entry.tags === undefined ? {} : { tags: [...entry.tags] }),
  };
  return {
    blob: new Blob([JSON.stringify(savedCopy, null, 2)], { type: 'application/json;charset=utf-8' }),
    fileName: 'lulu-ordinary-entry.json',
  };
}
