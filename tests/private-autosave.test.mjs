import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateDraftAutosave } from '../src/services/privateDraftAutosave.ts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function content(title, body) {
  return { format: 'lulu-private-text-v1', mediaType: 'text/plain', title, body, languages: [] };
}

function fakeStore(overrides = {}) {
  const calls = [];
  const drafts = new Map();
  const store = {
    calls,
    drafts,
    async saveDraft(input) {
      calls.push(structuredClone(input));
      const existing = drafts.get(input.draftId);
      const expected = existing?.version ?? null;
      if (input.expectedVersion !== expected) {
        const error = new Error('conflict');
        error.name = 'LocalVaultConflictError';
        throw error;
      }
      const saved = { ownerId: 'owner', draftId: input.draftId, version: (existing?.version ?? 0) + 1,
        content: structuredClone(input.content), ...(input.target ? { target: structuredClone(input.target) } : {}), clientUpdatedAt: new Date().toISOString() };
      drafts.set(input.draftId, saved);
      return saved;
    },
    async getDraft(id) { return drafts.get(id) ?? null; },
    async listDrafts() { return [...drafts.values()]; },
    async finalizeDraft(input) {
      if (overrides.finalizeDraft) return overrides.finalizeDraft(input, drafts);
      const draft = drafts.get(input.draftId);
      if (!draft || draft.version !== input.expectedVersion) {
        const error = new Error('conflict'); error.name = 'LocalVaultConflictError'; throw error;
      }
      drafts.delete(input.draftId);
      return { ownerId: 'owner', recordId: 'record', revisionId: 'revision', content: draft.content };
    },
    ...overrides,
  };
  return store;
}

test('serializes writes, coalesces rapid edits, and flush waits for the latest accepted snapshot', async () => {
  const first = deferred();
  const second = deferred();
  const writes = [];
  const vault = fakeStore({ saveDraft(input) { writes.push(structuredClone(input)); return writes.length === 1 ? first.promise : second.promise; } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('First', 'one'));
  controller.acceptSnapshot(content('Second', 'two'));
  const latest = content('Final', 'exact\ntext 🌿');
  controller.acceptSnapshot(latest);
  latest.body = 'mutated after acceptance';
  const flushed = controller.flush();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].expectedVersion, null);
  assert.equal(writes[0].content.body, 'one');
  first.resolve({ ownerId: 'owner', draftId: 'draft', version: 1, content: writes[0].content, clientUpdatedAt: 'now' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(writes.length, 2);
  assert.equal(writes[1].expectedVersion, 1);
  assert.equal(writes[1].content.title, 'Final');
  assert.equal(writes[1].content.body, 'exact\ntext 🌿');
  second.resolve({ ownerId: 'owner', draftId: 'draft', version: 2, content: writes[1].content, clientUpdatedAt: 'now' });
  await flushed;
  assert.equal(writes.length, 2);
  assert.equal(controller.status.state, 'saved');
});

test('stop drops queued snapshots and ignores late vault acknowledgements and callbacks', async () => {
  const first = deferred();
  const calls = [];
  const statuses = [];
  const vault = fakeStore({ saveDraft(input) { calls.push(structuredClone(input)); return first.promise; } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, onStatus: (state) => statuses.push(state) });
  controller.acceptSnapshot(content('one', 'first'));
  controller.acceptSnapshot(content('two', 'queued'));
  controller.stop();
  const countBeforeLateAcknowledgement = statuses.length;
  first.resolve({ ownerId: 'owner', draftId: 'draft', version: 1, content: content('one', 'first'), clientUpdatedAt: 'now' });
  await new Promise((resolve) => setImmediate(resolve));
  controller.acceptSnapshot(content('three', 'after stop'));
  await assert.rejects(controller.flush(), /stopped/i);
  assert.equal(calls.length, 1);
  assert.equal(statuses.length, countBeforeLateAcknowledgement);
  assert.equal(controller.status.state, 'stopped');
});

test('quota error keeps the newest snapshot in memory for an explicit retry and exposes no text', async () => {
  let attempt = 0;
  const vault = fakeStore({ async saveDraft(input) {
    attempt += 1;
    if (attempt === 1) { const error = new Error('private words must never appear'); error.name = 'QuotaExceededError'; throw error; }
    const saved = { ownerId: 'owner', draftId: input.draftId, version: 1, content: structuredClone(input.content), clientUpdatedAt: 'now' };
    vault.drafts.set(input.draftId, saved);
    return saved;
  } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'secret body')); 
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.status.state, 'error');
  assert.equal(controller.status.kind, 'quota');
  assert.equal(controller.status.draftId, 'draft');
  assert.equal(controller.status.version, null);
  assert.equal(controller.status.message, 'This device is low on storage. Free space, then retry saving.');
  assert.equal(JSON.stringify(controller.status).includes('secret body'), false);
  controller.acceptSnapshot(content('updated title', 'new secret body'));
  await controller.retry();
  assert.equal(vault.drafts.get('draft').content.body, 'new secret body');
  assert.equal(controller.status.state, 'saved');
});

