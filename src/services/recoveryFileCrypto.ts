/** Versioned password-encrypted file primitive. This does not restore vault records. */
export const MAX_RECOVERY_PAYLOAD_BYTES = 64 * 1024 * 1024;
const MAGIC = new TextEncoder().encode('LULUBK01');
const HEADER_BYTES = 40;
const ITERATIONS = 600_000;
const encoder = new TextEncoder();

type AssertCurrent = () => void;

function passwordBytes(passphrase: string): Uint8Array<ArrayBuffer> {
  if (typeof passphrase !== 'string' || [...passphrase].length < 12 || [...passphrase].length > 1024) {
    throw new TypeError('Use a recovery passphrase between 12 and 1,024 characters.');
  }
  const bytes = encoder.encode(passphrase);
  if (new TextDecoder().decode(bytes) !== passphrase) throw new TypeError('Use a valid Unicode recovery passphrase.');
  return bytes;
}

async function derive(passphrase: string, salt: Uint8Array<ArrayBuffer>, assertCurrent: AssertCurrent) {
  assertCurrent();
  const material = await crypto.subtle.importKey('raw', passwordBytes(passphrase), 'PBKDF2', false, ['deriveKey']);
  assertCurrent();
  const key = await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS}, material, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
  assertCurrent();
  return key;
}

/** Fresh salt and IV per file; all header fields are authenticated as additional data. */
export async function encryptRecoveryFile(payload: Blob, passphrase: string, assertCurrent: AssertCurrent): Promise<Blob> {
  assertCurrent();passwordBytes(passphrase);
  if (!(payload instanceof Blob) || payload.size < 1 || payload.size > MAX_RECOVERY_PAYLOAD_BYTES) throw new RangeError('Recovery payload must contain 1 byte to 64 MiB.');
  const header = new Uint8Array(HEADER_BYTES);
  header.set(MAGIC);new DataView(header.buffer).setUint32(8,ITERATIONS,false);
  header.set(crypto.getRandomValues(new Uint8Array(16)),12);
  header.set(crypto.getRandomValues(new Uint8Array(12)),28);
  const key = await derive(passphrase,header.slice(12,28),assertCurrent);
  const bytes = await payload.arrayBuffer();
  assertCurrent();
  if (bytes.byteLength !== payload.size || bytes.byteLength > MAX_RECOVERY_PAYLOAD_BYTES) throw new RangeError('Recovery payload changed while being read.');
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv:header.slice(28),additionalData:header,tagLength:128},key,bytes);
  assertCurrent();
  return new Blob([header,ciphertext],{type:'application/octet-stream'});
}

/** Fixed KDF work and file-size bounds reject hostile headers before expensive work. */
export async function decryptRecoveryFile(file: Blob, passphrase: string, assertCurrent: AssertCurrent): Promise<Blob> {
  assertCurrent();passwordBytes(passphrase);
  if (!(file instanceof Blob) || file.size < HEADER_BYTES+17 || file.size > HEADER_BYTES+16+MAX_RECOVERY_PAYLOAD_BYTES) throw new RangeError('Recovery file size is outside the supported range.');
  const header = new Uint8Array(await file.slice(0,HEADER_BYTES).arrayBuffer());
  assertCurrent();
  if (MAGIC.some((byte,index)=>header[index]!==byte) || new DataView(header.buffer).getUint32(8,false)!==ITERATIONS) throw new Error('Unsupported recovery file format.');
  const key = await derive(passphrase,header.slice(12,28),assertCurrent);
  const ciphertext = await file.slice(HEADER_BYTES).arrayBuffer();
  assertCurrent();
  let plaintext: ArrayBuffer;
  try { plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:header.slice(28),additionalData:header,tagLength:128},key,ciphertext); }
  catch { throw new Error('Recovery file could not be opened. Check the passphrase and file.'); }
  assertCurrent();
  return new Blob([plaintext],{type:'application/octet-stream'});
}
