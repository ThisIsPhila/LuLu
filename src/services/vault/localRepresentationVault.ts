import { decryptPrivate, encryptPrivate, type Envelope } from '../backend/deviceVault.ts';
import type { Entity, EntityType } from '../../domain/transform.ts';
import type { LocalVaultSession } from './localVault.ts';

const DATABASE = 'lulu.local-representations.v1';
const DATABASE_VERSION = 1;
const STORE = 'representations';
const RECORD_ID = 'private-representation-set';
const ENTITY_TYPES: readonly EntityType[] = ['Person', 'Place', 'Time', 'Topic', 'Pronoun'];

type StoredRepresentations = { key: string; ownerId: string; version: number; envelope: Envelope };
type EncryptedRepresentations = { schemaVersion: 1; ownerId: string; version: number; entities: Entity[] };
export type LocalRepresentationSnapshot = { entities: Entity[]; version: number };

export class LocalRepresentationLockedError extends Error {
  constructor() {
    super('Unlock the private session to access saved representations.');
    this.name = 'LocalRepresentationLockedError';
  }
}

export class LocalRepresentationConflictError extends Error {
  constructor() {
    super('Saved representations changed in another session. Reopen the inspector before saving.');
    this.name = 'LocalRepresentationConflictError';
  }
}

function ownerKey(ownerId: string): string { return JSON.stringify([ownerId, RECORD_ID]); }

function assertId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || value.trim() !== value) {
    throw new TypeError(`${field} must be a non-empty value up to 200 characters.`);
  }
}

function assertSession(session: LocalVaultSession, ownerId: string, generation: number): void {
  let unlocked = false;
  let currentGeneration = -1;
  try {
    unlocked = session.isUnlocked() === true;
    currentGeneration = session.generation();
  } catch { /* Closed sessions fail closed. */ }
  if (!unlocked || session.ownerId !== ownerId || currentGeneration !== generation || !Number.isSafeInteger(currentGeneration)) {
    throw new LocalRepresentationLockedError();
  }
}

function normalizeEntities(value: unknown): Entity[] {
  if (!Array.isArray(value) || value.length > 100) throw new TypeError('Add no more than 100 private references.');
  const ids = new Set<string>();
  const originals = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('A private reference is invalid.');
    const candidate = item as Partial<Entity>;
    assertId(candidate.id, 'Reference ID');
    assertId(candidate.original, 'Original reference');
    assertId(candidate.alias, 'Representation');
    if (!ENTITY_TYPES.includes(candidate.type as EntityType)) throw new TypeError('Choose a reference type.');
    const normalizedOriginal = candidate.original.toLocaleLowerCase();
    if (ids.has(candidate.id) || originals.has(normalizedOriginal)) throw new TypeError('Each original reference can be added once.');
    ids.add(candidate.id);
    originals.add(normalizedOriginal);
    // Persist only fields the user configured. Mentions and context are derived
    // from the current writing and are never stored as invented audit metadata.
    return { id: candidate.id, original: candidate.original, alias: candidate.alias, type: candidate.type as EntityType };
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Encrypted local storage is unavailable.'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(DATABASE, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error ?? new Error('Could not open encrypted representation storage.'));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new Error('Encrypted representation storage is blocked by another tab.'));
    };
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function readRow(session: LocalVaultSession, ownerId: string, generation: number): Promise<StoredRepresentations | undefined> {
  assertSession(session, ownerId, generation);
  const database = await openDatabase();
  try { assertSession(session, ownerId, generation); }
  catch (error) { database.close(); throw error; }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE], 'readonly');
    const request = transaction.objectStore(STORE).get(ownerKey(ownerId));
    let row: StoredRepresentations | undefined;
    request.onsuccess = () => { row = request.result as StoredRepresentations | undefined; };
    request.onerror = () => { try { transaction.abort(); } catch {} };
    transaction.oncomplete = () => {
      database.close();
      try { assertSession(session, ownerId, generation); resolve(row); }
      catch (error) { reject(error); }
    };
    transaction.onerror = transaction.onabort = () => {
      database.close();
      reject(request.error ?? transaction.error ?? new Error('Could not read private representations.'));
    };
  });
}

