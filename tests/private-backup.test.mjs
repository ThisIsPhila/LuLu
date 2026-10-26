import 'fake-indexeddb/auto';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LocalVault, LocalVaultConflictError, LocalVaultLockedError } from '../src/services/vault/localVault.ts';
import { LocalMediaConflictError, LocalMediaLockedError, LocalMediaVault } from '../src/services/vault/localMediaVault.ts';
import { prepareBackupRestore, prepareMediaBackup, prepareTextBackup } from '../src/services/privateBackup.ts';

const PASSPHRASE = 'a careful recovery phrase 49 🌱';
const text = (title, body) => ({ format: 'lulu-private-text-v1', mediaType: 'text/plain', title, body, languages: ['en'] });

function session(ownerId = 'backup-owner') {
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
  const result = await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName);
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

beforeEach(async () => {
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.device-vault.v1');
});

async function textHistory(vault, recordId = 'saved-text') {
  const original = await vault.createOriginal({ recordId, revisionId: 'original-id', provenance: 'user-captured', content: text('Original', 'The first saved text — 🌿') });
  await vault.appendDerived({ recordId, revisionId: 'revision-id', parentRevisionId: original.revisionId, content: text('Edited', 'The later saved text.') });
  return vault.listRevisions(recordId);
}

test('text backup restores complete original history after local records and old key are lost', async () => {
  const sourceVault = new LocalVault(session().value);
  const expectedHistory = await textHistory(sourceVault);
  const prepared = await prepareTextBackup(sourceVault, 'saved-text', PASSPHRASE);
  assert.equal(prepared.fileName, 'lulu-private-record.lulubackup');
  assert.equal(prepared.blob.type, 'application/octet-stream');
  assert.equal((await prepared.blob.text()).includes('The first saved text'), false);
  assert.equal((await prepared.blob.text()).includes('The later saved text'), false);

  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const restoredSession = session();
  const targetVault = new LocalVault(restoredSession.value);
  const targetMedia = new LocalMediaVault(restoredSession.value);
  const plan = await prepareBackupRestore(targetVault, targetMedia, prepared.blob, PASSPHRASE);
  assert.equal(plan.kind, 'text');
  assert.equal(plan.revisionCount, 2);
  assert.equal(plan.existing, false);
  assert.deepEqual(await targetVault.listRecords(), [], 'prepare must not write the record');
  await plan.confirm();
  assert.deepEqual(await targetVault.listRevisions('saved-text'), expectedHistory);

  const identical = await prepareBackupRestore(targetVault, targetMedia, prepared.blob, PASSPHRASE);
  assert.equal(identical.existing, true);
  await identical.confirm();
  assert.deepEqual(await targetVault.listRevisions('saved-text'), expectedHistory);
});

test('restore preparation snapshots caller-owned history before its first asynchronous step', async () => {
  const source = new LocalVault(session().value);
  const expectedHistory = await textHistory(source, 'snapshot-import');
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const target = new LocalVault(session().value);
  const supplied = structuredClone(expectedHistory);
  const preparing = target.prepareRestoreRecord(supplied);
  supplied[0].recordId = 'mutated-record';
  supplied[0].revisionId = 'mutated-original';
  supplied[0].content.body = 'Changed immediately after call';
  supplied[1].parentRevisionId = 'mutated-original';
  supplied[1].sha256 = '0'.repeat(64);
  const plan = await preparing;
  await plan.confirm();
  assert.deepEqual(await target.listRevisions('snapshot-import'), expectedHistory);
  assert.deepEqual(await target.listRecords().then(rows => rows.map(row => row.recordId)), ['snapshot-import']);
});

