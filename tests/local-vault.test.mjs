import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

const { LocalVault, LocalVaultConflictError, LocalVaultLockedError } = await import('../src/services/vault/localVault.ts');

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

beforeEach(async () => {
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
});

function session(ownerId = 'owner-a') {
  const state = { ownerId, generation: 1, unlocked: true };
  return { state, value: { get ownerId() { return state.ownerId; }, generation: () => state.generation, isUnlocked: () => state.unlocked } };
}

test('stores original and derived revisions encrypted, preserving the original', async () => {
  const { value } = session();
  const vault = new LocalVault(value);
  const original = await vault.createOriginal({
    recordId: 'r1', revisionId: 'v1', provenance: 'user-authored', content: { body: 'sensitive original' },
  });
  const derived = await vault.appendDerived({
    recordId: 'r1', revisionId: 'v2', parentRevisionId: 'v1', content: { body: 'redacted derivative' },
  });

  assert.equal(original.kind, 'original');
  assert.equal(original.sha256.length, 64);
  assert.equal(derived.parentRevisionId, 'v1');
  assert.deepEqual((await vault.getRevision('r1', 'v1')).content, { body: 'sensitive original' });
  assert.deepEqual((await vault.getLatest('r1')).content, { body: 'redacted derivative' });
  assert.deepEqual((await vault.listRevisions('r1')).map(({ revisionId }) => revisionId), ['v1', 'v2']);
  const reopened = new LocalVault(value);
  assert.deepEqual((await reopened.listRecords()).map(({ recordId, revisionId }) => [recordId, revisionId]), [['r1', 'v2']]);

  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const stored = await new Promise((resolve, reject) => {
    const request = db.transaction('revisions').objectStore('revisions').get(JSON.stringify(['owner-a', 'r1', 'v1']));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  assert.equal(JSON.stringify(stored).includes('sensitive original'), false);
  assert.equal(stored.envelope.version, 1);
});

test('locked or changed sessions fail closed for reads and writes', async () => {
  const { value, state } = session();
  const vault = new LocalVault(value);
  state.unlocked = false;
  await assert.rejects(() => vault.createOriginal({ recordId: 'r', revisionId: 'v1', provenance: 'user-captured', content: 'x' }), LocalVaultLockedError);
  state.unlocked = true;
  await vault.createOriginal({ recordId: 'r', revisionId: 'v1', provenance: 'user-captured', content: 'x' });
  state.unlocked = false;
  await assert.rejects(() => vault.getLatest('r'), LocalVaultLockedError);
  state.generation += 1;
  state.unlocked = true;
  await assert.rejects(() => vault.getLatest('r'), LocalVaultLockedError);
  const freshSessionVault = new LocalVault(value);
  assert.equal((await freshSessionVault.getLatest('r')).content, 'x');
});

test('prevents synthetic records and invalid provenance from entering evidence', async () => {
  const vault = new LocalVault(session().value);
  await assert.rejects(() => vault.createOriginal({
    recordId: 'sample', revisionId: 'v1', provenance: 'user-authored', content: { body: 'fiction', isSynthetic: true },
  }), /Synthetic or sample/);
  await assert.rejects(() => vault.createOriginal({
    recordId: 'sample', revisionId: 'v1', provenance: 'sample', content: { body: 'fiction' },
  }), /provenance/);
  await assert.rejects(() => vault.createOriginal({
    recordId: 'starter', revisionId: 'v1', provenance: 'user-authored', content: { kind: 'starter_content', body: 'seed' },
  }), /Synthetic or sample/);
  await assert.rejects(() => vault.createOriginal({
    recordId: 'seed-ref', revisionId: 'v1', provenance: 'user-authored', content: { seedRef: 'daily-starter-1' },
  }), /Synthetic or sample/);
  assert.equal(await vault.getLatest('sample'), null);
});

test('atomically prevents duplicate originals and stale or duplicate revisions', async () => {
  const vault = new LocalVault(session().value);
  const attempts = await Promise.allSettled([
    vault.createOriginal({ recordId: 'r', revisionId: 'v1', provenance: 'user-authored', content: 'one' }),
    vault.createOriginal({ recordId: 'r', revisionId: 'v1', provenance: 'user-authored', content: 'two' }),
  ]);
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter((result) => result.status === 'rejected').length, 1);
  const original = await vault.getLatest('r');
  assert.ok(original);
  await vault.appendDerived({ recordId: 'r', revisionId: 'v2', parentRevisionId: original.revisionId, content: 'derived' });
  await assert.rejects(
    () => vault.appendDerived({ recordId: 'r', revisionId: 'v3', parentRevisionId: original.revisionId, content: 'stale branch' }),
    LocalVaultConflictError,
  );
  await assert.rejects(
    () => vault.appendDerived({ recordId: 'r', revisionId: 'v2', parentRevisionId: 'v2', content: 'duplicate ID' }),
    LocalVaultConflictError,
  );
  assert.deepEqual((await vault.listRevisions('r')).map(({ revisionId }) => revisionId), ['v1', 'v2']);
});

test('owner identity scopes records and authenticated encryption', async () => {
  const ownerVault = new LocalVault(session('owner-a').value);
  const otherVault = new LocalVault(session('owner-b').value);
  await ownerVault.createOriginal({ recordId: 'same-id', revisionId: 'v1', provenance: 'user-authored', content: 'private' });
  assert.equal(await otherVault.getLatest('same-id'), null);
  assert.equal(await otherVault.getRevision('same-id', 'v1'), null);
});

test('pins owner identity for the lifetime of a vault instance', async () => {
  const { state, value } = session('owner-a');
  const vault = new LocalVault(value);
  await vault.createOriginal({ recordId: 'record', revisionId: 'v1', provenance: 'user-authored', content: 'private' });
  state.ownerId = 'owner-b';
  await assert.rejects(() => vault.getLatest('record'), LocalVaultLockedError);
  assert.equal(await new LocalVault(value).getLatest('record'), null);
});

test('authenticated data is bound to owner, record and revision identity', async () => {
  const vault = new LocalVault(session().value);
  await vault.createOriginal({ recordId: 'before', revisionId: 'v1', provenance: 'user-captured', content: 'private payload' });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('revisions', 'readwrite');
    const store = tx.objectStore('revisions');
    const request = store.get(JSON.stringify(['owner-a', 'before', 'v1']));
    request.onsuccess = () => {
      const row = request.result;
      row.key = JSON.stringify(['owner-a', 'after', 'v1']);
      row.ownerRecordKey = JSON.stringify(['owner-a', 'after']);
      row.recordId = 'after';
      store.delete(JSON.stringify(['owner-a', 'before', 'v1']));
      store.add(row);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await assert.rejects(() => vault.getRevision('after', 'v1'));
});

test('rejects a row copied to another lookup key without changing its identity fields', async () => {
  const vault = new LocalVault(session().value);
  await vault.createOriginal({ recordId: 'record-b', revisionId: 'v1', provenance: 'user-authored', content: 'B data' });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('revisions', 'readwrite');
    const store = tx.objectStore('revisions');
    const request = store.get(JSON.stringify(['owner-a', 'record-b', 'v1']));
    request.onsuccess = () => store.add({ ...request.result, key: JSON.stringify(['owner-a', 'record-a', 'v1']) });
    request.onerror = () => reject(request.error);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await assert.rejects(() => vault.getRevision('record-a', 'v1'), /identity validation/);
});

test('snapshots plain JSON once and rejects mutable or lossy values', async () => {
  const vault = new LocalVault(session().value);
  const input = { body: 'before' };
  const saving = vault.createOriginal({ recordId: 'snapshot', revisionId: 'v1', provenance: 'user-authored', content: input });
  input.body = 'after';
  const saved = await saving;
  assert.deepEqual(saved.content, { body: 'before' });
  let getterCalled = false;
  const getterInput = Object.defineProperty({}, 'body', { enumerable: true, get() { getterCalled = true; return 'unsafe'; } });
  await assert.rejects(() => vault.createOriginal({ recordId: 'getter', revisionId: 'v1', provenance: 'user-authored', content: getterInput }), /accessors/);
  assert.equal(getterCalled, false);
  let toJsonCalled = false;
  await assert.rejects(() => vault.createOriginal({ recordId: 'tojson', revisionId: 'v1', provenance: 'user-authored', content: { toJSON() { toJsonCalled = true; return 'rewritten'; } } }), /plain JSON/);
  assert.equal(toJsonCalled, false);
  await assert.rejects(() => vault.createOriginal({ recordId: 'bytes', revisionId: 'v1', provenance: 'user-captured', content: new Uint8Array([1, 2, 3]) }), /plain JSON/);
});

test('snapshots record IDs and provenance before asynchronous encryption', async () => {
  const vault = new LocalVault(session().value);
  const originalInput = { recordId: 'stable-record', revisionId: 'v1', provenance: 'user-authored', content: { body: 'original' } };
  const savingOriginal = vault.createOriginal(originalInput);
  originalInput.recordId = 'changed-record';
  originalInput.revisionId = 'changed-v1';
  originalInput.provenance = 'sample';
  const original = await savingOriginal;
  assert.equal(original.recordId, 'stable-record');
  assert.equal(original.provenance, 'user-authored');

  const derivedInput = { recordId: 'stable-record', revisionId: 'v2', parentRevisionId: 'v1', content: { body: 'derived' } };
  const savingDerived = vault.appendDerived(derivedInput);
  derivedInput.recordId = 'changed-record';
  derivedInput.revisionId = 'changed-v2';
  derivedInput.parentRevisionId = 'changed-parent';
  const derived = await savingDerived;
  assert.equal(derived.recordId, 'stable-record');
  assert.equal(derived.revisionId, 'v2');
  assert.equal(derived.parentRevisionId, 'v1');
  assert.equal((await vault.getLatest('stable-record')).revisionId, 'v2');
  assert.equal(await vault.getLatest('changed-record'), null);
});

test('rejects late reads after exit and permits a fresh instance at a new generation', async () => {
  const { value, state } = session();
  const vault = new LocalVault(value);
  await vault.createOriginal({ recordId: 'late', revisionId: 'v1', provenance: 'user-authored', content: 'sensitive' });
  const lateRead = vault.getRevision('late', 'v1');
  state.unlocked = false;
  state.generation += 1;
  state.unlocked = true;
  await assert.rejects(() => lateRead, LocalVaultLockedError);
  assert.equal((await new LocalVault(value).getLatest('late')).content, 'sensitive');
});

test('detects missing revisions against the record head', async () => {
  const vault = new LocalVault(session().value);
  await vault.createOriginal({ recordId: 'rollback', revisionId: 'v1', provenance: 'user-authored', content: 'one' });
  await vault.appendDerived({ recordId: 'rollback', revisionId: 'v2', parentRevisionId: 'v1', content: 'two' });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('revisions', 'readwrite');
    tx.objectStore('revisions').delete(JSON.stringify(['owner-a', 'rollback', 'v1']));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await assert.rejects(() => vault.listRevisions('rollback'), /does not match its record head/);
});

test('detects orphaned revision rows when a record head is missing', async () => {
  const vault = new LocalVault(session().value);
  await vault.createOriginal({ recordId: 'orphan', revisionId: 'v1', provenance: 'user-authored', content: 'one' });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('heads', 'readwrite');
    tx.objectStore('heads').delete(JSON.stringify(['owner-a', 'orphan']));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await assert.rejects(() => vault.listRecords(), /orphaned or duplicate record heads/);
});
