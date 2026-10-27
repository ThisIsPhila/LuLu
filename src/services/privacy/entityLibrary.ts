import { decryptPrivate, encryptPrivate, type Envelope } from '../backend/deviceVault.ts';
import type { LocalVaultSession } from '../vault/localVault.ts';
import type { DetectedEntity } from './contracts.ts';
import type { EntityType } from '../../domain/transform.ts';

/** A user-owned mapping. `sourceText` is never written outside the encrypted payload. */
export type EntityIdentity = {
  id: string;
  type: EntityLibraryType;
  sourceText: string;
  normalizedText: string;
  alias: string;
};

/** Existing domain types plus explicit entity/format labels used by the demo detector. */
export type EntityLibraryType = EntityType | 'Location' | 'Organization' | 'Email' | 'Phone Number' | 'Date' | 'Relationship';

export type EntityLibrarySnapshot = { entities: EntityIdentity[]; version: number };

export class EntityLibraryLockedError extends Error {
  constructor() {
    super('Unlock the private session to access saved identity mappings.');
    this.name = 'EntityLibraryLockedError';
  }
}

export class EntityLibraryConflictError extends Error {
  constructor() {
    super('Identity mappings changed in another session. Reload the library and retry.');
    this.name = 'EntityLibraryConflictError';
  }
}

const DATABASE = 'lulu.private-entity-library.v1';
const STORE = 'entities';
const ROW_ID = 'private-entity-library';
const TYPES = new Set<EntityLibraryType>(['Person', 'Place', 'Time', 'Topic', 'Pronoun', 'Location', 'Organization', 'Email', 'Phone Number', 'Date', 'Relationship']);

type StoredLibrary = { key: string; ownerId: string; version: number; envelope: Envelope };
type Payload = { schemaVersion: 1; ownerId: string; version: number; entities: EntityIdentity[] };
type Persistence = {
  assertAvailable(): void;
  load(): Promise<EntityLibrarySnapshot>;
  save(entities: EntityIdentity[], expectedVersion: number): Promise<EntityLibrarySnapshot>;
  dispose?(): void;
};

/** Exact normalized source plus type is the lookup key. No semantic matching. */
export function normalizeEntityText(text: string): string {
  return text.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
}

function entityKey(text: string, type: string): string {
  return JSON.stringify([type, normalizeEntityText(text)]);
}

export function entityIdentityType(type: string): EntityLibraryType | null {
  const key = type.trim().toLocaleLowerCase('und').replace(/\s+/gu, ' ');
  const canonical: Record<string, EntityLibraryType> = {
    person: 'Person', place: 'Place', time: 'Time', topic: 'Topic', pronoun: 'Pronoun',
    location: 'Location', organization: 'Organization', email: 'Email', 'phone number': 'Phone Number',
    date: 'Date', relationship: 'Relationship',
  };
  return canonical[key] ?? null;
}

function validateEntity(entity: unknown): EntityIdentity {
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) throw new TypeError('Identity mapping is invalid.');
  const value = entity as Partial<EntityIdentity>;
  if (typeof value.id !== 'string' || !value.id || value.id.length > 200 ||
      typeof value.type !== 'string' || !TYPES.has(value.type as EntityLibraryType) ||
      typeof value.sourceText !== 'string' || !value.sourceText.trim() || value.sourceText.length > 500 ||
      typeof value.alias !== 'string' || !value.alias.trim() || value.alias.length > 200 ||
      value.normalizedText !== normalizeEntityText(value.sourceText)) {
    throw new TypeError('Identity mapping fields are invalid.');
  }
  return { id: value.id, type: value.type, sourceText: value.sourceText, normalizedText: value.normalizedText, alias: value.alias.trim() };
}

