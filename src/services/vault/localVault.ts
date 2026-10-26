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
const DATABASE_VERSION = 3;
const REVISION_STORE = 'revisions';
const HEAD_STORE = 'heads';
const DRAFT_STORE = 'drafts';
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

export interface LocalVaultDraftTarget {
  recordId: string;
  parentRevisionId: string;
}

export interface LocalVaultDraft {
  ownerId: string;
  draftId: string;
  version: number;
  content: unknown;
  target?: LocalVaultDraftTarget;
  /** Device clock only; not a trusted timestamp. */
  clientUpdatedAt: string;
}

export interface SaveDraftInput {
  draftId: string;
  expectedVersion: number | null;
  content: unknown;
  target?: LocalVaultDraftTarget;
}

export interface FinalizeDraftInput {
  draftId: string;
  expectedVersion: number;
  recordId?: string;
  revisionId?: string;
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

interface StoredDraft {
  key: string;
  ownerId: string;
  draftId: string;
  version: number;
  target?: LocalVaultDraftTarget;
  clientUpdatedAt: string;
  envelope: Envelope;
}

interface EncryptedDraftPayload {
  schemaVersion: 1;
  ownerId: string;
  draftId: string;
  version: number;
  target?: LocalVaultDraftTarget;
  clientUpdatedAt: string;
  content: unknown;
  sha256: string;
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

function requestError(request: IDBRequest, fallback: string): Error {
  return request.error ?? new Error(fallback);
}

function conflictForConstraint(error: Error, message: string): Error {
  return error instanceof DOMException && error.name === 'ConstraintError'
    ? new LocalVaultConflictError(message)
    : error;
}

function ownerDraftKey(ownerId: string, draftId: string): string {
  return JSON.stringify([ownerId, draftId]);
}

function draftAadId(ownerId: string, draftId: string, version: number): string {
  // Draft ciphertext has a separate namespace and identity tuple from evidence.
  return JSON.stringify(['draft', ownerId, draftId, version]);
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
    throw new RangeError('Vault content exceeds the 1 MB local content limit.');
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
    let settled = false;
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
      const drafts = db.objectStoreNames.contains(DRAFT_STORE)
        ? request.transaction!.objectStore(DRAFT_STORE)
        : db.createObjectStore(DRAFT_STORE, { keyPath: 'key' });
      if (!drafts.indexNames.contains('ownerId')) drafts.createIndex('ownerId', 'ownerId', { unique: false });
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error ?? new Error('Could not open local vault storage.'));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new Error('Local vault storage upgrade is blocked by another tab.'));
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
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
    let abortRequested = false;
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
        if (abortRequested) return;
        abortRequested = true;
        abortReason = reason;
        tx.abort();
      });
    } catch (error) {
      try { tx.abort(); } catch { /* transaction may already have completed */ }
      reject(error);
    }
  });
}

