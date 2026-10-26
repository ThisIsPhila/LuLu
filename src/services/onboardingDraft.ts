import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNativePlatform } from '../platform/runtime.ts';

/**
 * Pre-enrolment writing has no account key yet. Keep it encrypted in a separate
 * local store, using a non-extractable browser key or native secure storage.
 * This is device-local recovery, not passkey-bound encryption or a backup.
 */
const databaseName = 'lulu.onboarding-draft.v1';
const recordName = 'current';
const nativeKeyName = 'lulu.onboarding-draft.v1.key';
const aad = new TextEncoder().encode('lulu/onboarding-draft/v1/current');
const maxEntryLength = 50_000;

export type OnboardingDraft = {
  version: 1 | 2 | 3;
  id: string;
  screen: number;
  state: Record<string, unknown>;
  entrySaved: boolean;
  ownerUid: string | null;
};
type StoredRecord = { version: 1; iv: Uint8Array; ciphertext: ArrayBuffer };

let pending: Promise<unknown> = Promise.resolve();
let nativeKeyFlight: Promise<CryptoKey> | null = null;

function inOrder<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => {});
  return result;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keys');
      request.result.createObjectStore('records');
    };
    request.onerror = () => reject(request.error ?? new Error('Local draft storage is unavailable.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function localKey(create: boolean): Promise<CryptoKey> {
  if (isNativePlatform()) {
    if (nativeKeyFlight) return nativeKeyFlight;
    const flight = (async () => {
      const existing = await SecureStorage.getItem(nativeKeyName);
      if (existing) {
        const bytes = Uint8Array.from(atob(existing), character => character.charCodeAt(0));
        if (bytes.byteLength !== 32) throw new Error('The local draft key is invalid.');
        return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
      }
      if (!create) throw new Error('The key for this local draft is unavailable.');
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      await SecureStorage.setItem(nativeKeyName, btoa(String.fromCharCode(...bytes)));
      return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
    })();
    nativeKeyFlight = flight;
    try { return await flight; }
    finally { nativeKeyFlight = null; }
  }
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('keys', create ? 'readwrite' : 'readonly');
    const store = tx.objectStore('keys');
    let key: CryptoKey | undefined;
    const get = store.get(recordName);
    get.onsuccess = () => {
      key = get.result as CryptoKey | undefined;
      if (!key && create) {
        void crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
          .then(generated => {
            // CryptoKey creation is async; the read transaction may close first.
            database.close();
            return storeGeneratedKey(generated);
          }).then(resolve, reject);
      } else if (!key) reject(new Error('The key for this local draft is unavailable.'));
    };
    tx.oncomplete = () => { database.close(); if (key) resolve(key); };
    tx.onerror = tx.onabort = () => { database.close(); reject(tx.error ?? new Error('Local draft storage is unavailable.')); };
  });
}

async function storeGeneratedKey(generated: CryptoKey): Promise<CryptoKey> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    let winning = generated;
    const get = store.get(recordName);
    get.onsuccess = () => { if (get.result) winning = get.result as CryptoKey; else store.put(generated, recordName); };
    tx.oncomplete = () => { database.close(); resolve(winning); };
    tx.onerror = tx.onabort = () => { database.close(); reject(tx.error ?? new Error('Local draft key could not be saved.')); };
  });
}

async function readRecord(): Promise<StoredRecord | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('records', 'readonly');
    const request = tx.objectStore('records').get(recordName);
    let record: StoredRecord | null = null;
    request.onsuccess = () => { record = request.result ?? null; };
    tx.oncomplete = () => { database.close(); resolve(record); };
    tx.onerror = tx.onabort = () => { database.close(); reject(tx.error ?? new Error('Local draft could not be read.')); };
  });
}

async function writeRecord(record: StoredRecord | null): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('records', 'readwrite');
    if (record) tx.objectStore('records').put(record, recordName);
    else tx.objectStore('records').delete(recordName);
    tx.oncomplete = () => { database.close(); resolve(); };
    tx.onerror = tx.onabort = () => { database.close(); reject(tx.error ?? new Error('Local draft could not be saved.')); };
  });
}