test('wrong passphrase, tampered file, and wrong current owner fail before creating records', async () => {
  const source = new LocalVault(session('file-owner').value);
  await textHistory(source, 'protected');
  const backup = await prepareTextBackup(source, 'protected', PASSPHRASE);
  const targetSession = session('target-owner');
  const vault = new LocalVault(targetSession.value);
  const mediaVault = new LocalMediaVault(targetSession.value);

  await assert.rejects(prepareBackupRestore(vault, mediaVault, backup.blob, PASSPHRASE), /different private account|current account/);
  assert.deepEqual(await vault.listRecords(), []);

  const sameOwner = session('file-owner');
  const sameOwnerVault = new LocalVault(sameOwner.value);
  const sameOwnerMedia = new LocalMediaVault(sameOwner.value);
  const existingRecords = await sameOwnerVault.listRecords();
  await assert.rejects(prepareBackupRestore(sameOwnerVault, sameOwnerMedia, backup.blob, 'wrong recovery phrase'), /could not be opened/);
  const changed = new Uint8Array(await backup.blob.arrayBuffer());
  changed[changed.length - 1] ^= 1;
  await assert.rejects(prepareBackupRestore(sameOwnerVault, sameOwnerMedia, new Blob([changed]), PASSPHRASE), /could not be opened/);
  assert.deepEqual(await sameOwnerVault.listRecords(), existingRecords);
});

test('conflicting record IDs never overwrite and a prepared absence race aborts restore', async () => {
  const source = new LocalVault(session().value);
  await textHistory(source, 'same-id');
  const backup = await prepareTextBackup(source, 'same-id', PASSPHRASE);

  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');

  const conflictSession = session();
  const conflictVault = new LocalVault(conflictSession.value);
  const conflictMedia = new LocalMediaVault(conflictSession.value);
  await conflictVault.createOriginal({ recordId: 'same-id', revisionId: 'other-original', provenance: 'user-authored', content: text('Other', 'Keep this.') });
  await assert.rejects(prepareBackupRestore(conflictVault, conflictMedia, backup.blob, PASSPHRASE), LocalVaultConflictError);
  assert.equal((await conflictVault.getLatest('same-id')).revisionId, 'other-original');

  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const raceVault = new LocalVault(session().value);
  const raceMedia = new LocalMediaVault(session().value);
  const plan = await prepareBackupRestore(raceVault, raceMedia, backup.blob, PASSPHRASE);
  await raceVault.createOriginal({ recordId: 'same-id', revisionId: 'winner', provenance: 'user-authored', content: text('Winner', 'No overwrite.') });
  await assert.rejects(plan.confirm(), LocalVaultConflictError);
  assert.equal((await raceVault.getLatest('same-id')).revisionId, 'winner');
});

test('locked or stale authority aborts a prepared restore without writing', async () => {
  const source = new LocalVault(session().value);
  await textHistory(source, 'locked-restore');
  const backup = await prepareTextBackup(source, 'locked-restore', PASSPHRASE);
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const { state, value } = session();
  const vault = new LocalVault(value);
  const mediaVault = new LocalMediaVault(value);
  const plan = await prepareBackupRestore(vault, mediaVault, backup.blob, PASSPHRASE);
  state.unlocked = false;
  await assert.rejects(plan.confirm(), LocalVaultLockedError);
  state.unlocked = true;
  assert.deepEqual(await new LocalVault(value).listRecords(), []);

  const nextPlan = await prepareBackupRestore(vault, mediaVault, backup.blob, PASSPHRASE);
  state.generation += 1;
  await assert.rejects(nextPlan.confirm(), LocalVaultLockedError);
  assert.deepEqual(await new LocalVault(value).listRecords(), []);
});

test('text restore rolls back all revision writes when a later revision add fails', async () => {
  const source = new LocalVault(session().value);
  await textHistory(source, 'rollback-text');
  const backup = await prepareTextBackup(source, 'rollback-text', PASSPHRASE);
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const target = new LocalVault(session().value);
  const media = new LocalMediaVault(session().value);
  const plan = await prepareBackupRestore(target, media, backup.blob, PASSPHRASE);
  const storePrototype = IDBObjectStore.prototype;
  const originalAdd = storePrototype.add;
  let revisionAdds = 0;
  const failure = new DOMException('Injected restore failure', 'QuotaExceededError');
  storePrototype.add = function (...args) {
    if (this.name === 'revisions' && ++revisionAdds === 2) throw failure;
    return originalAdd.apply(this, args);
  };
  try { await assert.rejects(plan.confirm(), error => error === failure); }
  finally { storePrototype.add = originalAdd; }
  assert.deepEqual(await target.listRecords(), []);
  assert.equal(await readRow('lulu.local-vault.v1', 'heads', JSON.stringify(['backup-owner', 'rollback-text'])), undefined);
});