test('a compare-and-swap conflict is surfaced and never blindly retried', async () => {
  let calls = 0;
  const vault = fakeStore({ async saveDraft() { calls += 1; const error = new Error('conflict'); error.name = 'LocalVaultConflictError'; throw error; } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: 3 });
  controller.acceptSnapshot(content('title', 'latest content'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.status.state, 'error');
  assert.equal(controller.status.kind, 'conflict');
  await assert.rejects(controller.retry(), /reopen it/i);
  controller.acceptSnapshot(content('title', 'newer content'));
  await assert.rejects(controller.flush(), /reopen it/i);
  assert.equal(calls, 1);
});

test('finalization retains the draft after failure and clears it only after storage acknowledgement', async () => {
  let shouldFail = true;
  let observedAtFinalize;
  let vault;
  vault = fakeStore({ async finalizeDraft(input) {
    observedAtFinalize = structuredClone(vault.drafts.get(input.draftId));
    if (shouldFail) throw new Error('opaque storage failure');
    vault.drafts.delete(input.draftId);
    return { ownerId: 'owner', recordId: 'record', revisionId: 'revision', content: observedAtFinalize.content };
  } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'persisted exact text'));
  await controller.flush();
  await assert.rejects(controller.finalize(), /Private storage could not finish saving/i);
  assert.equal(vault.drafts.get('draft').content.body, 'persisted exact text');
  assert.equal(controller.status.state, 'error');
  shouldFail = false;
  const revision = await controller.finalize();
  assert.equal(revision.content.body, 'persisted exact text');
  assert.equal(observedAtFinalize.content.body, 'persisted exact text');
  assert.equal(vault.drafts.has('draft'), false);
  assert.equal(controller.status.state, 'finalized');
  controller.acceptSnapshot(content('ignored', 'after finalization'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(vault.drafts.has('draft'), false);
});

test('blank-body drafts autosave, but finalization refuses them without deleting their draft', async () => {
  const vault = fakeStore();
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title only', '  \n'));
  await controller.flush();
  await assert.rejects(controller.finalize(), /Write some text/i);
  assert.equal(vault.drafts.get('draft').content.body, '  \n');
  controller.acceptSnapshot(content('title only', 'now there is text'));
  await controller.flush();
  assert.equal(controller.status.state, 'saved');
  assert.equal(vault.drafts.get('draft').content.body, 'now there is text');
});

test('resuming requires the persisted version that protects against blind replacement', () => {
  const vault = fakeStore();
  assert.throws(() => createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, initialContent: content('title', 'body') }), /requires its saved version/i);
});

test('invalid latest snapshot blocks flush and finalize after an earlier snapshot was saved, then a valid edit recovers', async () => {
  let finalizeCalls = 0;
  const vault = fakeStore({ async finalizeDraft(input, drafts) { finalizeCalls += 1; return drafts.get(input.draftId); } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'committed body'));
  await controller.flush();
  controller.acceptSnapshot({ body: 'must not serialize', toJSON() { throw new Error('do not invoke'); } });
  await assert.rejects(controller.flush(), /could not be saved/i);
  await assert.rejects(controller.finalize(), /could not be saved/i);
  assert.equal(finalizeCalls, 0);
  assert.equal(controller.status.state, 'error');
  assert.equal(controller.status.stage, 'draft');
  controller.acceptSnapshot(content('title', 'replacement valid body'));
  await controller.flush();
  assert.equal(controller.status.state, 'saved');
  assert.equal(vault.drafts.get('draft').version, 2);
  assert.equal(vault.drafts.get('draft').content.body, 'replacement valid body');
});

test('invalid latest snapshot during an earlier in-flight save never reports that older write as saved', async () => {
  const inFlight = deferred();
  const statuses = [];
  const vault = fakeStore({ saveDraft(input) { return inFlight.promise.then(() => ({
    ownerId: 'owner', draftId: input.draftId, version: 1, content: input.content, clientUpdatedAt: 'now',
  })); } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, onStatus: (state) => statuses.push(state) });
  controller.acceptSnapshot(content('title', 'in flight'));
  const pendingFlush = controller.flush();
  controller.acceptSnapshot({ body: 'invalid', get title() { throw new Error('getter must not run'); } });
  await assert.rejects(pendingFlush, /could not be saved/i);
  inFlight.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.status.state, 'error');
  assert.equal(statuses.some((state) => state.state === 'saved'), false);
  assert.equal(statuses.at(-1).stage, 'draft');
});