export class LocalRepresentationVault {
  private readonly session: LocalVaultSession;
  private readonly ownerId: string;
  private readonly generation: number;

  constructor(session: LocalVaultSession) {
    this.session = session;
    assertId(session?.ownerId, 'ownerId');
    this.ownerId = session.ownerId;
    this.generation = session.generation();
    if (!Number.isSafeInteger(this.generation) || this.generation < 0) throw new TypeError('Session generation is invalid.');
    assertSession(session, this.ownerId, this.generation);
  }

  assertUnlocked(): void { assertSession(this.session, this.ownerId, this.generation); }
  getOwnerId(): string { assertSession(this.session, this.ownerId, this.generation); return this.ownerId; }

  async load(): Promise<LocalRepresentationSnapshot> {
    assertSession(this.session, this.ownerId, this.generation);
    const row = await readRow(this.session, this.ownerId, this.generation);
    if (!row) return { entities: [], version: 0 };
    if (row.key !== ownerKey(this.ownerId) || row.ownerId !== this.ownerId || !Number.isSafeInteger(row.version) || row.version < 1) {
      throw new Error('Private representation storage identity validation failed.');
    }
    const payload = await decryptPrivate<EncryptedRepresentations>(this.ownerId, RECORD_ID, row.envelope);
    assertSession(this.session, this.ownerId, this.generation);
    if (payload.schemaVersion !== 1 || payload.ownerId !== this.ownerId || payload.version !== row.version) {
      throw new Error('Private representation storage identity validation failed.');
    }
    return { entities: normalizeEntities(payload.entities), version: row.version };
  }

  async save(entities: Entity[], expectedVersion: number): Promise<LocalRepresentationSnapshot> {
    assertSession(this.session, this.ownerId, this.generation);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new TypeError('Representation version is invalid.');
    const normalized = normalizeEntities(entities);
    const version = expectedVersion + 1;
    if (!Number.isSafeInteger(version)) throw new TypeError('Representation version is invalid.');
    const payload: EncryptedRepresentations = { schemaVersion: 1, ownerId: this.ownerId, version, entities: normalized };
    const envelope = await encryptPrivate(this.ownerId, RECORD_ID, payload);
    assertSession(this.session, this.ownerId, this.generation);
    const row: StoredRepresentations = { key: ownerKey(this.ownerId), ownerId: this.ownerId, version, envelope };
    const database = await openDatabase();
    try { assertSession(this.session, this.ownerId, this.generation); }
    catch (error) { database.close(); throw error; }
    return new Promise((resolve, reject) => {
      let abortReason: unknown;
      const transaction = database.transaction([STORE], 'readwrite');
      const store = transaction.objectStore(STORE);
      const currentRequest = store.get(row.key);
      currentRequest.onsuccess = () => {
        try {
          assertSession(this.session, this.ownerId, this.generation);
          const current = currentRequest.result as StoredRepresentations | undefined;
          if ((current?.version ?? 0) !== expectedVersion) {
            abortReason = new LocalRepresentationConflictError();
            transaction.abort();
            return;
          }
          const write = store.put(row);
          write.onsuccess = () => {
            try { assertSession(this.session, this.ownerId, this.generation); }
            catch (error) { abortReason = error; transaction.abort(); }
          };
          write.onerror = () => { abortReason = write.error; try { transaction.abort(); } catch {} };
        } catch (error) { abortReason = error; try { transaction.abort(); } catch {} }
      };
      currentRequest.onerror = () => { abortReason = currentRequest.error; try { transaction.abort(); } catch {} };
      transaction.oncomplete = () => {
        database.close();
        try {
          assertSession(this.session, this.ownerId, this.generation);
          resolve({ entities: normalized, version });
        } catch (error) { reject(error); }
      };
      transaction.onerror = transaction.onabort = () => {
        database.close();
        reject(abortReason ?? currentRequest.error ?? transaction.error ?? new Error('Could not save private representations.'));
      };
    });
  }
}
