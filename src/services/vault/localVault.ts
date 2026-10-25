import { decryptPrivate, encryptPrivate, type Envelope } from '../backend/deviceVault.ts';

/**
 * Local encrypted append-only revision storage.
 *
 * This is a storage boundary, not an authentication implementation. Callers must
 * supply live session and generation callbacks. A LocalVault is bound to the
 * owner and session generation captured at construction; create a new instance
 * after each successful authentication and invalidate the prior generation on
 * lock/exit.
 * The underlying key is browser-held and is not cryptographically derived from
 * or bound to a passkey; same-origin script can still ask the browser to use it.
 * Content is JSON-only today; raw image/audio/file bytes are not accepted here.
 * A full IndexedDB rollback/deletion cannot be detected by this local store.
 */

const DATABASE = 'lulu.local-vault.v1';
const DATABASE_VERSION = 2;
const REVISION_STORE = 'revisions';
const HEAD_STORE = 'heads';
const MAX_CONTENT_BYTES = 1_000_000;

type RevisionKind = 'original' | 'derived';
type OriginalProvenance = 'user-authored' | 'user-captured';

export interface LocalVaultSession {
  /** Pseudonymous authenticated account identifier, used in key lookup and AAD. */
  ownerId: string;
  /** Monotonic session epoch; increment on lock, exit, or account change. */
  generation: () => number;
  /** Must reflect current authorization, not a snapshot of session state. */
  isUnlocked: () => boolean;
}

export interface OriginalInput {
  recordId: string;
  revisionId: string;
  content: unknown;
  /** Caller attestation; sample/demo/synthetic provenance is rejected. */
  provenance: OriginalProvenance;
}

export interface DerivedInput {
  recordId: string;
  revisionId: string;
  parentRevisionId: string;
  content: unknown;
}

export interface LocalVaultRevision {
  ownerId: string;
  recordId: string;
  revisionId: string;
  parentRevisionId: string | null;
  kind: RevisionKind;
  provenance: OriginalProvenance | null;
  /** Device clock only; not a trusted timestamp or proof of capture time. */
  clientCreatedAt: string;
  content: unknown;
  sha256: string;
}

interface StoredRevision {
  key: string;
  ownerRecordKey: string;
  ownerId: string;
  recordId: string;
  revisionId: string;
  parentRevisionId: string | null;
  kind: RevisionKind;
  clientCreatedAt: string;
  envelope: Envelope;
}

interface StoredHead {
  key: string;
  ownerId: string;
  recordId: string;
  latestRevisionId: string;
  revisionCount: number;
}

interface EncryptedPayload {
  schemaVersion: 1;
  ownerId: string;
  recordId: string;
  revisionId: string;
  parentRevisionId: string | null;
  kind: RevisionKind;
  provenance: OriginalProvenance | null;
  clientCreatedAt: string;
  content: unknown;
  sha256: string;
}

export class LocalVaultLockedError extends Error {
  constructor() {
    super('Unlock the private session to access the local vault.');
    this.name = 'LocalVaultLockedError';
  }
}

export class LocalVaultConflictError extends Error {
  constructor(message = 'This revision conflicts with the current local history.') {
    super(message);
    this.name = 'LocalVaultConflictError';
  }
}

function assertId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 200 || value.trim() !== value) {
    throw new TypeError(`${field} must be a non-empty identifier of at most 200 characters.`);
  }
}

function ownerRecordKey(ownerId: string, recordId: string): string {
  return JSON.stringify([ownerId, recordId]);
}

function revisionKey(ownerId: string, recordId: string, revisionId: string): string {
  return JSON.stringify([ownerId, recordId, revisionId]);
}

function aadId(ownerId: string, recordId: string, revisionId: string): string {
  // deviceVault adds ownerId to AES-GCM additionalData; this tuple binds both
  // record and revision identities without delimiter ambiguity.
  return JSON.stringify([ownerId, recordId, revisionId]);
}

function assertSession(session: LocalVaultSession, expectedOwnerId: string, expectedGeneration: number): string {
  assertId(session?.ownerId, 'ownerId');
  let unlocked = false;
  let currentGeneration = -1;
  try {
    unlocked = session.isUnlocked() === true;
    currentGeneration = session.generation();
  } catch {
    unlocked = false;
  }
  if (!unlocked || session.ownerId !== expectedOwnerId || currentGeneration !== expectedGeneration || !Number.isSafeInteger(currentGeneration)) {
    throw new LocalVaultLockedError();
  }
  return expectedOwnerId;
}

