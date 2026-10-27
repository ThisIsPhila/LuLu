import type { ModelManifest, ModelPackageStore } from './contracts';

const DB_NAME = 'lulu-privacy-models';
const DB_VERSION = 1;
const STORE_NAME = 'packages';

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Browser storage is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open browser storage.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Browser storage operation failed.'));
  });
}

const packagePrefix = (id: string, version: string) => `${id}:${version}:`;
const metadataKey = (id: string, version: string) => `${packagePrefix(id, version)}manifest`;

export const browserModelStore: ModelPackageStore & {
  readArtifact(id: string, version: string, name: string): Promise<Uint8Array | undefined>;
} = {
  async has(id, version) {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const value = await new Promise<unknown>((resolve, reject) => {
        const request = transaction.objectStore(STORE_NAME).get(metadataKey(id, version));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return Boolean(value);
    } finally { db.close(); }
  },
  async commit(manifest: ModelManifest, files: ReadonlyMap<string, Uint8Array>) {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const artifact of manifest.artifacts) {
        const file = files.get(artifact.name);
        if (!file) { transaction.abort(); throw new Error(`Missing model file: ${artifact.name}`); }
        store.put(file, `${packagePrefix(manifest.id, manifest.version)}${artifact.name}`);
      }
      store.put({ id: manifest.id, version: manifest.version, installedAt: Date.now() }, metadataKey(manifest.id, manifest.version));
      await transactionDone(transaction);
    } finally { db.close(); }
  },
  async readArtifact(id, version, name) {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const value = await new Promise<unknown>((resolve, reject) => {
        const request = transaction.objectStore(STORE_NAME).get(`${packagePrefix(id, version)}${name}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (value instanceof Uint8Array) return value;
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      return undefined;
    } finally { db.close(); }
  },
  async remove(id, version) {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const key of await new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })) if (typeof key === 'string' && key.startsWith(packagePrefix(id, version))) store.delete(key);
      await transactionDone(transaction);
    } finally { db.close(); }
  },
};