async function digest(payload: object): Promise<string> {
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

async function prepareRestoredRevision(
  session: LocalVaultSession,
  ownerId: string,
  generation: number,
  revision: LocalVaultRevision,
): Promise<StoredRevision> {
  assertSession(session, ownerId, generation);
  if (!revision || typeof revision !== 'object' || revision.ownerId !== ownerId ||
      typeof revision.recordId !== 'string' || typeof revision.revisionId !== 'string' ||
      (revision.parentRevisionId !== null && typeof revision.parentRevisionId !== 'string') ||
      (revision.kind !== 'original' && revision.kind !== 'derived') ||
      (revision.provenance !== null && revision.provenance !== 'user-authored' && revision.provenance !== 'user-captured') ||
      typeof revision.clientCreatedAt !== 'string' || !Number.isFinite(Date.parse(revision.clientCreatedAt)) ||
      typeof revision.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(revision.sha256)) {
    throw new TypeError('The recovery record history is invalid.');
  }
  assertId(revision.recordId, 'recordId');
  assertId(revision.revisionId, 'revisionId');
  if (revision.parentRevisionId !== null) assertId(revision.parentRevisionId, 'parentRevisionId');
  if ((revision.kind === 'original' && revision.provenance === null) ||
      (revision.kind === 'derived' && revision.provenance !== null)) {
    throw new TypeError('The recovery record provenance is invalid.');
  }
  const content = serializeContent(revision.content);
  if (JSON.stringify(content) !== JSON.stringify(revision.content)) throw new TypeError('The recovery record content is not in its saved form.');
  const payloadBase = {
    schemaVersion: 1 as const,
    ownerId,
    recordId: revision.recordId,
    revisionId: revision.revisionId,
    parentRevisionId: revision.parentRevisionId,
    kind: revision.kind,
    provenance: revision.provenance,
    clientCreatedAt: revision.clientCreatedAt,
    content,
  };
  assertSession(session, ownerId, generation);
  if (await digest(payloadBase) !== revision.sha256) throw new Error('The recovery record content failed its integrity check.');
  assertSession(session, ownerId, generation);
  const envelope = await encryptPrivate(ownerId, aadId(ownerId, revision.recordId, revision.revisionId), {
    ...payloadBase,
    sha256: revision.sha256,
  } satisfies EncryptedPayload);
  assertSession(session, ownerId, generation);
  return {
    key: revisionKey(ownerId, revision.recordId, revision.revisionId),
    ownerRecordKey: ownerRecordKey(ownerId, revision.recordId),
    ownerId,
    recordId: revision.recordId,
    revisionId: revision.revisionId,
    parentRevisionId: revision.parentRevisionId,
    kind: revision.kind,
    clientCreatedAt: revision.clientCreatedAt,
    envelope,
  };
}

function normalizeDraftTarget(target: LocalVaultDraftTarget | undefined): LocalVaultDraftTarget | undefined {
  if (target === undefined) return undefined;
  if (!target || typeof target !== 'object') throw new TypeError('Draft target must identify a record and parent revision.');
  const recordId = target.recordId;
  const parentRevisionId = target.parentRevisionId;
  assertId(recordId, 'target.recordId');
  assertId(parentRevisionId, 'target.parentRevisionId');
  return { recordId, parentRevisionId };
}

function validateDraftRow(row: StoredDraft, ownerId: string, draftId: string): void {
  if (row.key !== ownerDraftKey(ownerId, draftId) || row.ownerId !== ownerId || row.draftId !== draftId ||
      !Number.isSafeInteger(row.version) || row.version < 1) {
    throw new Error('Local vault draft lookup identity validation failed.');
  }
}

function sameEnvelope(left: Envelope, right: Envelope): boolean {
  return left?.version === right?.version && left?.iv === right?.iv && left?.ciphertext === right?.ciphertext;
}

function sameRevisionSnapshot(left: StoredRevision, right: StoredRevision): boolean {
  return left.key === right.key && left.ownerRecordKey === right.ownerRecordKey && left.ownerId === right.ownerId &&
    left.recordId === right.recordId && left.revisionId === right.revisionId &&
    left.parentRevisionId === right.parentRevisionId && left.kind === right.kind &&
    left.clientCreatedAt === right.clientCreatedAt && sameEnvelope(left.envelope, right.envelope);
}

function sameDraftSnapshot(left: StoredDraft, right: StoredDraft): boolean {
  return left.key === right.key && left.ownerId === right.ownerId && left.draftId === right.draftId &&
    left.version === right.version && left.clientUpdatedAt === right.clientUpdatedAt &&
    JSON.stringify(left.target) === JSON.stringify(right.target) && sameEnvelope(left.envelope, right.envelope);
}

function sameSnapshotSet<T extends { key: string }>(
  current: T[], expected: T[], compare: (left: T, right: T) => boolean,
): boolean {
  if (current.length !== expected.length) return false;
  const byKey = new Map(current.map((row) => [row.key, row]));
  return byKey.size === current.length && expected.every((row) => {
    const currentRow = byKey.get(row.key);
    return currentRow !== undefined && compare(currentRow, row);
  });
}

function sameRevisionContent(left: LocalVaultRevision, right: LocalVaultRevision): boolean {
  return left.ownerId === right.ownerId && left.recordId === right.recordId && left.revisionId === right.revisionId &&
    left.parentRevisionId === right.parentRevisionId && left.kind === right.kind && left.provenance === right.provenance &&
    left.clientCreatedAt === right.clientCreatedAt && left.sha256 === right.sha256 &&
    JSON.stringify(left.content) === JSON.stringify(right.content);
}

async function makeStoredDraft(
  session: LocalVaultSession,
  ownerId: string,
  generation: number,
  draftId: string,
  version: number,
  content: unknown,
  target: LocalVaultDraftTarget | undefined,
): Promise<StoredDraft> {
  const clientUpdatedAt = new Date().toISOString();
  const payloadBase = { schemaVersion: 1 as const, ownerId, draftId, version, ...(target ? { target } : {}), clientUpdatedAt, content };
  const payload: EncryptedDraftPayload = { ...payloadBase, sha256: await digest(payloadBase) };
  assertSession(session, ownerId, generation);
  const envelope = await encryptPrivate(ownerId, draftAadId(ownerId, draftId, version), payload);
  assertSession(session, ownerId, generation);
  return { key: ownerDraftKey(ownerId, draftId), ownerId, draftId, version, ...(target ? { target } : {}), clientUpdatedAt, envelope };
}

async function decryptDraft(
  session: LocalVaultSession,
  expectedOwnerId: string,
  generation: number,
  row: StoredDraft,
): Promise<LocalVaultDraft> {
  const ownerId = assertSession(session, expectedOwnerId, generation);
  validateDraftRow(row, ownerId, row.draftId);
  const payload = await decryptPrivate<EncryptedDraftPayload>(ownerId, draftAadId(ownerId, row.draftId, row.version), row.envelope);
  assertSession(session, ownerId, generation);
  if (payload.schemaVersion !== 1 || payload.ownerId !== row.ownerId || payload.draftId !== row.draftId ||
      payload.version !== row.version || payload.clientUpdatedAt !== row.clientUpdatedAt ||
      JSON.stringify(payload.target) !== JSON.stringify(row.target)) {
    throw new Error('Local vault draft identity validation failed.');
  }
  const { sha256, ...hashable } = payload;
  if (await digest(hashable) !== sha256) throw new Error('Local vault draft integrity check failed.');
  assertSession(session, ownerId, generation);
  return { ownerId, draftId: row.draftId, version: row.version, content: payload.content,
    ...(payload.target ? { target: payload.target } : {}), clientUpdatedAt: row.clientUpdatedAt };
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

  /** Revalidate the bound owner and generation before releasing local data. */
  assertUnlocked(): void {
    assertSession(this.session, this.ownerId, this.generation);
  }

  getOwnerId(): string {
    return assertSession(this.session, this.ownerId, this.generation);
  }

  /** Validate and prepare a complete same-owner record history without writes. */
  async prepareRestoreRecord(revisions: LocalVaultRevision[]): Promise<{ existing: boolean; confirm: () => Promise<void> }> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    if (!Array.isArray(revisions) || revisions.length < 1) throw new TypeError('A backup must contain one complete record history.');
    // Detach the caller-owned graph before the first await. Each revision keeps
    // the normal 1 MiB content cap, while the complete history has no aggregate cap.
    assertPlainJson(revisions);
    const snapshots = JSON.parse(JSON.stringify(revisions)) as LocalVaultRevision[];
    for (const revision of snapshots) revision.content = serializeContent(revision.content);
    const recordId = snapshots[0]?.recordId;
    assertId(recordId, 'recordId');
    const imported: LocalVaultRevision[] = [];
    const importedRows: StoredRevision[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < snapshots.length; index += 1) {
      const revision = snapshots[index];
      assertSession(this.session, ownerId, this.generation);
      if (revision?.recordId !== recordId || (index === 0
        ? revision.parentRevisionId !== null || revision.kind !== 'original'
        : revision.parentRevisionId !== snapshots[index - 1].revisionId || revision.kind !== 'derived') ||
          seen.has(revision.revisionId)) {
        throw new TypeError('The recovery file does not contain one complete, unbranched revision history.');
      }
      seen.add(revision.revisionId);
      const row = await prepareRestoredRevision(this.session, ownerId, this.generation, revision);
      assertSession(this.session, ownerId, this.generation);
      imported.push({ ...revision });
      importedRows.push(row);
    }

    const observed: { head?: StoredHead; rows: StoredRevision[] } = { rows: [] };
    await transact([HEAD_STORE, REVISION_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
      const headRequest = tx.objectStore(HEAD_STORE).get(ownerRecordKey(ownerId, recordId));
      const rowsRequest = tx.objectStore(REVISION_STORE).index('ownerRecordKey').getAll(ownerRecordKey(ownerId, recordId));
      headRequest.onsuccess = () => { observed.head = headRequest.result as StoredHead | undefined; };
      rowsRequest.onsuccess = () => { observed.rows = rowsRequest.result as StoredRevision[]; };
      headRequest.onerror = () => tx.abort();
      rowsRequest.onerror = () => tx.abort();
    });
    assertSession(this.session, ownerId, this.generation);
    let existingRevisions: LocalVaultRevision[] = [];
    if (observed.head || observed.rows.length) {
      const chain = validateRevisionChain(ownerId, recordId, observed.head, observed.rows);
      for (const row of chain) {
        existingRevisions.push(await decryptRevision(this.session, ownerId, this.generation, row));
        assertSession(this.session, ownerId, this.generation);
      }
      if (existingRevisions.length !== imported.length ||
          !existingRevisions.every((revision, index) => sameRevisionContent(revision, imported[index]))) {
        throw new LocalVaultConflictError('A different record already uses this ID. The recovery file was not imported.');
      }
    }
    const existing = existingRevisions.length > 0;
    const expectedHead = observed.head;
    const expectedRows = [...observed.rows];
    let attempted = false;
    return {
      existing,
      confirm: async () => {
        if (attempted) throw new LocalVaultConflictError('This restore plan has already been used. Prepare the recovery file again.');
        attempted = true;
        assertSession(this.session, ownerId, this.generation);
        await transact([HEAD_STORE, REVISION_STORE], 'readwrite', this.session, ownerId, this.generation, (tx, abort) => {
          const heads = tx.objectStore(HEAD_STORE);
          const revisionsStore = tx.objectStore(REVISION_STORE);
          const headRequest = heads.get(ownerRecordKey(ownerId, recordId));
          const rowsRequest = revisionsStore.index('ownerRecordKey').getAll(ownerRecordKey(ownerId, recordId));
          let reads = 0;
          const verifyAndRestore = () => {
            if (++reads !== 2) return;
            try {
              assertSession(this.session, ownerId, this.generation);
              const currentHead = headRequest.result as StoredHead | undefined;
              const currentRows = rowsRequest.result as StoredRevision[];
              const matchesExpected = expectedHead
                ? Boolean(currentHead && JSON.stringify(currentHead) === JSON.stringify(expectedHead) &&
                  sameSnapshotSet(currentRows, expectedRows, sameRevisionSnapshot))
                : !currentHead && currentRows.length === 0;
              if (!matchesExpected) {
                abort(new LocalVaultConflictError('A record changed while this recovery file was prepared. Prepare it again.'));
                return;
              }
              if (existing) return;
              for (const row of importedRows) {
                const request = revisionsStore.add(row);
                request.onerror = (event) => {
                  event.preventDefault();
                  abort(conflictForConstraint(requestError(request, 'Could not restore the record history.'), 'A record or revision ID already exists.'));
                };
                request.onsuccess = () => {
                  try { assertSession(this.session, ownerId, this.generation); }
                  catch (error) { abort(error); }
                };
              }
              const headWrite = heads.add({
                key: ownerRecordKey(ownerId, recordId), ownerId, recordId,
                latestRevisionId: imported.at(-1)!.revisionId, revisionCount: imported.length,
              } satisfies StoredHead);
              headWrite.onerror = (event) => {
                event.preventDefault();
                abort(conflictForConstraint(requestError(headWrite, 'Could not restore the record head.'), 'A record with this ID already exists.'));
              };
              headWrite.onsuccess = () => {
                try { assertSession(this.session, ownerId, this.generation); }
                catch (error) { abort(error); }
              };
            } catch (error) { abort(error); }
          };
          headRequest.onsuccess = rowsRequest.onsuccess = verifyAndRestore;
          headRequest.onerror = () => abort(requestError(headRequest, 'Could not verify the existing record.'));
          rowsRequest.onerror = () => abort(requestError(rowsRequest, 'Could not verify the existing record history.'));
        });
      },
    };
  }

  /** Save a mutable encrypted recovery snapshot using version compare-and-swap. */
  async saveDraft(input: SaveDraftInput): Promise<LocalVaultDraft> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    const draftId = input.draftId;
    const expectedVersion = input.expectedVersion;
    assertId(draftId, 'draftId');
    if (expectedVersion !== null && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)) {
      throw new TypeError('expectedVersion must be null or a positive safe integer.');
    }
    const content = serializeContent(input.content);
    const target = normalizeDraftTarget(input.target);
    const version = expectedVersion === null ? 1 : expectedVersion + 1;
    if (!Number.isSafeInteger(version)) throw new TypeError('Draft version exceeded the safe integer limit.');
    const row = await makeStoredDraft(this.session, ownerId, this.generation, draftId, version, content, target);
    await transact(target ? [DRAFT_STORE, HEAD_STORE, REVISION_STORE] : [DRAFT_STORE], 'readwrite', this.session, ownerId, this.generation, (tx, abort) => {
      const store = tx.objectStore(DRAFT_STORE);
      const get = store.get(ownerDraftKey(ownerId, draftId));
      get.onsuccess = () => {
        try {
          const current = get.result as StoredDraft | undefined;
          if (expectedVersion === null ? Boolean(current) : !current || current.version !== expectedVersion) {
            abort(new LocalVaultConflictError('The draft changed since this version was read.'));
            return;
          }
          const save = () => {
            try {
              assertSession(this.session, ownerId, this.generation);
              const write = expectedVersion === null ? store.add(row) : store.put(row);
              write.onerror = (event) => {
                event.preventDefault();
                abort(conflictForConstraint(requestError(write, 'Draft storage write failed.'), 'The draft changed since this version was read.'));
              };
            } catch (error) { abort(error); }
          };
          if (!target) { save(); return; }

          const headRequest = tx.objectStore(HEAD_STORE).get(ownerRecordKey(ownerId, target.recordId));
          const revisionRequest = tx.objectStore(REVISION_STORE).get(revisionKey(ownerId, target.recordId, target.parentRevisionId));
          let reads = 0;
          const validateTarget = () => {
            if (++reads !== 2) return;
            const head = headRequest.result as StoredHead | undefined;
            const parent = revisionRequest.result as StoredRevision | undefined;
            if (!head || head.ownerId !== ownerId || head.recordId !== target.recordId ||
                !parent || parent.ownerId !== ownerId ||
                parent.recordId !== target.recordId || parent.revisionId !== target.parentRevisionId) {
              abort(new LocalVaultConflictError('The record was deleted or changed; this recovery draft was not saved.'));
              return;
            }
            save();
          };
          headRequest.onsuccess = validateTarget;
          revisionRequest.onsuccess = validateTarget;
          headRequest.onerror = () => abort(requestError(headRequest, 'Could not verify the draft target record.'));
          revisionRequest.onerror = () => abort(requestError(revisionRequest, 'Could not verify the draft parent revision.'));
        } catch (error) {
          abort(error);
        }
      };
      get.onerror = () => abort(requestError(get, 'Could not read the current draft version.'));
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'ConstraintError') throw new LocalVaultConflictError('The draft already exists.');
      throw error;
    });
    return decryptDraft(this.session, ownerId, this.generation, row);
  }

  async getDraft(draftId: string): Promise<LocalVaultDraft | null> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    assertId(draftId, 'draftId');
    let row: StoredDraft | undefined;
    await transact([DRAFT_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
      const request = tx.objectStore(DRAFT_STORE).get(ownerDraftKey(ownerId, draftId));
      request.onsuccess = () => { row = request.result as StoredDraft | undefined; };
      request.onerror = () => tx.abort();
    });
    if (!row) return null;
    validateDraftRow(row, ownerId, draftId);
    return decryptDraft(this.session, ownerId, this.generation, row);
  }

  async listDrafts(): Promise<LocalVaultDraft[]> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    let rows: StoredDraft[] = [];
    await transact([DRAFT_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
      const request = tx.objectStore(DRAFT_STORE).index('ownerId').getAll(ownerId);
      request.onsuccess = () => { rows = request.result as StoredDraft[]; };
      request.onerror = () => tx.abort();
    });
    const drafts: LocalVaultDraft[] = [];
    for (const row of rows) {
      validateDraftRow(row, ownerId, row.draftId);
      drafts.push(await decryptDraft(this.session, ownerId, this.generation, row));
    }
    return drafts;
  }

  /** Promote a draft snapshot and remove it in the same transaction as the immutable revision. */
  async finalizeDraft(input: FinalizeDraftInput): Promise<LocalVaultRevision> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    const draftId = input.draftId;
    const expectedVersion = input.expectedVersion;
    const requestedRecordId = input.recordId;
    const requestedRevisionId = input.revisionId;
    assertId(draftId, 'draftId');
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new TypeError('expectedVersion must be a positive safe integer.');
    if (requestedRecordId !== undefined) assertId(requestedRecordId, 'recordId');
    if (requestedRevisionId !== undefined) assertId(requestedRevisionId, 'revisionId');
    const draft = await this.getDraft(draftId);
    if (!draft) throw new LocalVaultConflictError('The draft no longer exists.');
    if (draft.version !== expectedVersion) throw new LocalVaultConflictError('The draft changed since this version was read.');
    const target = draft.target;
    const recordId = requestedRecordId ?? target?.recordId ?? draftId;
    const revisionId = requestedRevisionId ?? (target ? `${draftId}:v${expectedVersion}` : draftId);
    assertId(recordId, 'recordId');
    assertId(revisionId, 'revisionId');
    if (target && recordId !== target.recordId) throw new TypeError('A draft targeting an existing record must be finalized to that record.');
    const content = serializeContent(draft.content);
    const row = await makeStoredRevision(this.session, ownerId, this.generation, recordId, revisionId,
      target?.parentRevisionId ?? null, target ? 'derived' : 'original', target ? null : 'user-authored', content);
    await transact([DRAFT_STORE, HEAD_STORE, REVISION_STORE], 'readwrite', this.session, ownerId, this.generation, (tx, abort) => {
      const drafts = tx.objectStore(DRAFT_STORE);
      const currentDraftRequest = drafts.get(ownerDraftKey(ownerId, draftId));
      currentDraftRequest.onsuccess = () => {
        try {
          const currentDraft = currentDraftRequest.result as StoredDraft | undefined;
          if (!currentDraft || currentDraft.version !== expectedVersion) {
            abort(new LocalVaultConflictError('The draft changed since this version was read.'));
            return;
          }
          const heads = tx.objectStore(HEAD_STORE);
          const headKey = ownerRecordKey(ownerId, recordId);
          const headRequest = heads.get(headKey);
          headRequest.onsuccess = () => {
            try {
              const head = headRequest.result as StoredHead | undefined;
              if (target ? !head || head.latestRevisionId !== target.parentRevisionId : Boolean(head)) {
                abort(new LocalVaultConflictError(target
                  ? 'The draft target changed; the draft has been preserved.'
                  : 'A record with this ID already exists; the draft has been preserved.'));
                return;
              }
              const revisions = tx.objectStore(REVISION_STORE);
              const revisionAdd = revisions.add(row);
              revisionAdd.onerror = (event) => {
                event.preventDefault();
                abort(conflictForConstraint(requestError(revisionAdd, 'Revision storage write failed.'), 'This revision already exists; the draft has been preserved.'));
              };
              const nextHead: StoredHead = target
                ? { ...head!, latestRevisionId: revisionId, revisionCount: head!.revisionCount + 1 }
                : { key: headKey, ownerId, recordId, latestRevisionId: revisionId, revisionCount: 1 };
              const headWrite = target ? heads.put(nextHead) : heads.add(nextHead);
              headWrite.onerror = (event) => {
                event.preventDefault();
                abort(conflictForConstraint(requestError(headWrite, 'Record head storage write failed.'), 'The record changed; the draft has been preserved.'));
              };
              drafts.delete(ownerDraftKey(ownerId, draftId));
            } catch (error) {
              abort(error);
            }
          };
          headRequest.onerror = () => abort(requestError(headRequest, 'Could not read the record head.'));
        } catch (error) {
          abort(error);
        }
      };
      currentDraftRequest.onerror = () => abort(requestError(currentDraftRequest, 'Could not read the draft being finalized.'));
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'ConstraintError') throw new LocalVaultConflictError('The record or revision changed; the draft has been preserved.');
      throw error;
    });
    return decryptRevision(this.session, ownerId, this.generation, row);
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

  /** Prepare a scoped, one-shot delete plan for one record and its linked drafts. */
  async prepareDeletion(recordId: string): Promise<{ revisionCount: number; draftCount: number; confirm: () => Promise<void> }> {
    const ownerId = assertSession(this.session, this.ownerId, this.generation);
    assertId(recordId, 'recordId');
    const snapshot: { head?: StoredHead; rows: StoredRevision[]; drafts: StoredDraft[] } = { rows: [], drafts: [] };
    await transact([HEAD_STORE, REVISION_STORE, DRAFT_STORE], 'readonly', this.session, ownerId, this.generation, (tx) => {
      const headRequest = tx.objectStore(HEAD_STORE).get(ownerRecordKey(ownerId, recordId));
      const rowsRequest = tx.objectStore(REVISION_STORE).index('ownerRecordKey').getAll(ownerRecordKey(ownerId, recordId));
      const draftsRequest = tx.objectStore(DRAFT_STORE).index('ownerId').getAll(ownerId);
      headRequest.onsuccess = () => { snapshot.head = headRequest.result as StoredHead | undefined; };
      rowsRequest.onsuccess = () => { snapshot.rows = rowsRequest.result as StoredRevision[]; };
      draftsRequest.onsuccess = () => { snapshot.drafts = draftsRequest.result as StoredDraft[]; };
      headRequest.onerror = () => tx.abort();
      rowsRequest.onerror = () => tx.abort();
      draftsRequest.onerror = () => tx.abort();
    });
    assertSession(this.session, ownerId, this.generation);
    if (!snapshot.head) throw new Error('This private record is not available.');
    const chain = validateRevisionChain(ownerId, recordId, snapshot.head, snapshot.rows);
    if (chain.length === 0) throw new Error('This private record is not available.');
    for (const revision of chain) {
      await decryptRevision(this.session, ownerId, this.generation, revision);
      assertSession(this.session, ownerId, this.generation);
    }
    const linkedDrafts = snapshot.drafts.filter((draft) => draft.target?.recordId === recordId);
    for (const draft of linkedDrafts) {
      validateDraftRow(draft, ownerId, draft.draftId);
      await decryptDraft(this.session, ownerId, this.generation, draft);
      assertSession(this.session, ownerId, this.generation);
    }

    const expectedHead = snapshot.head;
    const expectedRows = [...chain];
    const expectedDrafts = [...linkedDrafts];
    let attempted = false;
    return {
      revisionCount: expectedRows.length,
      draftCount: expectedDrafts.length,
      confirm: async () => {
        if (attempted) throw new LocalVaultConflictError('This deletion plan has already been used. Refresh the private list and prepare again.');
        attempted = true;
        assertSession(this.session, ownerId, this.generation);
        await transact([HEAD_STORE, REVISION_STORE, DRAFT_STORE], 'readwrite', this.session, ownerId, this.generation, (tx, abort) => {
          const headRequest = tx.objectStore(HEAD_STORE).get(ownerRecordKey(ownerId, recordId));
          const rowsRequest = tx.objectStore(REVISION_STORE).index('ownerRecordKey').getAll(ownerRecordKey(ownerId, recordId));
          const draftsRequest = tx.objectStore(DRAFT_STORE).index('ownerId').getAll(ownerId);
          let reads = 0;
          const verifyAndDelete = () => {
            if (++reads !== 3) return;
            try {
              assertSession(this.session, ownerId, this.generation);
              const currentHead = headRequest.result as StoredHead | undefined;
              const currentRows = rowsRequest.result as StoredRevision[];
              const currentDrafts = (draftsRequest.result as StoredDraft[])
                .filter((draft) => draft.target?.recordId === recordId);
              if (!currentHead || JSON.stringify(currentHead) !== JSON.stringify(expectedHead) ||
                  !sameSnapshotSet(currentRows, expectedRows, sameRevisionSnapshot) ||
                  !sameSnapshotSet(currentDrafts, expectedDrafts, sameDraftSnapshot)) {
                abort(new LocalVaultConflictError('The record history or a linked recovery draft changed. Refresh and prepare deletion again.'));
                return;
              }
              validateRevisionChain(ownerId, recordId, currentHead, currentRows);
              const deleteRequests = [
                tx.objectStore(HEAD_STORE).delete(ownerRecordKey(ownerId, recordId)),
                ...currentRows.map((revision) => tx.objectStore(REVISION_STORE).delete(revision.key)),
                ...currentDrafts.map((draft) => tx.objectStore(DRAFT_STORE).delete(draft.key)),
              ];
              for (const request of deleteRequests) {
                request.onsuccess = () => {
                  try { assertSession(this.session, ownerId, this.generation); }
                  catch (error) { abort(error); }
                };
                request.onerror = () => abort(requestError(request, 'Could not delete the selected private record.'));
              }
            } catch (error) { abort(error); }
          };
          headRequest.onsuccess = rowsRequest.onsuccess = draftsRequest.onsuccess = verifyAndDelete;
          headRequest.onerror = () => abort(requestError(headRequest, 'Could not verify the selected private record.'));
          rowsRequest.onerror = () => abort(requestError(rowsRequest, 'Could not verify the private record history.'));
          draftsRequest.onerror = () => abort(requestError(draftsRequest, 'Could not verify linked recovery drafts.'));
        });
      },
    };
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
