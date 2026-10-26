import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNativePlatform } from '../../platform/runtime.ts';

const databaseName = 'lulu.device-vault.v1';
const secureKeyName = (uid: string) => `lulu.device-vault.v1.key.${uid}`;

/** The encryption layer depends on CryptoKey access, not a particular device store. */
export interface DeviceKeyStore {
  keyFor(uid: string, create: boolean): Promise<CryptoKey>;
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(databaseName, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('keys');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => resolve(open.result);
  });
}

async function readLegacyKey(uid: string): Promise<CryptoKey | undefined> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly');
    const get = tx.objectStore('keys').get(uid);
    get.onsuccess = () => resolve(get.result as CryptoKey | undefined);
    tx.oncomplete = () => db.close();
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Device key storage is unavailable.')); };
  });
}

async function createLegacyKey(uid: string): Promise<CryptoKey> {
  const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    let winningKey = generated;
    const get = store.get(uid);
    get.onsuccess = () => { if (get.result) winningKey = get.result as CryptoKey; else store.put(generated, uid); };
    tx.oncomplete = () => { db.close(); resolve(winningKey); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Device key storage is unavailable.')); };
  });
}

/**
 * On native, newly created vault keys are stored through iOS Keychain / Android
 * Keystore-backed secure storage. Existing non-extractable IndexedDB CryptoKeys
 * remain the authority for their records; they cannot be exported safely, so
 * this adapter never replaces or deletes them during an implicit migration.
 */
class HybridDeviceKeyStore implements DeviceKeyStore {
  private readonly nativeFlights = new Map<string, Promise<CryptoKey>>();

  async keyFor(uid: string, create: boolean): Promise<CryptoKey> {
    const legacy = await readLegacyKey(uid);
    if (legacy) return legacy;
    if (!isNativePlatform()) {
      if (!create) throw new Error('This browser does not have the key for this private record. Use the original browser.');
      return createLegacyKey(uid);
    }
    const stored = await SecureStorage.getItem(secureKeyName(uid));
    if (stored) return importStoredKey(stored);
    if (!create) throw new Error('This device does not have the key for this private record. Use the original device.');
    let pending = this.nativeFlights.get(uid);
    if (!pending) {
      pending = this.createNativeKey(uid);
      this.nativeFlights.set(uid, pending);
      void pending.finally(() => { if (this.nativeFlights.get(uid) === pending) this.nativeFlights.delete(uid); }).catch(() => {});
    }
    return pending;
  }

  private async createNativeKey(uid: string): Promise<CryptoKey> {
    const existing = await SecureStorage.getItem(secureKeyName(uid));
    if (existing) return importStoredKey(existing);
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const serialized = encodeBase64(raw);
    await SecureStorage.setItem(secureKeyName(uid), serialized);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function importStoredKey(value: string): Promise<CryptoKey> {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('The protected device key is invalid.');
  const binary = atob(value);
  const raw = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (raw.byteLength !== 32) throw new Error('The protected device key is invalid.');
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export const deviceKeyStore: DeviceKeyStore = new HybridDeviceKeyStore();