function assertStoredIdentity(row: StoredRevision, ownerId: string, recordId: string, revisionId: string): void {
  if (row.key !== revisionKey(ownerId, recordId, revisionId) || row.ownerId !== ownerId || row.recordId !== recordId ||
      row.revisionId !== revisionId || row.ownerRecordKey !== ownerRecordKey(ownerId, recordId)) {
    throw new Error('Local vault revision lookup identity validation failed.');
  }
}

function validateRevisionChain(ownerId: string, recordId: string, head: StoredHead | undefined, rows: StoredRevision[]): StoredRevision[] {
  if (!head && rows.length === 0) return [];
  if (!head || head.key !== ownerRecordKey(ownerId, recordId) || head.ownerId !== ownerId || head.recordId !== recordId ||
      !Number.isSafeInteger(head.revisionCount) || head.revisionCount < 1 || head.revisionCount !== rows.length) {
    throw new Error('Local vault revision history does not match its record head.');
  }
  const byParent = new Map<string | null, StoredRevision>();
  for (const row of rows) {
    assertStoredIdentity(row, ownerId, recordId, row.revisionId);
    if (byParent.has(row.parentRevisionId)) throw new Error('Local vault revision chain contains a fork.');
    byParent.set(row.parentRevisionId, row);
  }
  const chain: StoredRevision[] = [];
  let next = byParent.get(null);
  while (next) {
    if ((chain.length === 0 && next.kind !== 'original') || (chain.length > 0 && next.kind !== 'derived')) {
      throw new Error('Local vault revision chain has an invalid revision kind.');
    }
    chain.push(next);
    next = byParent.get(next.revisionId);
  }
  if (chain.length !== rows.length || chain.at(-1)?.revisionId !== head.latestRevisionId) {
    throw new Error('Local vault revision history is incomplete or inconsistent with its head.');
  }
  return chain;
}

function assertPlainJson(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new TypeError('Vault content must not contain non-finite or lossy numbers.');
    return;
  }
  if (typeof value !== 'object') throw new TypeError('Vault content must contain only plain JSON values.');
  if (ancestors.has(value)) throw new TypeError('Vault content must not contain circular references.');
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype) throw new TypeError('Vault content must contain only plain JSON arrays.');
    ancestors.add(value);
    const keys = Reflect.ownKeys(value);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) throw new TypeError('Vault content must not contain sparse arrays.');
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !('value' in descriptor)) throw new TypeError('Vault content must not contain accessors or hidden array values.');
      assertPlainJson(descriptor.value, ancestors);
    }
    if (keys.some((key) => typeof key === 'symbol' || (key !== 'length' && !/^(0|[1-9]\d*)$/.test(key)))) {
      throw new TypeError('Vault content must not contain extra array properties.');
    }
    ancestors.delete(value);
    return;
  }
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Vault content must contain only plain JSON objects.');
  ancestors.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') throw new TypeError('Vault content must not contain symbol properties.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new TypeError('Vault content must not contain accessors or hidden properties.');
    assertPlainJson(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}

function serializeContent(content: unknown): unknown {
  assertPlainJson(content);
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(content);
  } catch {
    throw new TypeError('Vault content must be JSON-serializable.');
  }
  if (serialized === undefined) throw new TypeError('Vault content must be JSON-serializable.');
  if (new TextEncoder().encode(serialized).byteLength > MAX_CONTENT_BYTES) {
    throw new RangeError('Vault content exceeds the 1 MB local revision limit.');
  }
  const normalized = JSON.parse(serialized) as unknown;
  rejectMarkedSynthetic(normalized);
  return normalized;
}

