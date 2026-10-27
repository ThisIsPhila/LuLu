export type Entry = {
  id: string;
  title: string;
  body: string;
  originalBody?: string;
  kind: 'Journal' | 'Story';
  date: string;
  timeStr: string;
  wordsCount: number;
  groupDate: 'Today' | 'Yesterday' | 'Earlier';
  tags: string[];
  imageUrl?: string;
  favorite: boolean;
  protected: boolean;
  perspective?: 'first' | 'third';
  entitiesRecognized?: string[];
  curatedDeck?: string;
};

/** Metadata for ordinary attachments stored in this browser. */
export type OrdinaryMediaRef = {
  id: string;
  kind: 'image' | 'audio';
  mimeType: string;
  byteLength: number;
  name?: string;
  durationMs?: number;
};

const STORAGE_KEY = 'lulu.stitch.entries.v3';

function isStoredEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<Entry>;
  return typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.body === 'string' &&
    (entry.kind === 'Journal' || entry.kind === 'Story') && typeof entry.date === 'string' &&
    Number.isFinite(Date.parse(entry.date)) && typeof entry.favorite === 'boolean' && typeof entry.protected === 'boolean' &&
    (entry.tags === undefined || (Array.isArray(entry.tags) && entry.tags.every(tag => typeof tag === 'string')));
}

/** Read legacy local entries without manufacturing sample content. */
export function loadEntries(storage: Pick<Storage, 'getItem'> = localStorage): Entry[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.every(isStoredEntry)) return value;
  } catch {}
  return [];
}

export function persistEntries(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export const persist = persistEntries;
export const loadJournal = loadEntries;
