import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

const { LocalVault, LocalVaultConflictError, LocalVaultLockedError } = await import('../src/services/vault/localVault.ts');

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

beforeEach(async () => {
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.device-vault.v1');
});

function session(ownerId = 'draft-owner') {
  const state = { ownerId, generation: 4, unlocked: true };
  return { state, value: {
    get ownerId() { return state.ownerId; },
    generation: () => state.generation,
    isUnlocked: () => state.unlocked,
  } };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function injectStoreRequestFailure(storeName, methodName, errorName, action) {
  const db = await openDb();
  const objectStorePrototype = Object.getPrototypeOf(db.transaction(storeName, 'readonly').objectStore(storeName));
  db.close();
  const original = objectStorePrototype[methodName];
  objectStorePrototype[methodName] = function (...args) {
    const request = original.apply(this, args);
    if (this.name !== storeName) return request;
    const failure = new DOMException(`Injected ${errorName}`, errorName);
    Object.defineProperty(request, 'error', { configurable: true, get: () => failure, set: () => {} });
    let onerror;
    Object.defineProperty(request, 'onerror', {
      configurable: true,
      get: () => onerror,
      set: (handler) => {
        onerror = handler;
        queueMicrotask(() => onerror?.({ preventDefault() {} }));
      },
    });
    return request;
  };
  try { return await action(); }
  finally { objectStorePrototype[methodName] = original; }
}

test('drafts survive a new vault instance with the same browser key and remain encrypted at rest', async () => {
  const { value } = session();
  const first = new LocalVault(value);
  const content = { title: 'Private title', body: 'Uncommitted writing 🌿' };
  const draft = await first.saveDraft({ draftId: 'capture-1', expectedVersion: null, content });
  content.body = 'mutated after call';
  assert.equal(draft.version, 1);
  assert.equal(draft.content.body, 'Uncommitted writing 🌿');

  const db = await openDb();
  assert.equal(db.objectStoreNames.contains('drafts'), true);
  const stored = await new Promise((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get(JSON.stringify(['draft-owner', 'capture-1']));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  assert.equal(JSON.stringify(stored).includes('Private title'), false);
  assert.equal(JSON.stringify(stored).includes('Uncommitted writing'), false);
  assert.equal(stored.envelope.version, 1);

  const reopened = new LocalVault(value);
  assert.deepEqual((await reopened.getDraft('capture-1')).content, { title: 'Private title', body: 'Uncommitted writing 🌿' });
  assert.equal((await new LocalVault(session('another-owner').value).listDrafts()).length, 0);
});

test('adds the draft store through a version-2 upgrade without replacing existing stores or rows', async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.local-vault.v1', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      const revisions = db.createObjectStore('revisions', { keyPath: 'key' });
      revisions.createIndex('ownerRecordKey', 'ownerRecordKey');
      revisions.createIndex('ownerId', 'ownerId');
      const heads = db.createObjectStore('heads', { keyPath: 'key' });
      heads.createIndex('ownerId', 'ownerId');
      revisions.add({ key: 'preserved-revision', ownerId: 'legacy-owner', recordId: 'legacy-record' });
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  });
  const vault = new LocalVault(session().value);
  await vault.saveDraft({ draftId: 'after-upgrade', expectedVersion: null, content: { body: 'draft' } });
  const db = await openDb();
  assert.equal(db.version, 3);
  assert.equal(db.objectStoreNames.contains('heads'), true);
  assert.equal(db.objectStoreNames.contains('revisions'), true);
  assert.equal(db.objectStoreNames.contains('drafts'), true);
  const preserved = await new Promise((resolve, reject) => {
    const request = db.transaction('revisions').objectStore('revisions').get('preserved-revision');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  assert.equal(preserved.recordId, 'legacy-record');
});

test('closes a database connection that succeeds after an already-rejected blocked upgrade', async () => {
  const originalOpen = indexedDB.open;
  let lateConnectionClosed = false;
  const lateConnection = { close() { lateConnectionClosed = true; } };
  indexedDB.open = function (name, version) {
    if (name !== 'lulu.local-vault.v1' || version !== 3) return originalOpen.call(this, name, version);
    const request = { result: lateConnection, onblocked: null, onsuccess: null, onerror: null };
    setTimeout(() => request.onblocked?.(), 0);
    setTimeout(() => request.onsuccess?.(), 5);
    return request;
  };
  try {
    const vault = new LocalVault(session().value);
    await assert.rejects(() => vault.saveDraft({ draftId: 'blocked', expectedVersion: null, content: { body: 'draft' } }), /blocked by another tab/i);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(lateConnectionClosed, true);
  } finally {
    indexedDB.open = originalOpen;
  }
});

test('draft saves use compare-and-swap and reject locked or stale generations', async () => {
  const { value, state } = session();
  const vault = new LocalVault(value);
  await vault.saveDraft({ draftId: 'draft', expectedVersion: null, content: { body: 'v1' } });
  const v2 = await vault.saveDraft({ draftId: 'draft', expectedVersion: 1, content: { body: 'v2' } });
  assert.equal(v2.version, 2);
  await assert.rejects(() => vault.saveDraft({ draftId: 'draft', expectedVersion: 1, content: { body: 'stale' } }), LocalVaultConflictError);
  assert.equal((await vault.getDraft('draft')).content.body, 'v2');

  state.unlocked = false;
  await assert.rejects(() => vault.listDrafts(), LocalVaultLockedError);
  state.unlocked = true;
  state.generation += 1;
  await assert.rejects(() => vault.saveDraft({ draftId: 'draft', expectedVersion: 2, content: { body: 'late' } }), LocalVaultLockedError);
  assert.equal((await new LocalVault(value).getDraft('draft')).content.body, 'v2');
});

test('oversized snapshots fail without an acknowledgement or partial stored draft', async () => {
  const vault = new LocalVault(session().value);
  await assert.rejects(
    () => vault.saveDraft({ draftId: 'too-large', expectedVersion: null, content: { body: 'x'.repeat(1_000_001) } }),
    /1 MB local content limit/,
  );
  assert.equal(await vault.getDraft('too-large'), null);
  const recovered = await vault.saveDraft({ draftId: 'too-large', expectedVersion: null, content: { body: 'retry works' } });
  assert.equal(recovered.version, 1);
});

test('preserves quota errors on a failed update and keeps the prior draft available for retry', async () => {
  const vault = new LocalVault(session().value);
  await vault.saveDraft({ draftId: 'quota-draft', expectedVersion: null, content: { body: 'committed v1' } });
  await injectStoreRequestFailure('drafts', 'put', 'QuotaExceededError', async () => {
    await assert.rejects(
      () => vault.saveDraft({ draftId: 'quota-draft', expectedVersion: 1, content: { body: 'attempted v2' } }),
      { name: 'QuotaExceededError' },
    );
  });
  assert.equal((await vault.getDraft('quota-draft')).content.body, 'committed v1');
  const retry = await vault.saveDraft({ draftId: 'quota-draft', expectedVersion: 1, content: { body: 'retried v2' } });
  assert.equal(retry.version, 2);
  assert.equal(retry.content.body, 'retried v2');
});

test('new draft promotion atomically creates an original and removes only the draft', async () => {
  const vault = new LocalVault(session().value);
  await vault.saveDraft({ draftId: 'new-record', expectedVersion: null, content: { title: 'Title', body: 'First saved original' } });
  const promoted = await vault.finalizeDraft({ draftId: 'new-record', expectedVersion: 1 });
  assert.equal(promoted.recordId, 'new-record');
  assert.equal(promoted.revisionId, 'new-record');
  assert.equal(promoted.kind, 'original');
  assert.deepEqual(promoted.content, { title: 'Title', body: 'First saved original' });
  assert.equal(await vault.getDraft('new-record'), null);
  assert.deepEqual((await vault.listRevisions('new-record')).map((revision) => revision.revisionId), ['new-record']);
});

test('finalization snapshots requested record and revision IDs before asynchronous reads', async () => {
  const vault = new LocalVault(session().value);
  await vault.saveDraft({ draftId: 'input-snapshot', expectedVersion: null, content: { body: 'private' } });
  const input = { draftId: 'input-snapshot', expectedVersion: 1, recordId: 'chosen-record', revisionId: 'chosen-revision' };
  const finalizing = vault.finalizeDraft(input);
  input.recordId = 'mutated-record';
  input.revisionId = 'mutated-revision';
  const result = await finalizing;
  assert.equal(result.recordId, 'chosen-record');
  assert.equal(result.revisionId, 'chosen-revision');
});

test('promotion abort preserves the draft and creates no partial original or head; retry commits once', async () => {
  const vault = new LocalVault(session().value);
  await vault.saveDraft({ draftId: 'atomic-new', expectedVersion: null, content: { body: 'recoverable content' } });
  await injectStoreRequestFailure('revisions', 'add', 'AbortError', async () => {
    await assert.rejects(
      () => vault.finalizeDraft({ draftId: 'atomic-new', expectedVersion: 1 }),
      { name: 'AbortError' },
    );
  });

  assert.equal((await vault.getDraft('atomic-new')).content.body, 'recoverable content');
  assert.equal(await vault.getLatest('atomic-new'), null);
  assert.deepEqual(await vault.listRecords(), []);

  const promoted = await vault.finalizeDraft({ draftId: 'atomic-new', expectedVersion: 1 });
  assert.equal(promoted.revisionId, 'atomic-new');
  assert.equal((await vault.listRecords()).length, 1);
  assert.equal(await vault.getDraft('atomic-new'), null);
  await assert.rejects(() => vault.finalizeDraft({ draftId: 'atomic-new', expectedVersion: 1 }), LocalVaultConflictError);
  assert.equal((await vault.listRevisions('atomic-new')).length, 1);
});

test('targeted draft promotion appends without changing the exact original', async () => {
  const vault = new LocalVault(session().value);
  const original = await vault.createOriginal({ recordId: 'record', revisionId: 'original', provenance: 'user-captured', content: { title: 'Exact original', body: 'before edits' } });
  await vault.saveDraft({ draftId: 'edit-draft', expectedVersion: null, target: { recordId: 'record', parentRevisionId: 'original' }, content: { title: 'Edited title', body: 'annotation' } });
  const promoted = await vault.finalizeDraft({ draftId: 'edit-draft', expectedVersion: 1 });
  assert.equal(promoted.parentRevisionId, 'original');
  assert.equal(promoted.kind, 'derived');
  assert.deepEqual((await vault.getRevision('record', 'original')).content, original.content);
  assert.deepEqual((await vault.listRevisions('record')).map((revision) => revision.revisionId), ['original', 'edit-draft:v1']);
  assert.equal(await vault.getDraft('edit-draft'), null);
});

test('stale target or changed draft fails finalization and preserves the recovery snapshot', async () => {
  const vault = new LocalVault(session().value);
  await vault.createOriginal({ recordId: 'record', revisionId: 'v1', provenance: 'user-authored', content: 'original' });
  await vault.saveDraft({ draftId: 'edit', expectedVersion: null, target: { recordId: 'record', parentRevisionId: 'v1' }, content: 'private edit' });
  await vault.appendDerived({ recordId: 'record', revisionId: 'v2', parentRevisionId: 'v1', content: 'other concurrent edit' });
  await assert.rejects(() => vault.finalizeDraft({ draftId: 'edit', expectedVersion: 1 }), LocalVaultConflictError);
  assert.equal((await vault.getDraft('edit')).content, 'private edit');

  await vault.saveDraft({ draftId: 'edit', expectedVersion: 1, target: { recordId: 'record', parentRevisionId: 'v2' }, content: 'latest local edit' });
  await assert.rejects(() => vault.finalizeDraft({ draftId: 'edit', expectedVersion: 1 }), LocalVaultConflictError);
  assert.equal((await vault.getDraft('edit')).version, 2);
  assert.equal((await vault.getDraft('edit')).content, 'latest local edit');
});
