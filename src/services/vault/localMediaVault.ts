import { decryptPrivate, decryptPrivateBytes, encryptPrivate, encryptPrivateBytes, type BinaryEnvelope, type Envelope } from '../backend/deviceVault.ts';
import type { LocalVaultSession } from './localVault.ts';

const DATABASE = 'lulu.local-media-vault.v1';
const DATABASE_VERSION = 2;
const METADATA_STORE = 'metadata';
const BINARY_STORE = 'binary';
const LEGACY_STORE = 'media';
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const AUDIO_MIME_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aac']);
const MEDIA_SOURCES = new Set(['file', 'camera', 'microphone']);

export type MediaSource = 'file' | 'camera' | 'microphone';
export type MediaKind = 'image' | 'audio';

export interface MediaMetadata {
  mediaId: string;
  title?: string;
  kind: MediaKind;
  mimeType: string;
  byteLength: number;
  sha256: string;
  clientCreatedAt: string;
  source: MediaSource;
  durationMs?: number;
  originalName?: string;
}

export interface PutMediaOptions {
  mediaId?: string;
  title?: string;
  source: MediaSource;
  durationMs?: number;
  originalName?: string;
}

export class LocalMediaLockedError extends Error {
  constructor() {
    super('Unlock the private session to access local media.');
    this.name = 'LocalMediaLockedError';
  }
}

export class LocalMediaConflictError extends Error {
  constructor() {
    super('Media with this identifier already exists.');
    this.name = 'LocalMediaConflictError';
  }
}

export class LocalMediaNotFoundError extends Error {
  constructor() {
    super('This local media record is not available.');
    this.name = 'LocalMediaNotFoundError';
  }
}

interface StoredMetadata {
  key: string;
  ownerId: string;
  mediaId: string;
  metadataEnvelope: Envelope;
}

interface StoredBinary {
  key: string;
  ownerId: string;
  mediaId: string;
  bytesEnvelope: BinaryEnvelope;
}

interface StoredMediaPair { metadata: StoredMetadata; binary: StoredBinary }

interface EncryptedMetadata {
  schemaVersion: 1;
  ownerId: string;
  metadata: MediaMetadata;
}

function assertId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 200 || value.trim() !== value || value.includes('/')) {
    throw new TypeError(`${field} must be a non-empty identifier of at most 200 characters.`);
  }
}

function mediaKey(ownerId: string, mediaId: string): string {
  return JSON.stringify([ownerId, mediaId]);
}

function aadId(ownerId: string, mediaId: string, part: 'metadata' | 'bytes'): string {
  return JSON.stringify(['local-media', part, ownerId, mediaId]);
}

function assertSession(session: LocalVaultSession, ownerId: string, generation: number): void {
  let unlocked = false;
  let currentGeneration = -1;
  try {
    unlocked = session.isUnlocked() === true;
    currentGeneration = session.generation();
  } catch {
    unlocked = false;
  }
  if (!unlocked || session.ownerId !== ownerId || currentGeneration !== generation || !Number.isSafeInteger(currentGeneration)) {
    throw new LocalMediaLockedError();
  }
}

