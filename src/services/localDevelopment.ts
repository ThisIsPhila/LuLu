import type { Entry } from '../domain/journal';
import type { AppSession } from './backend/passkeys';
import { normalizeStoryCollection } from '../domain/storyCollections';
import { normalizeOrdinaryTags } from '../domain/ordinaryMetadata';
import type { LibraryItem, LibraryItemDraft, LibraryItemKind } from '../domain/libraryItems';
import catalogueSource from '../../scripts/demo-catalogue-seed.json?raw';

const UID = 'lulu-local-development';
const KEY = 'lulu.development.journal.v1';
const CONTACTS = 'lulu.development.contacts.v1';
const LIBRARY_ITEMS = 'lulu.development.notes-tasks.v1';
const CATALOGUE_MIGRATION = 'lulu.development.catalogue.johannesburg-v1';
const CATALOGUE_CONTENT_MIGRATION = 'lulu.development.catalogue.demo-content-v4';
const changed = new EventTarget();

type CatalogueEntry = {
  id: string;
  title: string;
  body: string;
  kind: Entry['kind'];
  protected: false;
  perspective: 'first' | 'third';
  tags: string[];
  curatedDeck?: string;
  entitiesRecognized?: string[];
  demoGuide?: string;
  createdAt: string;
};
const catalogue = JSON.parse(catalogueSource) as { manifest: { entryIds: string[] }; entries: CatalogueEntry[] };
export function localDevelopmentAvailable(): boolean {
  // Keep the no-account preview limited to an explicit local HTTP origin. Native
  // app origins and public HTTPS deployments do not expose this entry point.
  return window.location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
}
export function isLocalDevelopment(uid: string): boolean {
  return localDevelopmentAvailable() && uid === UID;
}
export function localDevelopmentSession(): AppSession {
  if (!localDevelopmentAvailable()) throw new Error('Local development access is unavailable.');
  return { uid: UID, expiresAt: Date.now() + 8 * 60 * 60_000, privateUntil: 0 };
}
function assertLocal() {
  if (!localDevelopmentAvailable()) throw new Error('Local development storage is unavailable.');
}
function entry(title: string, body: string, kind: Entry['kind'] = 'Journal', id: string = crypto.randomUUID(), curatedDeck?: string, daysAgo = 0, time = '09:00'): Entry {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return { id, title, body, kind, date: date.toISOString(), timeStr: date.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}),
    wordsCount: body.trim().split(/\s+/).filter(Boolean).length, groupDate: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : 'Earlier', tags: [], favorite: false, protected: false, perspective: 'first',
    ...(curatedDeck ? {curatedDeck} : {}) };
}
function sampleEntries(): Entry[] {
  return catalogue.manifest.entryIds.map(id => {
    const sample = catalogue.entries.find(candidate => candidate.id === id);
    if (!sample || sample.protected !== false || !Number.isFinite(Date.parse(sample.createdAt))) {
      throw new Error('The local starter catalogue is invalid.');
    }
    const date = new Date(sample.createdAt);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    const groupDate = date.toDateString() === today ? 'Today' : date.toDateString() === yesterday ? 'Yesterday' : 'Earlier';
    return {
      id: sample.id,
      title: sample.title,
      body: sample.body,
      kind: sample.kind,
      date: date.toISOString(),
      timeStr: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      wordsCount: sample.body.trim().split(/\s+/).filter(Boolean).length,
      groupDate,
      tags: normalizeOrdinaryTags(sample.tags),
      favorite: false,
      protected: false,
      perspective: sample.perspective,
      ...(sample.curatedDeck ? { curatedDeck: normalizeStoryCollection(sample.curatedDeck) } : {}),
      ...(sample.entitiesRecognized?.length ? { entitiesRecognized: sample.entitiesRecognized } : {}),
      ...(sample.demoGuide ? { demoGuide: sample.demoGuide } : {}),
    };
  });
}
function refreshDemoSamples(entries: Entry[]): Entry[] {
  if (localStorage.getItem(CATALOGUE_CONTENT_MIGRATION) === 'complete') return entries;
  const samples = sampleEntries();
  const sampleIds = new Set(samples.map(sample => sample.id));
  const kept = entries.filter(item => !item.id.startsWith('demo-') && !sampleIds.has(item.id));
  const next = [...kept, ...samples];
  localStorage.setItem(KEY, JSON.stringify(next));
  localStorage.setItem(CATALOGUE_MIGRATION, 'complete');
  localStorage.setItem(CATALOGUE_CONTENT_MIGRATION, 'complete');
  return next;
}
function read(): Entry[] {
  assertLocal();
  const stored = localStorage.getItem(KEY);
  if (stored !== null) {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('The local development journal could not be read.');
    return refreshDemoSamples(parsed as Entry[]);
  }
  const starters = sampleEntries();
  localStorage.setItem(KEY, JSON.stringify(starters));
  localStorage.setItem(CATALOGUE_MIGRATION, 'complete');
  return starters;
}
function write(entries: Entry[]) {
  assertLocal();
  localStorage.setItem(KEY, JSON.stringify(entries));
  changed.dispatchEvent(new Event('change'));
}
function readLibraryItems(): LibraryItem[] {
  assertLocal();
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LIBRARY_ITEMS) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is LibraryItem => item && typeof item.id === 'string' &&
      (item.kind === 'note' || item.kind === 'task') && typeof item.title === 'string' && typeof item.body === 'string' && typeof item.completed === 'boolean' &&
      typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)) && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt))) : [];
  } catch { return []; }
}
function writeLibraryItems(items: LibraryItem[]) {
  assertLocal();
  localStorage.setItem(LIBRARY_ITEMS, JSON.stringify(items));
  changed.dispatchEvent(new Event('change'));
}
export const developmentJournal = {
  watch(receive: (entries: Entry[]) => void, fail: (error: Error) => void) {
    const send = () => { try { receive(read()); } catch (error) { fail(error instanceof Error ? error : new Error('Local journal unavailable.')); } };
    const storage = (event: StorageEvent) => { if (event.key === KEY) send(); };
    changed.addEventListener('change', send); window.addEventListener('storage', storage); send();
    return () => { changed.removeEventListener('change', send); window.removeEventListener('storage', storage); };
  },
  save(data: {entryId?: string; title: string; body: string; kind?: Entry['kind']; protected?: boolean; curatedDeck?: string; favorite?: boolean; tags?: string[]}) {
    if (data.protected) throw new Error('Use the encrypted private editor.');
    if (!data.body.trim() || data.body.length > 50_000) throw new Error('Write between 1 and 50,000 characters.');
    const kind = data.kind ?? 'Journal';
    const curatedDeck = normalizeStoryCollection(data.curatedDeck);
    if (curatedDeck && kind !== 'Story') throw new Error('Only ordinary Story entries can belong to a Story collection.');
    const tags = normalizeOrdinaryTags(data.tags ?? []);
    if (data.favorite !== undefined && typeof data.favorite !== 'boolean') throw new Error('Favorite must be enabled or disabled.');
    const id = data.entryId ?? crypto.randomUUID();
    const entries = read();
    if (entries.some(item => item.id === id)) throw new Error('This entry identifier is already in use.');
    write([{...entry(data.title.slice(0, 200), data.body, kind, id, curatedDeck), favorite:data.favorite === true,tags}, ...entries]);
  },
  update(id: string, data: {title: string; body: string; kind?: Entry['kind']; curatedDeck?: string; favorite?: boolean; tags?: string[]}) {
    if (!data.body.trim() || data.body.length > 50_000 || data.title.length > 200) throw new Error('Use a title up to 200 characters and write between 1 and 50,000 characters.');
    const entries = read(), prior = entries.find(item => item.id === id);
    if (!prior) throw new Error('This local entry is no longer available.');
    const kind = data.kind ?? prior.kind;
    const curatedDeck = data.curatedDeck === undefined ? (data.kind === 'Journal' ? undefined : prior.curatedDeck) : normalizeStoryCollection(data.curatedDeck);
    if (curatedDeck && kind !== 'Story') throw new Error('Only ordinary Story entries can belong to a Story collection.');
    if (data.favorite !== undefined && typeof data.favorite !== 'boolean') throw new Error('Favorite must be enabled or disabled.');
    const tags = data.tags === undefined ? undefined : normalizeOrdinaryTags(data.tags);
    write(entries.map(item => item.id === id ? {...entry(data.title, data.body, kind, id, curatedDeck), favorite:data.favorite ?? item.favorite, tags:tags ?? item.tags} : item));
  },
  remove(id: string) { write(read().filter(item => item.id !== id)); },
  contacts(): {id: string; name: string; phone: string}[] { assertLocal(); return JSON.parse(localStorage.getItem(CONTACTS) ?? '[]'); },
  saveContacts(contacts: {id: string; name: string; phone: string}[]) { assertLocal(); localStorage.setItem(CONTACTS, JSON.stringify(contacts)); },
};

export const developmentLibraryItems = {
  watch(receive: (items: LibraryItem[]) => void, fail: (error: Error) => void) {
    const send = () => { try { receive(readLibraryItems()); } catch (error) { fail(error instanceof Error ? error : new Error('Local notes and tasks are unavailable.')); } };
    const storage = (event: StorageEvent) => { if (event.key === LIBRARY_ITEMS) send(); };
    changed.addEventListener('change', send); window.addEventListener('storage', storage); send();
    return () => { changed.removeEventListener('change', send); window.removeEventListener('storage', storage); };
  },
  create(kind: LibraryItemKind, draft: LibraryItemDraft) {
    const now = new Date().toISOString();
    writeLibraryItems([{ id: crypto.randomUUID(), kind, ...draft, completed: false, createdAt: now, updatedAt: now }, ...readLibraryItems()]);
  },
  update(id: string, draft: LibraryItemDraft, completed?: boolean) {
    const now = new Date().toISOString();
    writeLibraryItems(readLibraryItems().map(item => item.id === id ? { ...item, ...draft, ...(completed === undefined ? {} : { completed }), updatedAt: now } : item));
  },
  remove(id: string) { writeLibraryItems(readLibraryItems().filter(item => item.id !== id)); },
};