function validateEntities(value: unknown): EntityIdentity[] {
  if (!Array.isArray(value) || value.length > 500) throw new TypeError('The identity library can contain at most 500 mappings.');
  const ids = new Set<string>();
  const keys = new Set<string>();
  return value.map((item) => {
    const entity = validateEntity(item);
    const key = entityKey(entity.sourceText, entity.type);
    if (ids.has(entity.id) || keys.has(key)) throw new TypeError('Identity mappings must have unique IDs and exact text/type pairs.');
    ids.add(entity.id);
    keys.add(key);
    return entity;
  });
}

function assertOwnerId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || value.trim() !== value) {
    throw new TypeError('A valid account identifier is required.');
  }
}

function makeId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Encrypted identity storage is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open encrypted identity storage.'));
    request.onblocked = () => reject(new Error('Encrypted identity storage is blocked by another tab.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

function sessionPersistence(session: LocalVaultSession): Persistence {
  assertOwnerId(session?.ownerId);
  const ownerId = session.ownerId;
  const generation = session.generation();
  if (!Number.isSafeInteger(generation) || generation < 0) throw new TypeError('Session generation is invalid.');
  const key = JSON.stringify([ownerId, ROW_ID]);
  const assertSession = () => {
    let unlocked = false;
    let currentGeneration = -1;
    try { unlocked = session.isUnlocked() === true; currentGeneration = session.generation(); } catch { /* closed session */ }
    if (!unlocked || session.ownerId !== ownerId || currentGeneration !== generation) throw new EntityLibraryLockedError();
  };

  async function read(): Promise<StoredLibrary | undefined> {
    assertSession();
    const db = await openDatabase();
    try { assertSession(); }
    catch (error) { db.close(); throw error; }
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE], 'readonly');
      const request = tx.objectStore(STORE).get(key);
      let row: StoredLibrary | undefined;
      request.onsuccess = () => { row = request.result as StoredLibrary | undefined; };
      request.onerror = () => { try { tx.abort(); } catch {} };
      tx.oncomplete = () => { db.close(); try { assertSession(); resolve(row); } catch (error) { reject(error); } };
      tx.onerror = tx.onabort = () => { db.close(); reject(request.error ?? tx.error ?? new Error('Could not read encrypted identities.')); };
    });
  }

  return {
    assertAvailable: assertSession,
    async load() {
      const row = await read();
      if (!row) return { entities: [], version: 0 };
      if (row.key !== key || row.ownerId !== ownerId || !Number.isSafeInteger(row.version) || row.version < 1) {
        throw new Error('Encrypted identity storage validation failed.');
      }
      const payload = await decryptPrivate<Payload>(ownerId, ROW_ID, row.envelope);
      assertSession();
      if (payload.schemaVersion !== 1 || payload.ownerId !== ownerId || payload.version !== row.version) {
        throw new Error('Encrypted identity storage validation failed.');
      }
      return { entities: validateEntities(payload.entities), version: row.version };
    },
    async save(entities, expectedVersion) {
      assertSession();
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new TypeError('Identity library version is invalid.');
      const safeEntities = validateEntities(entities);
      const version = expectedVersion + 1;
      const payload: Payload = { schemaVersion: 1, ownerId, version, entities: safeEntities };
      const envelope = await encryptPrivate(ownerId, ROW_ID, payload);
      assertSession();
      const db = await openDatabase();
      try { assertSession(); } catch (error) { db.close(); throw error; }
      return new Promise((resolve, reject) => {
        let abortReason: unknown;
        const tx = db.transaction([STORE], 'readwrite');
        const store = tx.objectStore(STORE);
        const currentRequest = store.get(key);
        currentRequest.onsuccess = () => {
          try {
            assertSession();
            const current = currentRequest.result as StoredLibrary | undefined;
            if ((current?.version ?? 0) !== expectedVersion) {
              abortReason = new EntityLibraryConflictError(); tx.abort(); return;
            }
            const put = store.put({ key, ownerId, version, envelope } satisfies StoredLibrary);
            put.onerror = () => { abortReason = put.error; try { tx.abort(); } catch {} };
            put.onsuccess = () => { try { assertSession(); } catch (error) { abortReason = error; tx.abort(); } };
          } catch (error) { abortReason = error; try { tx.abort(); } catch {} }
        };
        currentRequest.onerror = () => { abortReason = currentRequest.error; try { tx.abort(); } catch {} };
        tx.oncomplete = () => { db.close(); try { assertSession(); resolve({ entities: safeEntities, version }); } catch (error) { reject(error); } };
        tx.onerror = tx.onabort = () => { db.close(); reject(abortReason ?? currentRequest.error ?? tx.error ?? new Error('Could not save encrypted identities.')); };
      });
    },
  };
}