test('record-stage failures route through finalize again instead of retrying draft save', async () => {
  let fail = true;
  const vault = fakeStore({ async finalizeDraft(input) {
    if (fail) { const error = new Error('record quota'); error.name = 'QuotaExceededError'; throw error; }
    return { ownerId: 'owner', recordId: input.recordId ?? 'record', revisionId: 'revision' };
  } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'body'));
  await controller.flush();
  await assert.rejects(controller.finalize(), /low on storage/i);
  assert.equal(controller.status.state, 'error');
  assert.equal(controller.status.stage, 'record');
  const saveCount = vault.calls.length;
  await assert.rejects(controller.retry(), /Retry saving the private record/i);
  assert.equal(vault.calls.length, saveCount);
  fail = false;
  await controller.finalize();
  assert.equal(controller.status.state, 'finalized');
});

test('snapshot copying rejects accessors without invoking them', async () => {
  let invoked = false;
  const value = { format: 'lulu-private-text-v1', mediaType: 'text/plain', title: 'x', languages: [] };
  Object.defineProperty(value, 'body', { enumerable: true, get() { invoked = true; return 'secret'; } });
  const vault = fakeStore();
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(value);
  await assert.rejects(controller.flush(), /current form/i);
  assert.equal(invoked, false);
  assert.equal(vault.calls.length, 0);
});

test('valid edits after a record-stage quota failure clear the record error and autosave the mutable draft', async () => {
  let failFinalize = true;
  const vault = fakeStore({ async finalizeDraft() {
    if (failFinalize) { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; }
    return { ownerId: 'owner', recordId: 'draft', revisionId: 'draft' };
  } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'saved once'));
  await controller.flush();
  await assert.rejects(controller.finalize(), /low on storage/i);
  assert.equal(controller.status.state, 'error');
  assert.equal(controller.status.stage, 'record');
  controller.acceptSnapshot(content('title', 'new text after failed promotion'));
  await controller.flush();
  assert.equal(controller.status.state, 'saved');
  assert.equal(controller.status.version, 2);
  assert.equal(vault.drafts.get('draft').content.body, 'new text after failed promotion');
  failFinalize = false;
  await controller.finalize();
  assert.equal(controller.status.state, 'finalized');
});

test('valid edits after stale-target promotion conflict still autosave the retained draft', async () => {
  const vault = fakeStore({ async finalizeDraft() { const error = new Error('stale target'); error.name = 'LocalVaultConflictError'; throw error; } });
  const target = { recordId: 'record', parentRevisionId: 'old-head' };
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, target });
  controller.acceptSnapshot(content('title', 'first version'));
  await controller.flush();
  await assert.rejects(controller.finalize(), /changed elsewhere/i);
  assert.equal(controller.status.stage, 'record');
  controller.acceptSnapshot(content('title', 'preserved edit'));
  await controller.flush();
  assert.equal(vault.calls.length, 2);
  assert.equal(vault.calls[1].expectedVersion, 1);
  assert.deepEqual(vault.calls[1].target, target);
  assert.equal(vault.drafts.get('draft').content.body, 'preserved edit');
  assert.equal(controller.status.state, 'saved');
});

function finalizedRevision({ recordId = 'draft', revisionId = 'draft', body = 'exact body', kind = 'original', parentRevisionId = null, ownerId = 'owner' } = {}) {
  return { ownerId, recordId, revisionId, parentRevisionId, kind, provenance: kind === 'original' ? 'user-authored' : null,
    content: content('title', body), clientCreatedAt: 'now', sha256: 'hash' };
}

