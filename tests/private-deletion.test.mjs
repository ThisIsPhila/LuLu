import 'fake-indexeddb/auto';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LocalVault, LocalVaultConflictError, LocalVaultLockedError } from '../src/services/vault/localVault.ts';
import { LocalMediaLockedError, LocalMediaVault } from '../src/services/vault/localMediaVault.ts';

const PRIVATE_TEXT = (body) => ({ format: 'lulu-private-text-v1', mediaType: 'text/plain', title: '', body, languages: [] });

function session(ownerId = 'delete-owner') {
  const state = { ownerId, generation: 1, unlocked: true };
  return { state, value: { get ownerId() { return state.ownerId; }, generation: () => state.generation, isUnlocked: () => state.unlocked } };
}

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

function openDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRow(database, storeName, key) {
  const db = await openDb(database);
  const row = await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName);
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return row;
}

async function updateRow(database, storeName, key, update) {
  const db = await openDb(database);
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => store.put(update(request.result));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = resolve;
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

beforeEach(async () => {
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.device-vault.v1');
});

async function createText(vault, recordId, withRevision = false) {
  const original = await vault.createOriginal({ recordId, revisionId: `${recordId}-v1`, provenance: 'user-authored', content: PRIVATE_TEXT('original') });
  if (withRevision) await vault.appendDerived({ recordId, revisionId: `${recordId}-v2`, parentRevisionId: original.revisionId, content: PRIVATE_TEXT('edited') });
  return original;
}

test('text deletion removes only the chosen history and linked drafts; key and unrelated data remain', async () => {
  const ownerA = new LocalVault(session('owner-a').value);
  const ownerB = new LocalVault(session('owner-b').value);
  const original = await createText(ownerA, 'selected', true);
  await ownerA.saveDraft({ draftId: 'linked-draft', expectedVersion: null, content: PRIVATE_TEXT('linked'), target: { recordId: 'selected', parentRevisionId: 'selected-v2' } });
  await ownerA.saveDraft({ draftId: 'unlinked-draft', expectedVersion: null, content: PRIVATE_TEXT('independent') });
  await createText(ownerA, 'other-record');
  await createText(ownerB, 'selected');
  await ownerB.saveDraft({ draftId: 'other-owner-draft', expectedVersion: null, content: PRIVATE_TEXT('other owner') });

  const plan = await ownerA.prepareDeletion('selected');
  assert.equal(plan.revisionCount, 2);
  assert.equal(plan.draftCount, 1);
  await plan.confirm();

  assert.equal(await ownerA.getLatest('selected'), null);
  assert.equal(await ownerA.getDraft('linked-draft'), null);
  assert.equal((await ownerA.getDraft('unlinked-draft')).draftId, 'unlinked-draft');
  assert.ok(await ownerA.getLatest('other-record'));
  assert.ok(await ownerB.getLatest('selected'));
  assert.equal((await ownerB.getDraft('other-owner-draft')).draftId, 'other-owner-draft');
  assert.equal((await ownerA.getRevision('selected', original.revisionId)), null);
  const key = await readRow('lulu.device-vault.v1', 'keys', 'owner-a');
  assert.ok(key, 'record deletion must not remove or rotate the local encryption key');
});

test('preparing or canceling text deletion has no storage effect', async () => {
  const vault = new LocalVault(session().value);
  await createText(vault, 'kept');
  await vault.saveDraft({ draftId: 'kept-draft', expectedVersion: null, content: PRIVATE_TEXT('draft') });
  const plan = await vault.prepareDeletion('kept');
  assert.equal(plan.revisionCount, 1);
  assert.equal(plan.draftCount, 0);
  assert.ok(await vault.getLatest('kept'));
  assert.ok(await vault.getDraft('kept-draft'));
});

test('text deletion plan rejects changed history, linked drafts, or encrypted envelopes without deleting', async (t) => {
  await t.test('head and revision set changes', async () => {
    const vault = new LocalVault(session().value);
    const original = await createText(vault, 'stale-head');
    const plan = await vault.prepareDeletion('stale-head');
    await vault.appendDerived({ recordId: 'stale-head', revisionId: 'v2', parentRevisionId: original.revisionId, content: PRIVATE_TEXT('new') });
    await assert.rejects(plan.confirm(), LocalVaultConflictError);
    assert.equal((await vault.listRevisions('stale-head')).length, 2);
  });

  await t.test('linked draft version changes', async () => {
    const vault = new LocalVault(session().value);
    await createText(vault, 'stale-draft');
    await vault.saveDraft({ draftId: 'linked', expectedVersion: null, content: PRIVATE_TEXT('one'), target: { recordId: 'stale-draft', parentRevisionId: 'stale-draft-v1' } });
    const plan = await vault.prepareDeletion('stale-draft');
    await vault.saveDraft({ draftId: 'linked', expectedVersion: 1, content: PRIVATE_TEXT('two'), target: { recordId: 'stale-draft', parentRevisionId: 'stale-draft-v1' } });
    await assert.rejects(plan.confirm(), LocalVaultConflictError);
    assert.ok(await vault.getLatest('stale-draft'));
    assert.equal((await vault.getDraft('linked')).version, 2);
  });

  await t.test('stored revision envelope changes', async () => {
    const vault = new LocalVault(session().value);
    await createText(vault, 'stale-envelope');
    const plan = await vault.prepareDeletion('stale-envelope');
    const key = JSON.stringify(['delete-owner', 'stale-envelope', 'stale-envelope-v1']);
    await updateRow('lulu.local-vault.v1', 'revisions', key, (row) => ({
      ...row, envelope: { ...row.envelope, ciphertext: `${row.envelope.ciphertext.slice(0, -2)}AA` },
    }));
    await assert.rejects(plan.confirm(), LocalVaultConflictError);
    assert.ok(await readRow('lulu.local-vault.v1', 'heads', JSON.stringify(['delete-owner', 'stale-envelope'])));
  });
});

test('linked autosave cannot recreate a draft after its target record was deleted', async () => {
  const vault = new LocalVault(session().value);
  await createText(vault, 'autosave-target');
  const plan = await vault.prepareDeletion('autosave-target');
  await plan.confirm();
  await assert.rejects(vault.saveDraft({
    draftId: 'late-autosave', expectedVersion: null, content: PRIVATE_TEXT('late'),
    target: { recordId: 'autosave-target', parentRevisionId: 'autosave-target-v1' },
  }), LocalVaultConflictError);
  assert.equal(await vault.getDraft('late-autosave'), null);
  assert.equal(await vault.getLatest('autosave-target'), null);
});

test('text deletion rolls back all stores when a later synchronous delete setup fails', async () => {
  const vault = new LocalVault(session().value);
  await createText(vault, 'rollback', true);
  await vault.saveDraft({ draftId: 'rollback-draft', expectedVersion: null, content: PRIVATE_TEXT('linked'), target: { recordId: 'rollback', parentRevisionId: 'rollback-v2' } });
  const plan = await vault.prepareDeletion('rollback');
  const storePrototype = IDBObjectStore.prototype;
  const originalDelete = storePrototype.delete;
  const failure = new DOMException('Injected quota failure', 'QuotaExceededError');
  storePrototype.delete = function (...args) {
    if (this.name === 'revisions') throw failure;
    return originalDelete.apply(this, args);
  };
  try { await assert.rejects(plan.confirm(), error => error === failure); }
  finally { storePrototype.delete = originalDelete; }
  assert.equal((await vault.listRevisions('rollback')).length, 2);
  assert.ok(await vault.getDraft('rollback-draft'));
});

test('locked or changed session cannot confirm deletion', async () => {
  const { state, value } = session();
  const vault = new LocalVault(value);
  await createText(vault, 'locked');
  const plan = await vault.prepareDeletion('locked');
  state.unlocked = false;
  await assert.rejects(plan.confirm(), LocalVaultLockedError);
  state.unlocked = true;
  assert.ok(await vault.getLatest('locked'));
  const nextPlan = await vault.prepareDeletion('locked');
  state.generation += 1;
  await assert.rejects(nextPlan.confirm(), LocalVaultLockedError);
  assert.ok(await new LocalVault(value).getLatest('locked'));
});

test('media deletion reads metadata only when preparing and removes only the selected owner record atomically', async () => {
  const ownerA = new LocalMediaVault(session('owner-a').value);
  const ownerB = new LocalMediaVault(session('owner-b').value);
  await ownerA.put(new Blob(['image bytes'], { type: 'image/png' }), { mediaId: 'same-media', source: 'file' });
  await ownerB.put(new Blob(['other owner bytes'], { type: 'image/png' }), { mediaId: 'same-media', source: 'file' });

  const databasePrototype = IDBDatabase.prototype;
  const originalTransaction = databasePrototype.transaction;
  const readonlyStores = [];
  databasePrototype.transaction = function (storeNames, mode, ...rest) {
    if (this.name === 'lulu.local-media-vault.v1' && mode === 'readonly') readonlyStores.push(...(Array.isArray(storeNames) ? storeNames : [storeNames]));
    return originalTransaction.call(this, storeNames, mode, ...rest);
  };
  let plan;
  try { plan = await ownerA.prepareDeletion('same-media'); }
  finally { databasePrototype.transaction = originalTransaction; }
  assert.deepEqual(readonlyStores, ['metadata']);
  assert.equal(plan.revisionCount, 1);
  assert.equal(plan.draftCount, 0);
  await plan.confirm();
  await assert.rejects(ownerA.get('same-media'));
  assert.deepEqual(new Uint8Array(await (await ownerB.get('same-media')).blob.arrayBuffer()), new TextEncoder().encode('other owner bytes'));
  assert.ok(await readRow('lulu.device-vault.v1', 'keys', 'owner-a'));
});

test('prepared media deletion can be canceled without changing either store', async () => {
  const vault = new LocalMediaVault(session().value);
  await vault.put(new Blob(['leave this media'], { type: 'image/gif' }), { mediaId: 'cancel-media', source: 'file' });
  const plan = await vault.prepareDeletion('cancel-media');
  assert.equal(plan.revisionCount, 1);
  assert.deepEqual(new Uint8Array(await (await vault.get('cancel-media')).blob.arrayBuffer()), new TextEncoder().encode('leave this media'));
});

test('media deletion detects stale metadata and preserves both stores on synchronous binary delete failure', async (t) => {
  await t.test('metadata changed after prepare', async () => {
    const vault = new LocalMediaVault(session().value);
    await vault.put(new Blob(['media'], { type: 'audio/wav' }), { mediaId: 'stale-media', source: 'file' });
    const plan = await vault.prepareDeletion('stale-media');
    const key = JSON.stringify(['delete-owner', 'stale-media']);
    await updateRow('lulu.local-media-vault.v1', 'metadata', key, row => ({ ...row, metadataEnvelope: { ...row.metadataEnvelope, ciphertext: `${row.metadataEnvelope.ciphertext.slice(0, -2)}AA` } }));
    await assert.rejects(plan.confirm(), /changed/);
    await assert.rejects(vault.get('stale-media'));
    assert.ok(await readRow('lulu.local-media-vault.v1', 'binary', key));
  });

  await t.test('binary delete setup fails after metadata delete is queued', async () => {
    const vault = new LocalMediaVault(session().value);
    await vault.put(new Blob(['keep both'], { type: 'image/webp' }), { mediaId: 'rollback-media', source: 'file' });
    const plan = await vault.prepareDeletion('rollback-media');
    const storePrototype = IDBObjectStore.prototype;
    const originalDelete = storePrototype.delete;
    const failure = new DOMException('Injected binary quota failure', 'QuotaExceededError');
    storePrototype.delete = function (...args) {
      if (this.name === 'binary') throw failure;
      return originalDelete.apply(this, args);
    };
    try { await assert.rejects(plan.confirm(), error => error === failure); }
    finally { storePrototype.delete = originalDelete; }
    const key = JSON.stringify(['delete-owner', 'rollback-media']);
    assert.ok(await readRow('lulu.local-media-vault.v1', 'metadata', key));
    assert.ok(await readRow('lulu.local-media-vault.v1', 'binary', key));
  });
});

test('locked media session does not prepare or commit deletion', async () => {
  const { state, value } = session();
  const vault = new LocalMediaVault(value);
  await vault.put(new Blob(['private'], { type: 'image/png' }), { mediaId: 'locked-media', source: 'file' });
  const plan = await vault.prepareDeletion('locked-media');
  state.generation += 1;
  await assert.rejects(plan.confirm(), LocalMediaLockedError);
  assert.ok(await new LocalMediaVault(value).get('locked-media'));
});

test('concurrent new revision does not prevent recovery of later edits to the original parent', async()=>{
  const {value}=session();const vault=new LocalVault(value);
  const original=await createText(vault,'concurrent-parent');
  await vault.appendDerived({recordId:'concurrent-parent',revisionId:'new-head',parentRevisionId:original.revisionId,content:PRIVATE_TEXT('another saved edit')});
  await vault.saveDraft({draftId:'still-recoverable',expectedVersion:null,target:{recordId:'concurrent-parent',parentRevisionId:original.revisionId},content:PRIVATE_TEXT('my later unsaved work')});
  assert.equal((await vault.getDraft('still-recoverable')).content.body,'my later unsaved work');
  await assert.rejects(vault.finalizeDraft({draftId:'still-recoverable',expectedVersion:1}),LocalVaultConflictError);
  assert.equal((await vault.getLatest('concurrent-parent')).revisionId,'new-head');
  assert.equal((await vault.getDraft('still-recoverable')).version,1);
});