function memoryPersistence(): Persistence {
  let entities: EntityIdentity[] = [];
  let version = 0;
  let active = true;
  return {
    assertAvailable() { if (!active) throw new EntityLibraryLockedError(); },
    async load() { if (!active) throw new EntityLibraryLockedError(); return { entities: entities.map(entity => ({ ...entity })), version }; },
    async save(next, expectedVersion) {
      if (!active) throw new EntityLibraryLockedError();
      if (expectedVersion !== version) throw new EntityLibraryConflictError();
      entities = validateEntities(next).map(entity => ({ ...entity }));
      version++;
      return { entities: entities.map(entity => ({ ...entity })), version };
    },
    dispose() { active = false; entities = []; version = 0; },
  };
}

export type ApplyEntityLibraryResult = { sanitised: string; entities: DetectedEntity[] };

/** Session-bound facade shared by authenticated and explicitly memory-only demo use. */
export class EntityLibrary {
  private readonly persistence: Persistence;
  private snapshot: EntityLibrarySnapshot | null = null;
  private readonly memoryOnly: boolean;
  private disposed = false;

  constructor(persistence: Persistence, options: { memoryOnly?: boolean } = {}) {
    this.persistence = persistence;
    this.memoryOnly = options.memoryOnly === true;
  }

  /** Call when the demo session ends; drops the only in-memory copy. */
  dispose(): void {
    this.disposed = true;
    this.snapshot = null;
    if (this.memoryOnly) this.persistence.dispose?.();
  }

  private assertAvailable(): void {
    if (this.disposed) throw new EntityLibraryLockedError();
    this.persistence.assertAvailable();
  }

  async load(): Promise<EntityLibrarySnapshot> {
    this.assertAvailable();
    const loaded = await this.persistence.load();
    this.assertAvailable();
    this.snapshot = loaded;
    return { entities: this.snapshot.entities.map(entity => ({ ...entity })), version: this.snapshot.version };
  }

  private async current(): Promise<EntityLibrarySnapshot> {
    this.assertAvailable();
    if (!this.snapshot) return this.load();
    return { entities: this.snapshot.entities.map(entity => ({ ...entity })), version: this.snapshot.version };
  }

  async match(text: string, type: string): Promise<EntityIdentity | null> {
    const normalizedType = entityIdentityType(type);
    if (!text.trim() || !normalizedType) return null;
    const current = await this.current();
    this.assertAvailable();
    const key = entityKey(text, normalizedType);
    const found = current.entities.find(entity => entityKey(entity.sourceText, entity.type) === key);
    return found ? { ...found } : null;
  }

  async setAlias(input: { text: string; type: string; alias: string }): Promise<EntityIdentity> {
    const type = typeof input?.type === 'string' ? entityIdentityType(input.type) : null;
    if (!input || typeof input.text !== 'string' || !input.text.trim() || input.text.length > 500 || !type) throw new TypeError('Choose a valid source text and identity type.');
    if (typeof input.alias !== 'string' || !input.alias.trim() || input.alias.length > 200) throw new TypeError('A representation must contain 1 to 200 characters.');
    const current = await this.current();
    const normalizedText = normalizeEntityText(input.text);
    this.assertAvailable();
    const found = current.entities.find(entity => entity.type === type && entity.normalizedText === normalizedText);
    const entity: EntityIdentity = found
      ? { ...found, alias: input.alias.trim() }
      : { id: makeId(), type, sourceText: input.text.trim(), normalizedText, alias: input.alias.trim() };
    const entities = found ? current.entities.map(item => item.id === found.id ? entity : item) : [...current.entities, entity];
    const saved = await this.persistence.save(entities, current.version);
    this.assertAvailable();
    this.snapshot = saved;
    return { ...entity };
  }