function normalizeMimeType(value: unknown): { mimeType: string; kind: MediaKind } {
  if (typeof value !== 'string' || value.length > 200) throw new TypeError('Choose a supported image or audio file.');
  const [rawBase, ...parameters] = value.split(';');
  const mimeType = rawBase.trim().toLowerCase();
  // This allowlist trusts the declared MIME label; it does not sniff or decode the bytes.
  if (parameters.length && (!mimeType.startsWith('audio/') || parameters.some(parameter => !/^\s*codecs\s*=\s*"?[^";]{1,120}"?\s*$/i.test(parameter)))) {
    throw new TypeError('Use a supported image or audio MIME type.');
  }
  if (IMAGE_MIME_TYPES.has(mimeType)) return { mimeType, kind: 'image' };
  if (AUDIO_MIME_TYPES.has(mimeType)) return { mimeType, kind: 'audio' };
  throw new TypeError('Use a supported raster image or audio MIME type.');
}

function normalizeMetadata(value: unknown, ownerId: string, mediaId: string): MediaMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Local media metadata is invalid.');
  const metadata = value as Partial<MediaMetadata>;
  const allowedKeys = new Set(['mediaId', 'title', 'kind', 'mimeType', 'byteLength', 'sha256', 'clientCreatedAt', 'source', 'durationMs', 'originalName']);
  if (Object.keys(metadata).some(key => !allowedKeys.has(key)) || metadata.mediaId !== mediaId ||
      (metadata.kind !== 'image' && metadata.kind !== 'audio') || typeof metadata.mimeType !== 'string' ||
      !Number.isSafeInteger(metadata.byteLength) || metadata.byteLength! < 1 || metadata.byteLength! > MAX_MEDIA_BYTES ||
      typeof metadata.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(metadata.sha256) ||
      typeof metadata.clientCreatedAt !== 'string' || !Number.isFinite(Date.parse(metadata.clientCreatedAt)) ||
      !MEDIA_SOURCES.has(metadata.source as string)) {
    throw new Error('Local media metadata is invalid.');
  }
  const { kind } = normalizeMimeType(metadata.mimeType);
  if (kind !== metadata.kind) throw new Error('Local media type does not match its MIME type.');
  if (metadata.title !== undefined && (typeof metadata.title !== 'string' || !metadata.title.trim() || metadata.title.length > 200)) {
    throw new Error('Media titles must contain 1 to 200 characters.');
  }
  if (metadata.durationMs !== undefined && (!Number.isSafeInteger(metadata.durationMs) || metadata.durationMs < 0 || kind !== 'audio')) {
    throw new Error('Audio duration must be a non-negative whole number of milliseconds.');
  }
  if (metadata.originalName !== undefined && (typeof metadata.originalName !== 'string' || metadata.originalName.length > 255 || metadata.source !== 'file')) {
    throw new Error('Original file names are only stored for file imports and are limited to 255 characters.');
  }
  assertId(ownerId, 'ownerId');
  return {
    mediaId,
    ...(metadata.title === undefined ? {} : { title: metadata.title }),
    kind,
    mimeType: metadata.mimeType,
    byteLength: metadata.byteLength!,
    sha256: metadata.sha256,
    clientCreatedAt: metadata.clientCreatedAt,
    source: metadata.source as MediaSource,
    ...(metadata.durationMs === undefined ? {} : { durationMs: metadata.durationMs }),
    ...(metadata.originalName === undefined ? {} : { originalName: metadata.originalName }),
  };
}