function rejectMarkedSynthetic(value: unknown, visited = new Set<object>()): void {
  if (!value || typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    for (const item of value) rejectMarkedSynthetic(item, visited);
    return;
  }
  const data = value as Record<string, unknown>;
  if (data.synthetic === true || data.isSynthetic === true || data.isSample === true || data.isDemo === true ||
      data.seeded === true || data.isSeeded === true || data.isStarterContent === true || data.starterContent === true ||
      ['seedRef', 'seedId', 'starterRef', 'starterId'].some((key) => typeof data[key] === 'string' && data[key] !== '')) {
    throw new TypeError('Synthetic or sample content cannot be stored as private evidence.');
  }
  for (const marker of ['provenance', 'sourceType', 'contentOrigin', 'kind']) {
    if (typeof data[marker] === 'string' && /^(synthetic|sample|demo|fixture|starter(?:[_ -]?content)?|seed(?:ed)?)(?:[:/_-]|$)/i.test(data[marker] as string)) {
      throw new TypeError('Synthetic or sample content cannot be stored as private evidence.');
    }
  }
  for (const item of Object.values(data)) rejectMarkedSynthetic(item, visited);
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(REVISION_STORE)) {
        const revisions = db.createObjectStore(REVISION_STORE, { keyPath: 'key' });
        revisions.createIndex('ownerRecordKey', 'ownerRecordKey', { unique: false });
      }
      const revisions = request.transaction!.objectStore(REVISION_STORE);
      if (!revisions.indexNames.contains('ownerId')) revisions.createIndex('ownerId', 'ownerId', { unique: false });
      const heads = db.objectStoreNames.contains(HEAD_STORE)
        ? request.transaction!.objectStore(HEAD_STORE)
        : db.createObjectStore(HEAD_STORE, { keyPath: 'key' });
      if (!heads.indexNames.contains('ownerId')) heads.createIndex('ownerId', 'ownerId', { unique: false });
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open local vault storage.'));
    request.onblocked = () => reject(new Error('Local vault storage upgrade is blocked by another tab.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact(
  stores: string[],
  mode: IDBTransactionMode,
  session: LocalVaultSession,
  expectedOwnerId: string,
  expectedGeneration: number,
  body: (tx: IDBTransaction, abort: (reason?: unknown) => void) => void,
): Promise<void> {
  const ownerId = assertSession(session, expectedOwnerId, expectedGeneration);
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    let abortReason: unknown;
    const tx = db.transaction(stores, mode);
    tx.oncomplete = () => {
      db.close();
      try {
        assertSession(session, ownerId, expectedGeneration);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = () => {
      db.close();
      reject(abortReason ?? tx.error ?? new Error('Local vault transaction failed.'));
    };
    tx.onabort = () => {
      db.close();
      reject(abortReason ?? tx.error ?? new Error('Local vault transaction was aborted.'));
    };
    try {
      assertSession(session, ownerId, expectedGeneration);
      body(tx, (reason) => {
        abortReason = reason;
        tx.abort();
      });
    } catch (error) {
      try { tx.abort(); } catch { /* transaction may already have completed */ }
      reject(error);
    }
  });
}

async function digest(payload: Omit<EncryptedPayload, 'sha256'>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function makeStoredRevision(
  session: LocalVaultSession,
  ownerId: string,
  generation: number,
  recordId: string,
  revisionId: string,
  parentRevisionId: string | null,
  kind: RevisionKind,
  provenance: OriginalProvenance | null,
  content: unknown,
): Promise<StoredRevision> {
  const clientCreatedAt = new Date().toISOString();
  const payloadBase = { schemaVersion: 1 as const, ownerId, recordId, revisionId, parentRevisionId, kind, provenance, clientCreatedAt, content };
  const payload: EncryptedPayload = { ...payloadBase, sha256: await digest(payloadBase) };
  assertSession(session, ownerId, generation);
  const envelope = await encryptPrivate(ownerId, aadId(ownerId, recordId, revisionId), payload);
  assertSession(session, ownerId, generation);
  return {
    key: revisionKey(ownerId, recordId, revisionId), ownerRecordKey: ownerRecordKey(ownerId, recordId),
    ownerId, recordId, revisionId, parentRevisionId, kind, clientCreatedAt, envelope,
  };
}

async function decryptRevision(session: LocalVaultSession, expectedOwnerId: string, generation: number, row: StoredRevision): Promise<LocalVaultRevision> {
  const ownerId = assertSession(session, expectedOwnerId, generation);
  if (ownerId !== row.ownerId) throw new LocalVaultLockedError();
  const payload = await decryptPrivate<EncryptedPayload>(ownerId, aadId(row.ownerId, row.recordId, row.revisionId), row.envelope);
  assertSession(session, ownerId, generation);
  if (payload.schemaVersion !== 1 || payload.ownerId !== row.ownerId || payload.recordId !== row.recordId ||
      payload.revisionId !== row.revisionId || payload.parentRevisionId !== row.parentRevisionId ||
      payload.kind !== row.kind || payload.clientCreatedAt !== row.clientCreatedAt) {
    throw new Error('Local vault revision identity validation failed.');
  }
  const { sha256, ...hashable } = payload;
  if (await digest(hashable) !== sha256) throw new Error('Local vault revision integrity check failed.');
  assertSession(session, ownerId, generation);
  return { ...payload };
}

export class LocalVault {
  private readonly session: LocalVaultSession;
  private readonly ownerId: string;
  private readonly generation: number;

  constructor(session: LocalVaultSession) {
    this.session = session;
    assertId(session?.ownerId, 'ownerId');
    const generation = session.generation();
    if (!Number.isSafeInteger(generation) || generation < 0) throw new TypeError('Session generation must be a non-negative safe integer.');
    this.ownerId = session.ownerId;
    this.generation = generation;
    assertSession(session, this.ownerId, this.generation);
  }

  /** Create a single original. Duplicate record IDs and revisions fail atomically. */
  async createOriginal(input: OriginalInput): Promise<LocalVaultRevision> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    const recordId = input.recordId;
    const revisionId = input.revisionId;
    const provenance = input.provenance;
    assertId(recordId, 'recordId');
    assertId(revisionId, 'revisionId');
    if (provenance !== 'user-authored' && provenance !== 'user-captured') {
      throw new TypeError('Original evidence must have user-authored or user-captured provenance.');
    }
    const content = serializeContent(input.content);
    const row = await makeStoredRevision(this.session, ownerId, this.generation, recordId, revisionId, null, 'original', provenance, content);
    await transact([HEAD_STORE, REVISION_STORE], 'readwrite', this.session, ownerId, this.generation, (tx, abort) => {
      const heads = tx.objectStore(HEAD_STORE);
      const headKey = ownerRecordKey(ownerId, recordId);
      const get = heads.get(headKey);
      get.onsuccess = () => {
        if (get.result) { abort(new LocalVaultConflictError('This record already has an original.')); return; }
        const revisionAdd = tx.objectStore(REVISION_STORE).add(row);
        revisionAdd.onerror = (event) => { event.preventDefault(); abort(new LocalVaultConflictError('This revision already exists.')); };
        const headAdd = heads.add({ key: headKey, ownerId, recordId, latestRevisionId: revisionId, revisionCount: 1 } satisfies StoredHead);
        headAdd.onerror = (event) => { event.preventDefault(); abort(new LocalVaultConflictError('This record already has an original.')); };
      };
      get.onerror = () => abort();
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'ConstraintError') throw new LocalVaultConflictError('This record or revision already exists.');
      throw error;
    });
    return decryptRevision(this.session, ownerId, this.generation, row);
  }

  /** Append a derived revision to the current head; original bytes are never overwritten. */
  async appendDerived(input: DerivedInput): Promise<LocalVaultRevision> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    const recordId = input.recordId;
    const revisionId = input.revisionId;
    const parentRevisionId = input.parentRevisionId;
    assertId(recordId, 'recordId');
    assertId(revisionId, 'revisionId');
    assertId(parentRevisionId, 'parentRevisionId');
    const content = serializeContent(input.content);
    const row = await makeStoredRevision(this.session, ownerId, this.generation, recordId, revisionId, parentRevisionId, 'derived', null, content);
    await transact([HEAD_STORE, REVISION_STORE], 'readwrite', this.session, ownerId, this.generation, (tx, abort) => {
      const heads = tx.objectStore(HEAD_STORE);
      const headKey = ownerRecordKey(ownerId, recordId);
      const get = heads.get(headKey);
      get.onsuccess = () => {
        const head = get.result as StoredHead | undefined;
        if (!head || head.latestRevisionId !== parentRevisionId) { abort(new LocalVaultConflictError()); return; }
        const revisionAdd = tx.objectStore(REVISION_STORE).add(row);
        revisionAdd.onerror = (event) => { event.preventDefault(); abort(new LocalVaultConflictError('This revision already exists.')); };
        heads.put({ ...head, latestRevisionId: revisionId, revisionCount: head.revisionCount + 1 });
      };
      get.onerror = () => abort();
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'ConstraintError') throw new LocalVaultConflictError('This revision already exists.');
      throw error;
    });
    return decryptRevision(this.session, ownerId, this.generation, row);
  }

  async getRevision(recordId: string, revisionId: string): Promise<LocalVaultRevision | null> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    assertId(recordId, 'recordId');
    assertId(revisionId, 'revisionId');
    let row: StoredRevision | undefined;
    await transact([REVISION_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
        const request = tx.objectStore(REVISION_STORE).get(revisionKey(ownerId, recordId, revisionId));
        request.onsuccess = () => { row = request.result as StoredRevision | undefined; };
        request.onerror = () => tx.abort();
    });
    if (!row) return null;
    assertStoredIdentity(row, ownerId, recordId, revisionId);
    return decryptRevision(this.session, ownerId, this.generation, row);
  }

  async getLatest(recordId: string): Promise<LocalVaultRevision | null> {
    const revisions = await this.listRevisions(recordId);
    return revisions.at(-1) ?? null;
  }

  async listRevisions(recordId: string): Promise<LocalVaultRevision[]> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    assertId(recordId, 'recordId');
    const snapshot = await new Promise<{head?: StoredHead; rows: StoredRevision[]}>((resolve, reject) => {
      let head: StoredHead | undefined;
      let rows: StoredRevision[] = [];
      void transact([REVISION_STORE, HEAD_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
        const headRequest = tx.objectStore(HEAD_STORE).get(ownerRecordKey(ownerId, recordId));
        const rowsRequest = tx.objectStore(REVISION_STORE).index('ownerRecordKey').getAll(ownerRecordKey(ownerId, recordId));
        headRequest.onsuccess = () => { head = headRequest.result as StoredHead | undefined; };
        rowsRequest.onsuccess = () => { rows = rowsRequest.result as StoredRevision[]; };
        headRequest.onerror = rowsRequest.onerror = () => tx.abort();
      }).then(() => resolve({ head, rows }), reject);
    });
    const chain = validateRevisionChain(ownerId, recordId, snapshot.head, snapshot.rows);
    const revisions: LocalVaultRevision[] = [];
    for (const row of chain) revisions.push(await decryptRevision(this.session, ownerId, this.generation, row));
    return revisions;
  }

  /** Discover this owner's local records after reopening, in one consistent IndexedDB snapshot. */
  async listRecords(): Promise<LocalVaultRevision[]> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    const snapshot = await new Promise<{heads: StoredHead[]; rows: StoredRevision[]}>((resolve, reject) => {
      let heads: StoredHead[] = [];
      let rows: StoredRevision[] = [];
      void transact([REVISION_STORE, HEAD_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
        const headsRequest = tx.objectStore(HEAD_STORE).index('ownerId').getAll(ownerId);
        const rowsRequest = tx.objectStore(REVISION_STORE).index('ownerId').getAll(ownerId);
        headsRequest.onsuccess = () => { heads = headsRequest.result as StoredHead[]; };
        rowsRequest.onsuccess = () => { rows = rowsRequest.result as StoredRevision[]; };
        headsRequest.onerror = rowsRequest.onerror = () => tx.abort();
      }).then(() => resolve({ heads, rows }), reject);
    });
    const rowsByRecord = new Map<string, StoredRevision[]>();
    for (const row of snapshot.rows) {
      const collection = rowsByRecord.get(row.recordId) ?? [];
      collection.push(row);
      rowsByRecord.set(row.recordId, collection);
    }
    const headsByRecord = new Map(snapshot.heads.map((head) => [head.recordId, head]));
    if (headsByRecord.size !== snapshot.heads.length || rowsByRecord.size !== snapshot.heads.length) {
      throw new Error('Local vault contains orphaned or duplicate record heads.');
    }
    const latest: LocalVaultRevision[] = [];
    for (const [recordId, head] of headsByRecord) {
      const chain = validateRevisionChain(ownerId, recordId, head, rowsByRecord.get(recordId) ?? []);
      latest.push(await decryptRevision(this.session, ownerId, this.generation, chain.at(-1)!));
    }
    return latest;
  }
}
