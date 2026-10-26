import { deviceKeyStore } from './deviceKeyStore.ts';

// A non-extractable device key protects cloud payloads. It is not bound to the passkey.
// Losing browser data loses this key; no cross-device recovery is claimed.
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
const decode = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
export type Envelope = {version:1;iv:string;ciphertext:string};
export type BinaryEnvelope = {version:1;iv:Uint8Array;ciphertext:ArrayBuffer};
export async function encryptPrivate(uid: string, id: string, payload: unknown): Promise<Envelope> {
  const key = await deviceKeyStore.keyFor(uid, true), iv = crypto.getRandomValues(new Uint8Array(12));
  const result = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${uid}/${id}`)},key,new TextEncoder().encode(JSON.stringify(payload)));
  return {version:1,iv:encode(iv),ciphertext:encode(new Uint8Array(result))};
}
export async function decryptPrivate<T>(uid: string, id: string, data: Envelope): Promise<T> {
  if(data.version !==1) throw new Error('This private record uses an unsupported format.');
  const key = await deviceKeyStore.keyFor(uid, false);
  const result = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv),additionalData:new TextEncoder().encode(`${uid}/${id}`)},key,decode(data.ciphertext));
  return JSON.parse(new TextDecoder().decode(result)) as T;
}

/** Encrypt exact binary bytes without base64 expansion; metadata remains a separate envelope. */
export async function encryptPrivateBytes(uid: string, id: string, bytes: ArrayBuffer): Promise<BinaryEnvelope> {
  const key = await deviceKeyStore.keyFor(uid, true), iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${uid}/${id}`)},key,bytes);
  return {version:1,iv,ciphertext};
}

export async function decryptPrivateBytes(uid: string, id: string, data: BinaryEnvelope): Promise<ArrayBuffer> {
  if (data?.version !== 1 || !(data.iv instanceof Uint8Array) || data.iv.byteLength !== 12 ||
      !(data.ciphertext instanceof ArrayBuffer) || data.ciphertext.byteLength < 16) {
    throw new Error('This private binary record uses an unsupported format.');
  }
  const key = await deviceKeyStore.keyFor(uid, false);
  const iv = new Uint8Array(new ArrayBuffer(12));
  iv.set(data.iv);
  return crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${uid}/${id}`)},key,data.ciphertext);
}