function validateInput(blob: Blob, options: PutMediaOptions, mediaId: string): { metadataBase: Omit<MediaMetadata, 'byteLength' | 'sha256' | 'clientCreatedAt'>; mimeType: string; kind: MediaKind } {
  assertId(mediaId, 'mediaId');
  if (!blob || typeof blob.arrayBuffer !== 'function' || !Number.isSafeInteger(blob.size)) throw new TypeError('Media must be a Blob or File.');
  if (blob.size < 1 || blob.size > MAX_MEDIA_BYTES) throw new TypeError('Media must contain between 1 byte and 25 MiB.');
  const { mimeType, kind } = normalizeMimeType(blob.type);
  if (!MEDIA_SOURCES.has(options.source)) throw new TypeError('Choose file, camera, or microphone as the media source.');
  if ((options.source === 'camera' && kind !== 'image') || (options.source === 'microphone' && kind !== 'audio')) {
    throw new TypeError('The selected media type does not match its capture source.');
  }
  if (options.title !== undefined && (typeof options.title !== 'string' || !options.title.trim() || options.title.length > 200)) {
    throw new TypeError('Media titles must contain 1 to 200 characters.');
  }
  if (options.durationMs !== undefined && (!Number.isSafeInteger(options.durationMs) || options.durationMs < 0 || kind !== 'audio')) {
    throw new TypeError('Audio duration must be a non-negative whole number of milliseconds.');
  }
  if (options.originalName !== undefined && (typeof options.originalName !== 'string' || options.originalName.length > 255 || options.source !== 'file')) {
    throw new TypeError('Original file names are only stored for file imports and are limited to 255 characters.');
  }
  const metadataBase = {
    mediaId,
    ...(options.title === undefined ? {} : { title: options.title }),
    kind,
    mimeType,
    source: options.source,
    ...(options.durationMs === undefined ? {} : { durationMs: options.durationMs }),
    ...(options.originalName === undefined ? {} : { originalName: options.originalName }),
  };
  return { metadataBase, mimeType, kind };
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, DATABASE_VERSION);
    request.onupgradeneeded = event => {
      const db = request.result;
      const transaction = request.transaction!;
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const store = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
      }
      if (!db.objectStoreNames.contains(BINARY_STORE)) {
        const store = db.createObjectStore(BINARY_STORE, { keyPath: 'key' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
      }
      if (event.oldVersion < 2 && db.objectStoreNames.contains(LEGACY_STORE)) {
        const legacy = transaction.objectStore(LEGACY_STORE);
        const metadata = transaction.objectStore(METADATA_STORE);
        const binary = transaction.objectStore(BINARY_STORE);
        const cursorRequest = legacy.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            db.deleteObjectStore(LEGACY_STORE);
            return;
          }
          const row = cursor.value as StoredMetadata & { bytesEnvelope?: BinaryEnvelope };
          if (!row || typeof row.ownerId !== 'string' || typeof row.mediaId !== 'string' || row.key !== mediaKey(row.ownerId, row.mediaId) ||
              !row.metadataEnvelope || !row.bytesEnvelope || cursor.primaryKey !== row.key) {
            transaction.abort();
            return;
          }
          metadata.put({ key: row.key, ownerId: row.ownerId, mediaId: row.mediaId, metadataEnvelope: row.metadataEnvelope });
          binary.put({ key: row.key, ownerId: row.ownerId, mediaId: row.mediaId, bytesEnvelope: row.bytesEnvelope });
          cursor.continue();
        };
        cursorRequest.onerror = () => transaction.abort();
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'));
    request.onblocked = () => reject(new Error('Local media storage upgrade is blocked by another tab.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

function validateMetadataRow(row: unknown, ownerId: string, mediaId: string): asserts row is StoredMetadata {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Local media record is invalid.');
  const stored = row as Partial<StoredMetadata>;
  const keys = Object.keys(stored).sort();
  if (keys.join(',') !== 'key,mediaId,metadataEnvelope,ownerId' ||
      stored.key !== mediaKey(ownerId, mediaId) || stored.ownerId !== ownerId || stored.mediaId !== mediaId ||
      !stored.metadataEnvelope) {
    throw new Error('Local media record identity validation failed.');
  }
}

function validateBinaryRow(row: unknown, ownerId: string, mediaId: string): asserts row is StoredBinary {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Local media bytes are invalid.');
  const stored = row as Partial<StoredBinary>;
  const keys = Object.keys(stored).sort();
  if (keys.join(',') !== 'bytesEnvelope,key,mediaId,ownerId' ||
      stored.key !== mediaKey(ownerId, mediaId) || stored.ownerId !== ownerId || stored.mediaId !== mediaId || !stored.bytesEnvelope) {
    throw new Error('Local media byte identity validation failed.');
  }
}

function equalBytes(left: ArrayBuffer | ArrayBufferView, right: ArrayBuffer | ArrayBufferView): boolean {
  const a = left instanceof ArrayBuffer ? new Uint8Array(left) : new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
  const b = right instanceof ArrayBuffer ? new Uint8Array(right) : new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function sameMetadataRow(left: StoredMetadata, right: StoredMetadata): boolean {
  return left.key === right.key && left.ownerId === right.ownerId && left.mediaId === right.mediaId &&
    left.metadataEnvelope.version === right.metadataEnvelope.version && left.metadataEnvelope.iv === right.metadataEnvelope.iv &&
    left.metadataEnvelope.ciphertext === right.metadataEnvelope.ciphertext;
}

function sameBinaryRow(left: StoredBinary, right: StoredBinary): boolean {
  return left.key === right.key && left.ownerId === right.ownerId && left.mediaId === right.mediaId &&
    left.bytesEnvelope.version === right.bytesEnvelope.version && equalBytes(left.bytesEnvelope.iv, right.bytesEnvelope.iv) &&
    equalBytes(left.bytesEnvelope.ciphertext, right.bytesEnvelope.ciphertext);
}

async function decryptMetadata(session: LocalVaultSession, ownerId: string, generation: number, row: StoredMetadata): Promise<MediaMetadata> {
  assertSession(session, ownerId, generation);
  const payload = await decryptPrivate<EncryptedMetadata>(ownerId, aadId(ownerId, row.mediaId, 'metadata'), row.metadataEnvelope);
  assertSession(session, ownerId, generation);
  if (payload?.schemaVersion !== 1 || payload.ownerId !== ownerId) throw new Error('Local media metadata identity validation failed.');
  return normalizeMetadata(payload.metadata, ownerId, row.mediaId);
}

async function openAuthorizedDatabase(session: LocalVaultSession, ownerId: string, generation: number): Promise<IDBDatabase> {
  const database = await openDatabase();
  try {
    assertSession(session, ownerId, generation);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

async function readMetadataRows(session: LocalVaultSession, ownerId: string, generation: number): Promise<StoredMetadata[]> {
  assertSession(session, ownerId, generation);
  const database = await openAuthorizedDatabase(session, ownerId, generation);
  return new Promise<StoredMetadata[]>((resolve, reject) => {
      let abortReason: unknown;
      const transaction = database.transaction(METADATA_STORE, 'readonly');
      const request = transaction.objectStore(METADATA_STORE).index('ownerId').getAll(ownerId);
      let rows: StoredMetadata[] = [];
      request.onsuccess = () => {
        try {
          assertSession(session, ownerId, generation);
          const result = request.result as StoredMetadata[];
          for (const row of result) validateMetadataRow(row, ownerId, row.mediaId);
          rows = result;
        } catch (error) {
          abortReason = error;
          transaction.abort();
        }
      };
      request.onerror = () => { abortReason = request.error ?? new Error('Could not read local media metadata.'); };
      transaction.oncomplete = () => {
        database.close();
        try {
          assertSession(session, ownerId, generation);
          resolve(rows);
        } catch (error) { reject(error); }
      };
      transaction.onerror = transaction.onabort = () => {
        database.close();
        reject(abortReason ?? transaction.error ?? new Error('Local media metadata read failed.'));
      };
  });
}

async function readMediaPair(session: LocalVaultSession, ownerId: string, generation: number, mediaId: string): Promise<StoredMediaPair | null> {
  assertSession(session, ownerId, generation);
  const database = await openAuthorizedDatabase(session, ownerId, generation);
  return new Promise<StoredMediaPair | null>((resolve, reject) => {
      let abortReason: unknown;
      const transaction = database.transaction([METADATA_STORE, BINARY_STORE], 'readonly');
      const key = mediaKey(ownerId, mediaId);
      const metadataRequest = transaction.objectStore(METADATA_STORE).get(key);
      const binaryRequest = transaction.objectStore(BINARY_STORE).get(key);
      let metadata: StoredMetadata | undefined;
      let binary: StoredBinary | undefined;
      let resolvedRequests = 0;
      const receive = () => {
        if (++resolvedRequests !== 2) return;
        try {
          assertSession(session, ownerId, generation);
          if (!metadata && !binary) return;
          if (!metadata || !binary) throw new Error('Local media metadata and binary record do not match.');
          validateMetadataRow(metadata, ownerId, mediaId);
          validateBinaryRow(binary, ownerId, mediaId);
        } catch (error) {
          abortReason = error;
          transaction.abort();
        }
      };
      metadataRequest.onsuccess = () => { metadata = metadataRequest.result as StoredMetadata | undefined; receive(); };
      binaryRequest.onsuccess = () => { binary = binaryRequest.result as StoredBinary | undefined; receive(); };
      metadataRequest.onerror = () => { abortReason = metadataRequest.error ?? new Error('Could not read local media metadata.'); };
      binaryRequest.onerror = () => { abortReason = binaryRequest.error ?? new Error('Could not read local media bytes.'); };
      transaction.oncomplete = () => {
        database.close();
        try {
          assertSession(session, ownerId, generation);
          resolve(metadata && binary ? { metadata, binary } : null);
        } catch (error) { reject(error); }
      };
      transaction.onerror = transaction.onabort = () => {
        database.close();
        reject(abortReason ?? transaction.error ?? new Error('Local media read failed.'));
      };
  });
}

export class LocalMediaVault {
  private readonly session: LocalVaultSession;
  private readonly ownerId: string;
  private readonly generation: number;

  constructor(session: LocalVaultSession) {
    assertId(session?.ownerId, 'ownerId');
    const generation = session.generation();
    if (!Number.isSafeInteger(generation) || generation < 0) throw new TypeError('Session generation must be a non-negative safe integer.');
    this.session = session;
    this.ownerId = session.ownerId;
    this.generation = generation;
    assertSession(session, this.ownerId, generation);
  }

  /** Revalidate the bound owner and generation before releasing local bytes. */
  assertUnlocked(): void {
    assertSession(this.session, this.ownerId, this.generation);
  }

  getOwnerId(): string {
    assertSession(this.session, this.ownerId, this.generation);
    return this.ownerId;
  }

  async put(blob: Blob, options: PutMediaOptions): Promise<MediaMetadata> {
    assertSession(this.session, this.ownerId, this.generation);
    if (!options || typeof options !== 'object') throw new TypeError('Media source information is required.');
    const mediaId = options.mediaId ?? crypto.randomUUID();
    const { metadataBase } = validateInput(blob, options, mediaId);
    const bytes = await blob.arrayBuffer();
    assertSession(this.session, this.ownerId, this.generation);
    if (bytes.byteLength !== blob.size || bytes.byteLength > MAX_MEDIA_BYTES || bytes.byteLength < 1) {
      throw new TypeError('Media changed or exceeded the 25 MiB limit while being read.');
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    assertSession(this.session, this.ownerId, this.generation);
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const metadata = normalizeMetadata({
      ...metadataBase,
      byteLength: bytes.byteLength,
      sha256,
      clientCreatedAt: new Date().toISOString(),
    }, this.ownerId, mediaId);
    const bytesEnvelope = await encryptPrivateBytes(this.ownerId, aadId(this.ownerId, mediaId, 'bytes'), bytes);
    assertSession(this.session, this.ownerId, this.generation);
    const metadataEnvelope = await encryptPrivate(this.ownerId, aadId(this.ownerId, mediaId, 'metadata'), {
      schemaVersion: 1,
      ownerId: this.ownerId,
      metadata,
    } satisfies EncryptedMetadata);
    assertSession(this.session, this.ownerId, this.generation);
    const key = mediaKey(this.ownerId, mediaId);
    const metadataRow: StoredMetadata = {
      key,
      ownerId: this.ownerId,
      mediaId,
      metadataEnvelope,
    };
    const binaryRow: StoredBinary = {
      key,
      ownerId: this.ownerId,
      mediaId,
      bytesEnvelope,
    };
    const database = await openAuthorizedDatabase(this.session, this.ownerId, this.generation);
    await new Promise<void>((resolve, reject) => {
      let abortReason: unknown;
      let transaction: IDBTransaction | undefined;
      const closeAndReject = (error: unknown) => {
        database.close();
        reject(error);
      };
      const setWriteError = (request: IDBRequest) => {
        // Preserve the authorization or setup failure that caused an intentional
        // abort; IndexedDB reports AbortError for sibling requests during rollback.
        if (abortReason) return;
        if (request.error?.name === 'ConstraintError') abortReason = new LocalMediaConflictError();
        else abortReason = request.error ?? new Error('Could not write local media.');
      };
      const checkCommit = () => {
        try { assertSession(this.session, this.ownerId, this.generation); }
        catch (error) { abortReason = error; transaction?.abort(); }
      };
      try {
        transaction = database.transaction([METADATA_STORE, BINARY_STORE], 'readwrite');
        transaction.oncomplete = () => {
          database.close();
          try { assertSession(this.session, this.ownerId, this.generation); resolve(); }
          catch (error) { reject(error); }
        };
        transaction.onerror = () => {};
        transaction.onabort = () => closeAndReject(abortReason ?? transaction?.error ?? new Error('Local media write failed.'));

        const metadataRequest = transaction.objectStore(METADATA_STORE).add(metadataRow);
        metadataRequest.onsuccess = checkCommit;
        metadataRequest.onerror = () => setWriteError(metadataRequest);

        // If this synchronous request setup fails, the catch aborts the same
        // transaction so the metadata request cannot commit by itself.
        const binaryRequest = transaction.objectStore(BINARY_STORE).add(binaryRow);
        binaryRequest.onsuccess = checkCommit;
        binaryRequest.onerror = () => setWriteError(binaryRequest);
      } catch (error) {
        abortReason = error;
        if (!transaction) {
          closeAndReject(error);
          return;
        }
        try { transaction.abort(); }
        catch { closeAndReject(error); }
      }
    });
    assertSession(this.session, this.ownerId, this.generation);
    return metadata;
  }

  async list(): Promise<MediaMetadata[]> {
    assertSession(this.session, this.ownerId, this.generation);
    const rows = await readMetadataRows(this.session, this.ownerId, this.generation);
    const results: MediaMetadata[] = [];
    for (const row of rows) results.push(await decryptMetadata(this.session, this.ownerId, this.generation, row));
    assertSession(this.session, this.ownerId, this.generation);
    return results.sort((left, right) => right.clientCreatedAt.localeCompare(left.clientCreatedAt));
  }

  async get(mediaId: string): Promise<{ metadata: MediaMetadata; blob: Blob }> {
    assertSession(this.session, this.ownerId, this.generation);
    assertId(mediaId, 'mediaId');
    const pair = await readMediaPair(this.session, this.ownerId, this.generation, mediaId);
    if (!pair) throw new LocalMediaNotFoundError();
    const metadata = await decryptMetadata(this.session, this.ownerId, this.generation, pair.metadata);
    assertSession(this.session, this.ownerId, this.generation);
    const bytes = await decryptPrivateBytes(this.ownerId, aadId(this.ownerId, mediaId, 'bytes'), pair.binary.bytesEnvelope);
    assertSession(this.session, this.ownerId, this.generation);
    if (bytes.byteLength !== metadata.byteLength) throw new Error('Local media length verification failed.');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    assertSession(this.session, this.ownerId, this.generation);
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (sha256 !== metadata.sha256) throw new Error('Local media integrity verification failed.');
    const blob = new Blob([bytes], { type: metadata.mimeType });
    assertSession(this.session, this.ownerId, this.generation);
    return { metadata, blob };
  }

  /** Prepare an atomic delete plan without loading the media ciphertext. */
  async prepareDeletion(mediaId: string): Promise<{ revisionCount: number; draftCount: number; confirm: () => Promise<void> }> {
    assertSession(this.session, this.ownerId, this.generation);
    assertId(mediaId, 'mediaId');
    const key = mediaKey(this.ownerId, mediaId);
    const database = await openAuthorizedDatabase(this.session, this.ownerId, this.generation);
    const expectedMetadata = await new Promise<StoredMetadata>((resolve, reject) => {
      let abortReason: unknown;
      const transaction = database.transaction(METADATA_STORE, 'readonly');
      const request = transaction.objectStore(METADATA_STORE).get(key);
      let row: StoredMetadata | undefined;
      request.onsuccess = () => {
        try {
          assertSession(this.session, this.ownerId, this.generation);
          row = request.result as StoredMetadata | undefined;
          if (row) validateMetadataRow(row, this.ownerId, mediaId);
        } catch (error) { abortReason = error; transaction.abort(); }
      };
      request.onerror = () => { abortReason = request.error ?? new Error('Could not read local media metadata.'); };
      transaction.oncomplete = () => {
        database.close();
        try {
          assertSession(this.session, this.ownerId, this.generation);
          if (!row) reject(new LocalMediaNotFoundError());
          else resolve(row);
        } catch (error) { reject(error); }
      };
      transaction.onerror = transaction.onabort = () => {
        database.close();
        reject(abortReason ?? transaction.error ?? new Error('Could not prepare local media deletion.'));
      };
    });
    await decryptMetadata(this.session, this.ownerId, this.generation, expectedMetadata);
    assertSession(this.session, this.ownerId, this.generation);
    let attempted = false;
    return {
      revisionCount: 1,
      draftCount: 0,
      confirm: async () => {
        if (attempted) throw new Error('This deletion plan has already been used. Refresh the private list and prepare again.');
        attempted = true;
        assertSession(this.session, this.ownerId, this.generation);
        const database = await openAuthorizedDatabase(this.session, this.ownerId, this.generation);
        await new Promise<void>((resolve, reject) => {
          let abortReason: unknown;
          let transaction: IDBTransaction | undefined;
          const abort = (reason: unknown) => {
            if (abortReason) return;
            abortReason = reason;
            if (!transaction) { database.close(); reject(reason); return; }
            try { transaction.abort(); }
            catch { database.close(); reject(reason); }
          };
          try {
            transaction = database.transaction([METADATA_STORE, BINARY_STORE], 'readwrite');
            transaction.oncomplete = () => {
              database.close();
              try { assertSession(this.session, this.ownerId, this.generation); resolve(); }
              catch (error) { reject(error); }
            };
            transaction.onerror = () => {};
            transaction.onabort = () => {
              database.close();
              reject(abortReason ?? transaction?.error ?? new Error('Local media deletion was aborted.'));
            };
            const metadataStore = transaction.objectStore(METADATA_STORE);
            const binaryStore = transaction.objectStore(BINARY_STORE);
            const metadataRequest = metadataStore.get(key);
            const binaryCountRequest = binaryStore.count(key);
            let reads = 0;
            const verifyAndDelete = () => {
              if (++reads !== 2) return;
              try {
                assertSession(this.session, this.ownerId, this.generation);
                const current = metadataRequest.result as StoredMetadata | undefined;
                if (!current || JSON.stringify(current) !== JSON.stringify(expectedMetadata) || binaryCountRequest.result !== 1) {
                  abort(new Error('The local media record changed. Refresh and prepare deletion again.'));
                  return;
                }
                validateMetadataRow(current, this.ownerId, mediaId);
                const deletes = [metadataStore.delete(key), binaryStore.delete(key)];
                for (const request of deletes) {
                  request.onsuccess = () => {
                    try { assertSession(this.session, this.ownerId, this.generation); }
                    catch (error) { abort(error); }
                  };
                  request.onerror = () => abort(request.error ?? new Error('Could not delete the selected local media.'));
                }
              } catch (error) { abort(error); }
            };
            metadataRequest.onsuccess = binaryCountRequest.onsuccess = verifyAndDelete;
            metadataRequest.onerror = () => abort(metadataRequest.error ?? new Error('Could not verify local media metadata.'));
            binaryCountRequest.onerror = () => abort(binaryCountRequest.error ?? new Error('Could not verify local media bytes.'));
          } catch (error) {
            abort(error);
          }
        });
      },
    };
  }

  /** Validate and prepare an immutable same-owner media restore without writes. */
  async prepareRestoreOriginal(
    input: { ownerId: string; metadata: MediaMetadata },
    blob: Blob,
  ): Promise<{ existing: boolean; confirm: () => Promise<void> }> {
    assertSession(this.session, this.ownerId, this.generation);
    if (!input || typeof input !== 'object' || input.ownerId !== this.ownerId) {
      throw new TypeError('The recovery file belongs to a different private account.');
    }
    const mediaId = input.metadata?.mediaId;
    assertId(mediaId, 'mediaId');
    const metadata = normalizeMetadata(input.metadata, this.ownerId, mediaId);
    if (!(blob instanceof Blob) || blob.size !== metadata.byteLength || blob.size < 1 || blob.size > MAX_MEDIA_BYTES) {
      throw new TypeError('The recovery media length does not match its saved metadata.');
    }
    const bytes = await blob.arrayBuffer();
    assertSession(this.session, this.ownerId, this.generation);
    if (bytes.byteLength !== metadata.byteLength || bytes.byteLength > MAX_MEDIA_BYTES) throw new TypeError('The recovery media length is invalid.');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    assertSession(this.session, this.ownerId, this.generation);
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (sha256 !== metadata.sha256) throw new Error('The recovery media failed its integrity check.');

    const key = mediaKey(this.ownerId, mediaId);
    const bytesEnvelope = await encryptPrivateBytes(this.ownerId, aadId(this.ownerId, mediaId, 'bytes'), bytes);
    assertSession(this.session, this.ownerId, this.generation);
    const metadataEnvelope = await encryptPrivate(this.ownerId, aadId(this.ownerId, mediaId, 'metadata'), {
      schemaVersion: 1, ownerId: this.ownerId, metadata,
    } satisfies EncryptedMetadata);
    assertSession(this.session, this.ownerId, this.generation);
    const preparedMetadata: StoredMetadata = { key, ownerId: this.ownerId, mediaId, metadataEnvelope };
    const preparedBinary: StoredBinary = { key, ownerId: this.ownerId, mediaId, bytesEnvelope };

    const existingPair = await readMediaPair(this.session, this.ownerId, this.generation, mediaId);
    assertSession(this.session, this.ownerId, this.generation);
    let existing = false;
    if (existingPair) {
      const currentMetadata = await decryptMetadata(this.session, this.ownerId, this.generation, existingPair.metadata);
      assertSession(this.session, this.ownerId, this.generation);
      const currentBytes = await decryptPrivateBytes(this.ownerId, aadId(this.ownerId, mediaId, 'bytes'), existingPair.binary.bytesEnvelope);
      assertSession(this.session, this.ownerId, this.generation);
      if (currentMetadata.byteLength !== currentBytes.byteLength) throw new Error('The existing local media failed its length check.');
      const currentDigest = await crypto.subtle.digest('SHA-256', currentBytes);
      assertSession(this.session, this.ownerId, this.generation);
      const currentSha = Array.from(new Uint8Array(currentDigest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (currentSha !== currentMetadata.sha256) throw new Error('The existing local media failed its integrity check.');
      if (JSON.stringify(currentMetadata) !== JSON.stringify(metadata) || !equalBytes(currentBytes, bytes)) {
        throw new LocalMediaConflictError();
      }
      existing = true;
    }

    let attempted = false;
    return {
      existing,
      confirm: async () => {
        if (attempted) throw new LocalMediaConflictError();
        attempted = true;
        assertSession(this.session, this.ownerId, this.generation);
        const database = await openAuthorizedDatabase(this.session, this.ownerId, this.generation);
        await new Promise<void>((resolve, reject) => {
          let abortReason: unknown;
          let transaction: IDBTransaction | undefined;
          const abort = (reason: unknown) => {
            if (abortReason) return;
            abortReason = reason;
            if (!transaction) { database.close(); reject(reason); return; }
            try { transaction.abort(); }
            catch { database.close(); reject(reason); }
          };
          try {
            transaction = database.transaction([METADATA_STORE, BINARY_STORE], 'readwrite');
            transaction.oncomplete = () => {
              database.close();
              try { assertSession(this.session, this.ownerId, this.generation); resolve(); }
              catch (error) { reject(error); }
            };
            transaction.onerror = () => {};
            transaction.onabort = () => {
              database.close();
              reject(abortReason ?? transaction?.error ?? new Error('Media restore was aborted.'));
            };
            const metadataStore = transaction.objectStore(METADATA_STORE);
            const binaryStore = transaction.objectStore(BINARY_STORE);
            const metadataRequest = metadataStore.get(key);
            const binaryRequest = binaryStore.get(key);
            let reads = 0;
            const verifyAndRestore = () => {
              if (++reads !== 2) return;
              try {
                assertSession(this.session, this.ownerId, this.generation);
                const currentMetadata = metadataRequest.result as StoredMetadata | undefined;
                const currentBinary = binaryRequest.result as StoredBinary | undefined;
                const unchanged = existing
                  ? Boolean(currentMetadata && currentBinary && sameMetadataRow(currentMetadata, existingPair!.metadata) && sameBinaryRow(currentBinary, existingPair!.binary))
                  : !currentMetadata && !currentBinary;
                if (!unchanged) { abort(new LocalMediaConflictError()); return; }
                if (existing) return;
                const metadataWrite = metadataStore.add(preparedMetadata);
                const binaryWrite = binaryStore.add(preparedBinary);
                for (const request of [metadataWrite, binaryWrite]) {
                  request.onerror = (event) => {
                    event.preventDefault();
                    abort(request.error?.name === 'ConstraintError' ? new LocalMediaConflictError() : request.error ?? new Error('Could not restore local media.'));
                  };
                  request.onsuccess = () => {
                    try { assertSession(this.session, this.ownerId, this.generation); }
                    catch (error) { abort(error); }
                  };
                }
              } catch (error) { abort(error); }
            };
            metadataRequest.onsuccess = binaryRequest.onsuccess = verifyAndRestore;
            metadataRequest.onerror = () => abort(metadataRequest.error ?? new Error('Could not verify media metadata.'));
            binaryRequest.onerror = () => abort(binaryRequest.error ?? new Error('Could not verify existing media bytes.'));
          } catch (error) { abort(error); }
        });
      },
    };
  }
}
