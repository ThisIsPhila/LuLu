import type { Entry } from '../domain/journal';
import type { AppSession } from './backend/passkeys';
import { isNativePlatform } from '../platform/runtime';

const UID = 'lulu-local-development';
const KEY = 'lulu.development.journal.v1';
const CONTACTS = 'lulu.development.contacts.v1';
const changed = new EventTarget();

export function localDevelopmentAvailable(): boolean {
  return import.meta.env?.DEV === true && !isNativePlatform() && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
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
function entry(title: string, body: string, kind: Entry['kind'] = 'Journal', id: string = crypto.randomUUID()): Entry {
  const now = new Date();
  return { id, title, body, kind, date: now.toISOString(), timeStr: now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}),
    wordsCount: body.trim().split(/\s+/).filter(Boolean).length, groupDate: 'Today', tags: [], favorite: false, protected: false, perspective: 'first' };
}
function read(): Entry[] {
  assertLocal();
  const stored = localStorage.getItem(KEY);
  if (stored !== null) {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('The local development journal could not be read.');
    return parsed as Entry[];
  }
  const starters = [entry('A calmer morning', 'I took a slow walk and noticed the light through the trees.'),
    entry('Notes on focus', 'A little space to think about what matters this week.'),
    entry('Small moments', 'A fictional story for exploring the local app.', 'Story')];
  localStorage.setItem(KEY, JSON.stringify(starters));
  return starters;
}
function write(entries: Entry[]) {
  assertLocal();
  localStorage.setItem(KEY, JSON.stringify(entries));
  changed.dispatchEvent(new Event('change'));
}
export const developmentJournal = {
  watch(receive: (entries: Entry[]) => void, fail: (error: Error) => void) {
    const send = () => { try { receive(read()); } catch (error) { fail(error instanceof Error ? error : new Error('Local journal unavailable.')); } };
    const storage = (event: StorageEvent) => { if (event.key === KEY) send(); };
    changed.addEventListener('change', send); window.addEventListener('storage', storage); send();
    return () => { changed.removeEventListener('change', send); window.removeEventListener('storage', storage); };
  },
  save(data: {title: string; body: string; kind?: Entry['kind']; protected?: boolean}) {
    if (data.protected) throw new Error('Use the encrypted private editor.');
    if (!data.body.trim() || data.body.length > 50_000) throw new Error('Write between 1 and 50,000 characters.');
    write([entry(data.title.slice(0, 200), data.body, data.kind ?? 'Journal'), ...read()]);
  },
  update(id: string, data: {title: string; body: string; kind?: Entry['kind']}) {
    if (!data.body.trim() || data.body.length > 50_000 || data.title.length > 200) throw new Error('Use a title up to 200 characters and write between 1 and 50,000 characters.');
    const entries = read(), prior = entries.find(item => item.id === id);
    if (!prior) throw new Error('This local entry is no longer available.');
    write(entries.map(item => item.id === id ? {...entry(data.title, data.body, data.kind ?? item.kind, id), favorite: item.favorite, tags: item.tags} : item));
  },
  remove(id: string) { write(read().filter(item => item.id !== id)); },
  contacts(): {id: string; name: string; phone: string}[] { assertLocal(); return JSON.parse(localStorage.getItem(CONTACTS) ?? '[]'); },
  saveContacts(contacts: {id: string; name: string; phone: string}[]) { assertLocal(); localStorage.setItem(CONTACTS, JSON.stringify(contacts)); },
};