test('media backup restores exact bytes and all saved metadata after the old key is removed', async () => {
  const sourceSession = session();
  const source = new LocalMediaVault(sourceSession.value);
  const originalBytes = Uint8Array.from([0, 255, 17, 33, 0, 128]);
  const metadata = await source.put(new Blob([originalBytes], { type: 'audio/wav' }), {
    mediaId: 'media-id', title: 'Voice note', source: 'file', originalName: 'voice.wav', durationMs: 2430,
  });
  const backup = await prepareMediaBackup(source, 'media-id', PASSPHRASE);
  assert.equal((await backup.blob.text()).includes('Voice note'), false);
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');

  const targetSession = session();
  const target = new LocalMediaVault(targetSession.value);
  const textVault = new LocalVault(targetSession.value);
  const plan = await prepareBackupRestore(textVault, target, backup.blob, PASSPHRASE);
  assert.equal(plan.kind, 'media');
  assert.equal(plan.revisionCount, 1);
  assert.equal(plan.existing, false);
  assert.deepEqual(await target.list(), []);
  await plan.confirm();
  const restored = await target.get('media-id');
  assert.deepEqual(restored.metadata, metadata);
  assert.deepEqual(new Uint8Array(await restored.blob.arrayBuffer()), originalBytes);
});

test('media restore rejects wrong owner, mismatched bytes, and conflicting existing IDs', async () => {
  const source = new LocalMediaVault(session().value);
  const metadata = await source.put(new Blob(['original'], { type: 'image/png' }), { mediaId: 'conflict-media', source: 'file' });
  const backup = await prepareMediaBackup(source, 'conflict-media', PASSPHRASE);

  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const targetSession = session('different-owner');
  const target = new LocalMediaVault(targetSession.value);
  await assert.rejects(target.prepareRestoreOriginal({ ownerId: 'backup-owner', metadata }, new Blob(['original'], { type: 'image/png' })), /different private account/);

  const sameSession = session();
  const sameOwner = new LocalMediaVault(sameSession.value);
  await assert.rejects(sameOwner.prepareRestoreOriginal({ ownerId: 'backup-owner', metadata }, new Blob(['tampered'], { type: 'image/png' })), /integrity check/);
  await sameOwner.put(new Blob(['different'], { type: 'image/png' }), { mediaId: 'conflict-media', source: 'file' });
  const textVault = new LocalVault(sameSession.value);
  await assert.rejects(prepareBackupRestore(textVault, sameOwner, backup.blob, PASSPHRASE), LocalMediaConflictError);
  assert.deepEqual(new Uint8Array(await (await sameOwner.get('conflict-media')).blob.arrayBuffer()), new TextEncoder().encode('different'));
});

test('media restore rolls back metadata if binary add setup fails', async () => {
  const source = new LocalMediaVault(session().value);
  await source.put(new Blob(['rollback bytes'], { type: 'image/webp' }), { mediaId: 'rollback-media', source: 'file' });
  const backup = await prepareMediaBackup(source, 'rollback-media', PASSPHRASE);
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
  const targetSession = session();
  const target = new LocalMediaVault(targetSession.value);
  const textVault = new LocalVault(targetSession.value);
  const plan = await prepareBackupRestore(textVault, target, backup.blob, PASSPHRASE);
  const storePrototype = IDBObjectStore.prototype;
  const originalAdd = storePrototype.add;
  const failure = new DOMException('Injected binary restore failure', 'QuotaExceededError');
  storePrototype.add = function (...args) {
    if (this.name === 'binary') throw failure;
    return originalAdd.apply(this, args);
  };
  try { await assert.rejects(plan.confirm(), error => error === failure); }
  finally { storePrototype.add = originalAdd; }
  const key = JSON.stringify(['backup-owner', 'rollback-media']);
  assert.equal(await readRow('lulu.local-media-vault.v1', 'metadata', key), undefined);
  assert.equal(await readRow('lulu.local-media-vault.v1', 'binary', key), undefined);
});
