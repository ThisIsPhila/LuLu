import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { encryptPrivate, encryptPrivateBytes } from '../src/services/backend/deviceVault.ts';
import { LocalMediaConflictError, LocalMediaLockedError, LocalMediaNotFoundError, LocalMediaVault, MAX_MEDIA_BYTES } from '../src/services/vault/localMediaVault.ts';

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

function session(ownerId = 'owner-a') {
  const state = { ownerId, generation: 1, unlocked: true };
  return { state, value: { get ownerId() { return state.ownerId; }, generation: () => state.generation, isUnlocked: () => state.unlocked } };
}

async function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-media-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredRow(mediaId, ownerId = 'owner-a') {
  const db = await openMediaDb();
  const pair = await new Promise((resolve, reject) => {
    const transaction = db.transaction(['metadata', 'binary']);
    const key = JSON.stringify([ownerId, mediaId]);
    const metadataRequest = transaction.objectStore('metadata').get(key);
    const binaryRequest = transaction.objectStore('binary').get(key);
    const result = {};
    metadataRequest.onsuccess = () => { result.metadata = metadataRequest.result; };
    binaryRequest.onsuccess = () => { result.binary = binaryRequest.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
  db.close();
  return pair;
}

async function replaceStoredRow(pair, oldOwnerId = pair.metadata.ownerId, oldMediaId = pair.metadata.mediaId) {
  const db = await openMediaDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(['metadata', 'binary'], 'readwrite');
    const key = JSON.stringify([oldOwnerId, oldMediaId]);
    transaction.objectStore('metadata').delete(key);
    transaction.objectStore('binary').delete(key);
    if (pair.metadata) transaction.objectStore('metadata').put(pair.metadata);
    if (pair.binary) transaction.objectStore('binary').put(pair.binary);
    transaction.oncomplete = resolve;
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

beforeEach(async () => {
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.device-vault.v1');
});

test('binary image bytes and metadata round-trip exactly while stored fields stay encrypted', async () => {
  const bytes = Uint8Array.from([0, 255, 1, 2, 0, 128, 13, 10]);
  const { value } = session();
  const vault = new LocalMediaVault(value);
  const metadata = await vault.put(new Blob([bytes], { type: 'image/png' }), {
    mediaId: 'image-1', title: 'Kitchen window', source: 'file', originalName: 'window.png',
  });
  const result = await vault.get(metadata.mediaId);
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), bytes);
  assert.deepEqual(await vault.list(), [metadata]);
  assert.equal(metadata.kind, 'image');
  assert.equal(metadata.byteLength, bytes.byteLength);
  assert.equal(metadata.sha256.length, 64);

  const stored = await getStoredRow('image-1');
  assert.deepEqual(Object.keys(stored.metadata).sort(), ['key', 'mediaId', 'metadataEnvelope', 'ownerId']);
  assert.deepEqual(Object.keys(stored.binary).sort(), ['bytesEnvelope', 'key', 'mediaId', 'ownerId']);
  assert.deepEqual(stored.metadata.key, stored.binary.key);
  assert.equal(JSON.stringify(stored).includes('Kitchen window'), false);
  assert.equal(JSON.stringify(stored).includes('window.png'), false);
  assert.equal(stored.binary.bytesEnvelope.ciphertext instanceof ArrayBuffer, true);
  assert.notDeepEqual(new Uint8Array(stored.binary.bytesEnvelope.ciphertext), bytes);
});

test('audio MIME codec parameters normalize and duration/source/file metadata remain encrypted', async () => {
  const { value } = session();
  const vault = new LocalMediaVault(value);
  const metadata = await vault.put(new Blob([Uint8Array.from([9, 8, 7])], { type: 'audio/webm; codecs=opus' }), {
    mediaId: 'audio-1', title: 'Voice note', source: 'file', originalName: 'voice.webm', durationMs: 1240,
  });
  assert.equal(metadata.mimeType, 'audio/webm');
  assert.equal(metadata.kind, 'audio');
  assert.equal(metadata.durationMs, 1240);
  assert.equal((await vault.get('audio-1')).blob.type, 'audio/webm');
});

test('unsupported active content and mismatched capture sources are rejected', async () => {
  const vault = new LocalMediaVault(session().value);
  for (const mimeType of ['image/svg+xml', 'text/html', 'video/mp4', 'application/octet-stream']) {
    await assert.rejects(vault.put(new Blob(['x'], { type: mimeType }), { source: 'file' }), /supported/);
  }
  await assert.rejects(vault.put(new Blob(['x'], { type: 'image/jpeg' }), { source: 'microphone' }), /does not match/);
  await assert.rejects(vault.put(new Blob(['x'], { type: 'audio/mp4' }), { source: 'camera' }), /does not match/);
  await assert.rejects(vault.put(new Blob(['x'], { type: 'audio/mp4; charset=utf-8' }), { source: 'file' }), /MIME type/);
  assert.deepEqual(await vault.list(), []);
});

test('25 MiB limit is enforced before reading and zero-byte media is rejected', async () => {
  const vault = new LocalMediaVault(session().value);
  const tooLarge = new Blob([new Uint8Array(MAX_MEDIA_BYTES + 1)], { type: 'image/png' });
  await assert.rejects(vault.put(tooLarge, { source: 'file' }), /25 MiB/);
  await assert.rejects(vault.put(new Blob([], { type: 'image/png' }), { source: 'file' }), /25 MiB/);
  assert.deepEqual(await vault.list(), []);
});

test('simultaneous duplicate IDs commit at most one immutable media row', async () => {
  const vault = new LocalMediaVault(session().value);
  const attempts = await Promise.allSettled([
    vault.put(new Blob(['first bytes'], { type: 'image/png' }), { mediaId: 'same-id', source: 'file' }),
    vault.put(new Blob(['second bytes'], { type: 'image/png' }), { mediaId: 'same-id', source: 'file' }),
  ]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  const failed = attempts.find(result => result.status === 'rejected');
  assert.equal(failed.reason instanceof LocalMediaConflictError, true);
  assert.equal((await vault.list()).length, 1);
});

test('owner, media ID and ciphertext swaps fail authentication', async () => {
  const { value } = session();
  const ownerVault = new LocalMediaVault(value);
  await ownerVault.put(new Blob(['private bytes'], { type: 'audio/wav' }), { mediaId: 'bound-id', source: 'file' });
  const row = await getStoredRow('bound-id');

  const otherKey = JSON.stringify(['owner-b', 'bound-id']);
  const otherOwner = {
    metadata: { ...row.metadata, ownerId: 'owner-b', key: otherKey },
    binary: { ...row.binary, ownerId: 'owner-b', key: otherKey },
  };
  await replaceStoredRow(otherOwner);
  const otherVault = new LocalMediaVault(session('owner-b').value);
  await assert.rejects(otherVault.get('bound-id'));

  await replaceStoredRow(row, 'owner-b', 'bound-id');
  const swappedKey = JSON.stringify(['owner-a', 'other-id']);
  const swapped = {
    metadata: { ...row.metadata, key: swappedKey, mediaId: 'other-id' },
    binary: { ...row.binary, key: swappedKey, mediaId: 'other-id' },
  };
  await replaceStoredRow(swapped);
  await assert.rejects(ownerVault.get('other-id'));

  await replaceStoredRow(row, 'owner-a', 'other-id');
  const tampered = {
    metadata: { ...row.metadata, metadataEnvelope: { ...row.metadata.metadataEnvelope, ciphertext: 'AAAA'.repeat(30) } },
    binary: row.binary,
  };
  await replaceStoredRow(tampered);
  await assert.rejects(ownerVault.get('bound-id'));
});

test('listing decrypts metadata without decrypting the binary envelope', async () => {
  const vault = new LocalMediaVault(session().value);
  await vault.put(new Blob(['list metadata only'], { type: 'image/webp' }), { mediaId: 'list-only', source: 'file' });
  const row = await getStoredRow('list-only');
  await replaceStoredRow({
    metadata: row.metadata,
    binary: { ...row.binary, bytesEnvelope: { ...row.binary.bytesEnvelope, ciphertext: new ArrayBuffer(1) } },
  });
  const databasePrototype = IDBDatabase.prototype;
  const originalTransaction = databasePrototype.transaction;
  const queriedStores = [];
  databasePrototype.transaction = function (storeNames, mode, ...rest) {
    if (this.name === 'lulu.local-media-vault.v1' && mode === 'readonly') {
      queriedStores.push(...(Array.isArray(storeNames) ? storeNames : [storeNames]));
    }
    return originalTransaction.call(this, storeNames, mode, ...rest);
  };
  try {
    assert.equal((await vault.list())[0].mediaId, 'list-only');
  } finally {
    databasePrototype.transaction = originalTransaction;
  }
  assert.deepEqual(queriedStores, ['metadata']);
  await assert.rejects(vault.get('list-only'), /unsupported format/);
});

test('upgrades the previous combined row layout into separate metadata and binary stores', async () => {
  const ownerId = 'owner-a';
  const mediaId = 'legacy-1';
  const bytes = new TextEncoder().encode('legacy encrypted image').buffer;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const metadata = {
    mediaId, kind: 'image', mimeType: 'image/png', byteLength: bytes.byteLength,
    sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
    clientCreatedAt: '2026-10-26T00:00:00.000Z', source: 'file', originalName: 'legacy.png',
  };
  const key = JSON.stringify([ownerId, mediaId]);
  const legacyRow = {
    key, ownerId, mediaId,
    metadataEnvelope: await encryptPrivate(ownerId, JSON.stringify(['local-media', 'metadata', ownerId, mediaId]), {
      schemaVersion: 1, ownerId, metadata,
    }),
    bytesEnvelope: await encryptPrivateBytes(ownerId, JSON.stringify(['local-media', 'bytes', ownerId, mediaId]), bytes),
  };
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-media-vault.v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('media', { keyPath: 'key' });
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('media', 'readwrite');
      transaction.objectStore('media').add(legacyRow);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
    request.onerror = () => reject(request.error);
  });

  const vault = new LocalMediaVault(session(ownerId).value);
  assert.equal((await vault.list())[0].mediaId, mediaId);
  assert.deepEqual(new Uint8Array(await (await vault.get(mediaId)).blob.arrayBuffer()), new Uint8Array(bytes));
  const db = await openMediaDb();
  assert.deepEqual([...db.objectStoreNames].sort(), ['binary', 'metadata']);
  db.close();
});

test('lock or generation change suppresses delayed writes and reads', async () => {
  const { value, state } = session();
  const vault = new LocalMediaVault(value);
  let release;
  class DelayedBlob extends Blob {
    arrayBuffer() { return new Promise(resolve => { release = resolve; }); }
  }
  const pendingPut = vault.put(new DelayedBlob(['delayed'], { type: 'image/png' }), { mediaId: 'delayed', source: 'file' });
  state.unlocked = false;
  release(new TextEncoder().encode('delayed').buffer);
  await assert.rejects(pendingPut, LocalMediaLockedError);
  state.unlocked = true;
  assert.deepEqual(await new LocalMediaVault(value).list(), []);

  await vault.put(new Blob(['saved'], { type: 'image/png' }), { mediaId: 'saved', source: 'file' });
  const pendingGet = vault.get('saved');
  state.generation += 1;
  await assert.rejects(pendingGet, LocalMediaLockedError);
  assert.equal((await new LocalMediaVault(value).get('saved')).metadata.mediaId, 'saved');
});

test('lock after the row add starts aborts the pending transaction before it commits', async () => {
  const { value, state } = session();
  const vault = new LocalMediaVault(value);
  const storePrototype = IDBObjectStore.prototype;
  const originalAdd = storePrototype.add;
  storePrototype.add = function (...args) {
    const request = originalAdd.apply(this, args);
    state.unlocked = false;
    return request;
  };
  try {
    await assert.rejects(vault.put(new Blob(['must not commit'], { type: 'image/png' }), { mediaId: 'precommit-lock', source: 'file' }), LocalMediaLockedError);
  } finally {
    storePrototype.add = originalAdd;
  }
  state.unlocked = true;
  assert.deepEqual(await new LocalMediaVault(value).list(), []);
});

test('synchronous binary add failure aborts both stores, preserves prior data, and closes the database', async () => {
  const vault = new LocalMediaVault(session().value);
  await vault.put(new Blob(['existing media'], { type: 'image/png' }), { mediaId: 'existing', source: 'file' });

  const storePrototype = IDBObjectStore.prototype;
  const originalAdd = storePrototype.add;
  const quotaError = new DOMException('Injected second-store quota failure', 'QuotaExceededError');
  storePrototype.add = function (...args) {
    if (this.name === 'binary') throw quotaError;
    return originalAdd.apply(this, args);
  };
  try {
    let timeout;
    const pending = vault.put(new Blob(['must roll back'], { type: 'image/png' }), { mediaId: 'failed', source: 'file' });
    const result = await Promise.race([
      pending.then(() => ({ kind: 'resolved' }), error => ({ kind: 'rejected', error })),
      new Promise(resolve => { timeout = setTimeout(() => resolve({ kind: 'timeout' }), 500); }),
    ]);
    clearTimeout(timeout);
    assert.equal(result.kind, 'rejected', 'transaction abort should settle asynchronously without hanging');
    assert.strictEqual(result.error, quotaError, 'the synchronous quota failure should be preserved');
  } finally {
    storePrototype.add = originalAdd;
  }

  assert.deepEqual(await getStoredRow('failed'), { metadata: undefined, binary: undefined });
  assert.deepEqual((await vault.list()).map(item => item.mediaId), ['existing']);
  assert.deepEqual(new Uint8Array(await (await vault.get('existing')).blob.arrayBuffer()), new TextEncoder().encode('existing media'));
  await deleteDb('lulu.local-media-vault.v1');
});

test('missing identifiers and records fail without disclosing another owner record', async () => {
  const vault = new LocalMediaVault(session().value);
  await assert.rejects(vault.get('missing'), LocalMediaNotFoundError);
  await assert.rejects(vault.put(new Blob(['bytes'], { type: 'image/png' }), { mediaId: '../bad', source: 'file' }), /identifier/);
  const other = new LocalMediaVault(session('owner-b').value);
  await assert.rejects(other.get('missing'), LocalMediaNotFoundError);
});
