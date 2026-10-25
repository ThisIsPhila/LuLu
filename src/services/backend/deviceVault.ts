// A non-extractable device key protects cloud payloads. It is not bound to the passkey.
// Losing browser data loses this key; no cross-device recovery is claimed.
const name = 'lulu.device-vault.v1';
async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('keys');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('keys', mode);
      const req = operation(tx.objectStore('keys'));
      tx.oncomplete = () => {db.close(); resolve(req.result);};
      tx.onerror = () => {db.close(); reject(tx.error);};
      tx.onabort = () => {db.close(); reject(tx.error || new Error('Device storage could not complete.'));};
    };
  });
}
async function keyFor(uid: string, create: boolean): Promise<CryptoKey> {
  const stored = await withStore<CryptoKey | undefined>('readonly', store => store.get(uid));
  if (stored) return stored;
  if (!create) throw new Error('This browser does not have the key for this private record. Use the original browser.');
  const generated = await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  // One read/write transaction prevents concurrent saves from replacing the winning key.
  return new Promise((resolve,reject) => {
    const open = indexedDB.open(name,1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('keys','readwrite'), store = tx.objectStore('keys');
      let key = generated;
      const get = store.get(uid);
      get.onsuccess = () => {if (get.result) key=get.result; else store.put(generated,uid);};
      tx.oncomplete = () => {db.close();resolve(key);};
      tx.onabort = tx.onerror = () => {db.close();reject(tx.error);};
    };
  });
}
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
const decode = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
export type Envelope = {version:1;iv:string;ciphertext:string};
export async function encryptPrivate(uid: string, id: string, payload: unknown): Promise<Envelope> {
  const key = await keyFor(uid, true), iv = crypto.getRandomValues(new Uint8Array(12));
  const result = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${uid}/${id}`)},key,new TextEncoder().encode(JSON.stringify(payload)));
  return {version:1,iv:encode(iv),ciphertext:encode(new Uint8Array(result))};
}
export async function decryptPrivate<T>(uid: string, id: string, data: Envelope): Promise<T> {
  if(data.version !==1) throw new Error('This private record uses an unsupported format.');
  const key = await keyFor(uid, false);
  const result = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv),additionalData:new TextEncoder().encode(`${uid}/${id}`)},key,decode(data.ciphertext));
  return JSON.parse(new TextDecoder().decode(result)) as T;
}
