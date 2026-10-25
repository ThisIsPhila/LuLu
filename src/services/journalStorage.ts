import type { Entry } from '../domain/journal.ts';
import type { Entity } from '../domain/transform.ts';

export const JOURNAL_STORAGE_KEY = 'lulu.app.entries.v1';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type JournalSnapshot = { version: 1; entries: Entry[]; entities: Entity[] };
export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: 'unavailable' | 'invalid-data' | 'write-failed' };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optionalString = (v: unknown) => v === undefined || typeof v === 'string';
export function isEntry(v: unknown): v is Entry {
  return object(v) && typeof v.id === 'string' && v.id.trim().length > 0 &&
    typeof v.title === 'string' && typeof v.body === 'string' &&
    (v.kind === 'Journal' || v.kind === 'Story') && typeof v.date === 'string' &&
    Number.isFinite(Date.parse(v.date)) && typeof v.favorite === 'boolean' && typeof v.protected === 'boolean' &&
    optionalString(v.originalBody) && optionalString(v.timeStr) &&
    (v.perspective === undefined || v.perspective === 'first' || v.perspective === 'third') &&
    (v.groupDate === undefined || ['Today', 'Yesterday', 'Earlier'].includes(String(v.groupDate))) &&
    (v.entitiesRecognized === undefined || (Array.isArray(v.entitiesRecognized) && v.entitiesRecognized.every(x => typeof x === 'string')));
}
export function isEntity(v: unknown): v is Entity {
  return object(v) && typeof v.id === 'string' && !!v.id.trim() &&
    typeof v.original === 'string' && !!v.original.trim() && typeof v.alias === 'string' && !!v.alias.trim() &&
    ['Person', 'Place', 'Time', 'Topic', 'Pronoun'].includes(String(v.type)) &&
    (v.mentions === undefined || (typeof v.mentions === 'number' && Number.isInteger(v.mentions) && v.mentions >= 0));
}
const uniqueIds = (items: { id: string }[]) => new Set(items.map(x => x.id)).size === items.length;
function validEntries(v: unknown): v is Entry[] { return Array.isArray(v) && v.every(isEntry) && uniqueIds(v); }
export function isSnapshot(v: unknown): v is JournalSnapshot {
  return object(v) && v.version === 1 && validEntries(v.entries) && Array.isArray(v.entities) && v.entities.every(isEntity) && uniqueIds(v.entities);
}

/** Local prototype storage only. Source text and mappings are NOT encrypted. */
export function readJournal(storage: StoragePort, defaults: JournalSnapshot): StorageResult<JournalSnapshot> {
  let raw: string | null;
  try { raw = storage.getItem(JOURNAL_STORAGE_KEY); } catch { return { ok: false, error: 'unavailable' }; }
  if (raw === null) return { ok: true, value: structuredClone(defaults) };
  try {
    const parsed: unknown = JSON.parse(raw);
    // Existing installations stored an unversioned array, including a valid empty journal.
    if (validEntries(parsed)) return { ok: true, value: { version: 1, entries: parsed, entities: structuredClone(defaults.entities) } };
    if (isSnapshot(parsed)) return { ok: true, value: parsed };
  } catch { /* Preserve malformed storage for explicit recovery. */ }
  return { ok: false, error: 'invalid-data' };
}

export function writeJournal(storage: StoragePort, snapshot: JournalSnapshot): StorageResult<JournalSnapshot> {
  if (!isSnapshot(snapshot)) return { ok: false, error: 'invalid-data' };
  // Never replace unreadable, malformed or future-version data with defaults.
  const existing = readJournal(storage, snapshot);
  if (!existing.ok) return existing;
  try { storage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(snapshot)); }
  catch { return { ok: false, error: 'write-failed' }; }
  return { ok: true, value: structuredClone(snapshot) };
}