  async remove(input: { text: string; type: string }): Promise<boolean> {
    const type = typeof input?.type === 'string' ? entityIdentityType(input.type) : null;
    if (typeof input?.text !== 'string' || !type) throw new TypeError('Choose a valid source text and identity type.');
    const current = await this.current();
    this.assertAvailable();
    const key = entityKey(input.text, type);
    const filtered = current.entities.filter(entity => entityKey(entity.sourceText, entity.type) !== key);
    if (filtered.length === current.entities.length) return false;
    const saved = await this.persistence.save(filtered, current.version);
    this.assertAvailable();
    this.snapshot = saved;
    return true;
  }

  /**
   * Replaces only the supplied detector spans. Unknown exact text/type pairs
   * receive a stable generated alias and are kept in encrypted or session memory.
   * No detector confidence is changed and no identity is inferred semantically.
   */
  async apply(input: string, detections: readonly DetectedEntity[]): Promise<ApplyEntityLibraryResult> {
    const current = await this.current();
    this.assertAvailable();
    const sorted = [...detections].sort((a, b) => a.start - b.start || b.end - a.end);
    let end = 0;
    let output = '';
    const entities = [...current.entities];
    const seen = new Map<string, EntityIdentity>();
    let changed = false;
    for (const detection of sorted) {
      if (!Number.isSafeInteger(detection.start) || !Number.isSafeInteger(detection.end) || detection.start < end ||
          detection.end <= detection.start || detection.end > input.length || !validBoundary(input, detection.start) ||
          !validBoundary(input, detection.end) || !entityIdentityType(detection.label) ||
          !Number.isFinite(detection.confidence) || detection.confidence < 0 || detection.confidence > 1) {
        throw new TypeError('Detected identity span is invalid or overlapping.');
      }
      const type = entityIdentityType(detection.label)!;
      const text = input.slice(detection.start, detection.end);
      const key = entityKey(text, type);
      let identity = seen.get(key) ?? entities.find(entity => entityKey(entity.sourceText, entity.type) === key);
      if (!identity) {
        const sameTypeCount = entities.filter(entity => entity.type === type).length + 1;
        identity = { id: makeId(), type, sourceText: text, normalizedText: normalizeEntityText(text), alias: `${type} ${sameTypeCount}` };
        entities.push(identity);
        changed = true;
      }
      seen.set(key, identity);
      output += input.slice(end, detection.start) + identity.alias;
      end = detection.end;
    }
    if (changed) {
      const saved = await this.persistence.save(entities, current.version);
      this.assertAvailable();
      this.snapshot = saved;
    }
    return { sanitised: output + input.slice(end), entities: sorted.map(entity => ({ ...entity })) };
  }
}

function validBoundary(text: string, index: number): boolean {
  return !(index > 0 && index < text.length && /[\uD800-\uDBFF]/.test(text[index - 1]) && /[\uDC00-\uDFFF]/.test(text[index]));
}

/** Protected-session library backed by existing per-account AES-GCM device storage. */
export function createSessionEntityLibrary(session: LocalVaultSession): EntityLibrary {
  return new EntityLibrary(sessionPersistence(session));
}

/** Public demo only: all mappings disappear when `dispose()` is called or tab memory is lost. */
export function createMemoryEntityLibrary(): EntityLibrary {
  return new EntityLibrary(memoryPersistence(), { memoryOnly: true });
}