test('lost finalize acknowledgement reconciles only an exact existing revision', async () => {
  const vault = fakeStore({
    async finalizeDraft() { this.drafts.delete('draft'); throw new Error('ack lost'); },
    async getRevision(recordId, revisionId) {
      assert.equal(recordId, 'draft');
      assert.equal(revisionId, 'draft');
      return finalizedRevision();
    },
  });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, ownerId: 'owner' });
  controller.acceptSnapshot(content('title', 'exact body'));
  await controller.flush();
  const revision = await controller.finalize();
  assert.equal(revision.recordId, 'draft');
  assert.equal(controller.status.state, 'finalized');
});

test('finalization IDs are captured before flush yields and content comparison ignores object key order', async () => {
  const save = deferred();
  let finalizationInput;
  const vault = fakeStore({
    saveDraft(input) { return save.promise.then(() => ({ ownerId: 'owner', draftId: input.draftId, version: 1, content: input.content })); },
    async finalizeDraft(input) { finalizationInput = input; throw new Error('ack lost'); },
    async getRevision() {
      return { ...finalizedRevision({ recordId: 'requested-record', revisionId: 'requested-revision' }),
        content: { languages: [], body: 'exact body', title: 'title', mediaType: 'text/plain', format: 'lulu-private-text-v1' } };
    },
  });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'exact body'));
  const input = { recordId: 'requested-record', revisionId: 'requested-revision' };
  const pending = controller.finalize(input);
  input.recordId = 'mutated-record';
  input.revisionId = 'mutated-revision';
  save.resolve();
  const revision = await pending;
  assert.equal(finalizationInput.recordId, 'requested-record');
  assert.equal(finalizationInput.revisionId, 'requested-revision');
  assert.equal(revision.recordId, 'requested-record');
  assert.equal(controller.status.state, 'finalized');
});

test('resumed targeted draft uses its actual storage version in the default revision ID', async () => {
  let inputSeen;
  const target = { recordId: 'record', parentRevisionId: 'head-6' };
  const vault = fakeStore({ async finalizeDraft(input) {
    inputSeen = input;
    return { ownerId: 'owner', recordId: input.recordId, revisionId: input.revisionId, parentRevisionId: target.parentRevisionId, kind: 'derived', provenance: null };
  } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: 7,
    initialContent: content('title', 'saved text'), target });
  await controller.finalize();
  assert.equal(inputSeen.expectedVersion, 7);
  assert.equal(inputSeen.recordId, 'record');
  assert.equal(inputSeen.revisionId, 'draft:v7');
});

test('a later record-stage error replaces an earlier quota classification', async () => {
  let next = 'quota';
  const vault = fakeStore({ async finalizeDraft() {
    const error = new Error(next);
    error.name = next === 'quota' ? 'QuotaExceededError' : 'LocalVaultConflictError';
    throw error;
  } });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null });
  controller.acceptSnapshot(content('title', 'body'));
  await controller.flush();
  await assert.rejects(controller.finalize());
  assert.equal(controller.status.kind, 'quota');
  next = 'conflict';
  await assert.rejects(controller.finalize());
  assert.equal(controller.status.kind, 'conflict');
  assert.match(controller.status.message, /changed elsewhere/i);
});

test('lost finalize acknowledgement with mismatched stored content remains an error', async () => {
  const vault = fakeStore({
    async finalizeDraft() { throw new Error('ack lost'); },
    async getRevision() { return finalizedRevision({ body: 'different body' }); },
  });
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, ownerId: 'owner' });
  controller.acceptSnapshot(content('title', 'exact body'));
  await controller.flush();
  await assert.rejects(controller.finalize(), /could not finish saving/i);
  assert.equal(controller.status.state, 'error');
  assert.equal(controller.status.stage, 'record');
});

test('stopping during lost-ack lookup suppresses reconciliation success and later status callbacks', async () => {
  const lookup = deferred();
  const lookupStarted = deferred();
  const vault = fakeStore({
    async finalizeDraft() { throw new Error('ack uncertain'); },
    getRevision() { lookupStarted.resolve(); return lookup.promise; },
  });
  const statuses = [];
  const controller = createPrivateDraftAutosave({ vault, draftId: 'draft', expectedVersion: null, onStatus: (state) => statuses.push(state) });
  controller.acceptSnapshot(content('title', 'exact body'));
  await controller.flush();
  const pending = controller.finalize();
  await lookupStarted.promise;
  controller.stop();
  const countAfterStop = statuses.length;
  lookup.resolve(finalizedRevision());
  await assert.rejects(pending, /stopped/i);
  assert.equal(statuses.length, countAfterStop);
  assert.equal(controller.status.state, 'stopped');
});
