import type { OrdinaryMediaRef } from '../domain/journal';

const DATABASE = 'lulu.ordinary-media.v1';
const STORE = 'attachments';
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

type StoredMedia = { key: string; ownerId: string; entryId: string; ref: OrdinaryMediaRef; blob: Blob };

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('This browser does not support local attachment storage.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE) ? request.transaction?.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: 'key' });
      if (store && !store.indexNames.contains('ownerEntry')) store.createIndex('ownerEntry', ['ownerId', 'entryId'], { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local attachment storage is unavailable.'));
    request.onblocked = () => reject(new Error('Close other LuLu tabs before saving attachments.'));
  });
}

function mediaKey(ownerId: string, entryId: string, id: string): string { return `${ownerId}:${entryId}:${id}`; }

export async function saveOrdinaryMedia(ownerId: string, entryId: string, blob: Blob, details: { kind: OrdinaryMediaRef['kind']; name?: string; durationMs?: number }): Promise<OrdinaryMediaRef> {
  if (!ownerId || blob.size < 1 || blob.size > MAX_MEDIA_BYTES) throw new RangeError('Choose an attachment between 1 byte and 25 MB.');
  const ref: OrdinaryMediaRef = {
    id: crypto.randomUUID(), kind: details.kind, mimeType: blob.type || (details.kind === 'image' ? 'application/octet-stream' : 'audio/webm'), byteLength: blob.size,
    ...(details.name ? { name: details.name.slice(0, 200) } : {}),
    ...(details.durationMs === undefined ? {} : { durationMs: Math.max(0, Math.round(details.durationMs)) }),
  };
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add({ key: mediaKey(ownerId, entryId, ref.id), ownerId, entryId, ref, blob } satisfies StoredMedia);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('The attachment could not be saved on this device.'));
      tx.onabort = () => reject(tx.error ?? new Error('The attachment could not be saved on this device.'));
    });
    return ref;
  } finally { db.close(); }
}

export async function getOrdinaryMedia(ownerId: string, entryId: string, id: string): Promise<{ ref: OrdinaryMediaRef; blob: Blob } | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(mediaKey(ownerId, entryId, id));
      request.onsuccess = () => {
        const value = request.result as StoredMedia | undefined;
        resolve(value?.ownerId === ownerId && value.entryId === entryId ? { ref: value.ref, blob: value.blob } : null);
      };
      request.onerror = () => reject(request.error ?? new Error('The attachment could not be opened.'));
    });
  } finally { db.close(); }
}

export async function listOrdinaryMedia(ownerId: string, entryId: string): Promise<Array<{ ref: OrdinaryMediaRef; blob: Blob }>> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).index('ownerEntry').getAll(IDBKeyRange.only([ownerId, entryId]));
      request.onsuccess = () => resolve((request.result as StoredMedia[]).map(({ref, blob}) => ({ref, blob})));
      request.onerror = () => reject(request.error ?? new Error('The attachments could not be opened.'));
    });
  } finally { db.close(); }
}

export async function deleteOrdinaryMedia(ownerId: string, entryId: string, ids?: string[]): Promise<void> {
  if ((ids && !ids.length) || typeof indexedDB === 'undefined') return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (ids) ids.forEach(id => store.delete(mediaKey(ownerId, entryId, id)));
      else {
        const request = store.index('ownerEntry').openCursor(IDBKeyRange.only([ownerId, entryId]));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          cursor.delete();
          cursor.continue();
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Local attachments could not be removed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Local attachments could not be removed.'));
    });
  } finally { db.close(); }
}