function validate(value: unknown): OnboardingDraft {
  if (!value || typeof value !== 'object') throw new Error('The local onboarding draft is invalid.');
  const draft = value as Partial<OnboardingDraft>;
  if ((draft.version !== 1 && draft.version !== 2 && draft.version !== 3) || typeof draft.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(draft.id) ||
      typeof draft.screen !== 'number' || draft.screen < 1 || draft.screen > (draft.version === 2 ? 8 : 14) ||
      !draft.state || typeof draft.state !== 'object' || Array.isArray(draft.state) ||
      typeof draft.entrySaved !== 'boolean' ||
      !(draft.ownerUid === null || typeof draft.ownerUid === 'string')) {
    throw new Error('The local onboarding draft is invalid.');
  }
  const body = draft.state.firstEntryText;
  if (body !== undefined && (typeof body !== 'string' || body.length > maxEntryLength)) throw new Error('The local first entry is invalid.');
  return draft as OnboardingDraft;
}

async function readUnlocked(): Promise<OnboardingDraft | null> {
  const record = await readRecord();
  if (!record) return null;
  if (record.version !== 1 || !(record.iv instanceof Uint8Array) || record.iv.byteLength !== 12 ||
      !(record.ciphertext instanceof ArrayBuffer)) throw new Error('The local onboarding draft is invalid.');
  const key = await localKey(false);
  const iv = new Uint8Array(new ArrayBuffer(12));
  iv.set(record.iv);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, record.ciphertext);
  return validate(JSON.parse(new TextDecoder().decode(bytes)));
}

async function writeUnlocked(draft: OnboardingDraft): Promise<void> {
  const valid = validate(draft);
  const key = await localKey(true);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(valid));
  if (plaintext.byteLength > 150_000) throw new Error('The local onboarding draft is too large.');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, plaintext);
  await writeRecord({ version: 1, iv, ciphertext });
}

export function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  return inOrder(readUnlocked);
}

export function saveOnboardingProgress(screen: number, state: Record<string, unknown>): Promise<OnboardingDraft> {
  return inOrder(async () => {
    const prior = await readUnlocked();
    if (prior?.ownerUid) return prior;
    const next: OnboardingDraft = {
      version: 3, id: prior?.id ?? crypto.randomUUID(), screen, state,
      entrySaved: Boolean(prior?.entrySaved && prior.state.firstEntryText === state.firstEntryText), ownerUid: null,
    };
    await writeUnlocked(next);
    return next;
  });
}

export function saveFirstOnboardingEntry(text: string, prompt: string | null, state: Record<string, unknown>): Promise<OnboardingDraft> {
  return inOrder(async () => {
    const prior = await readUnlocked();
    if (prior?.ownerUid) throw new Error('This first entry already belongs to an account.');
    if (!text.trim() || text.length > maxEntryLength) throw new Error('Write between 1 and 50,000 characters before saving.');
    const next: OnboardingDraft = {
      version: 3, id: prior?.id ?? crypto.randomUUID(), screen: 6,
      state: { ...state, firstEntryText: text, prompt }, entrySaved: true, ownerUid: null,
    };
    await writeUnlocked(next);
    return next;
  });
}

export function bindOnboardingDraft(uid: string): Promise<OnboardingDraft | null> {
  return inOrder(async () => {
    if (!uid || uid.length > 128 || uid.includes('/')) throw new Error('A verified account is required.');
    const prior = await readUnlocked();
    if (!prior) return null;
    if (prior.ownerUid && prior.ownerUid !== uid) throw new Error('The local first entry belongs to another account.');
    const next = { ...prior, ownerUid: uid };
    await writeUnlocked(next);
    return next;
  });
}

export function clearOnboardingDraft(id: string): Promise<void> {
  return inOrder(async () => {
    const prior = await readUnlocked();
    if (prior?.id === id) await writeRecord(null);
  });
}

/** Explicit recovery action when a lost/corrupt key makes decryption impossible. */
export function discardUnreadableOnboardingDraft(): Promise<void> {
  return inOrder(() => writeRecord(null));
}
