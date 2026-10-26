import 'fake-indexeddb/auto';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LocalVault, LocalVaultLockedError } from '../src/services/vault/localVault.ts';
import { LocalMediaVault } from '../src/services/vault/localMediaVault.ts';
import { prepareMediaExport, prepareTextExport } from '../src/services/privateExport.ts';

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

function session(ownerId = 'export-owner') {
  const state = { ownerId, generation: 1, unlocked: true };
  return {
    state,
    value: {
      get ownerId() { return state.ownerId; },
      generation: () => state.generation,
      isUnlocked: () => state.unlocked,
    },
  };
}

beforeEach(async () => {
  await deleteDb('lulu.local-vault.v1');
  await deleteDb('lulu.local-media-vault.v1');
  await deleteDb('lulu.device-vault.v1');
});

test('text export is readable and contains the complete immutable original and revision history', async () => {
  const { value } = session();
  const vault = new LocalVault(value);
  const originalContent = {
    format: 'lulu-private-text-v1', mediaType: 'text/plain', title: 'Before', body: 'The original words.', languages: ['en'],
  };
  await vault.createOriginal({
    recordId: 'text-1', revisionId: 'revision-original', provenance: 'user-authored', content: originalContent,
  });
  await vault.appendDerived({
    recordId: 'text-1', revisionId: 'revision-edited', parentRevisionId: 'revision-original',
    content: { ...originalContent, title: 'After', body: 'The edited words.' },
  });

  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => { fetchCalls += 1; return originalFetch(...args); };
  try {
    const prepared = await prepareTextExport(vault, 'text-1');
    const payload = JSON.parse(await prepared.blob.text());
    assert.equal(prepared.fileName, 'lulu-private-text-export.json');
    assert.equal(payload.format, 'lulu-readable-private-text-v1');
    assert.equal(payload.encrypted, false);
    assert.equal(payload.recoveryBackup, false);
    assert.match(payload.exportedAt, /^\d{4}-\d\d-\d\dT/);
    assert.match(payload.exportedAtNote, /device clock/);
    assert.equal(payload.recordId, 'text-1');
    assert.deepEqual(payload.revisions.map(({ revisionId }) => revisionId), ['revision-original', 'revision-edited']);
    assert.equal(payload.revisions[0].parentRevisionId, null);
    assert.equal(payload.revisions[0].provenance, 'user-authored');
    assert.equal(payload.revisions[1].parentRevisionId, 'revision-original');
    assert.equal(payload.revisions.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)), true);
    assert.deepEqual(payload.revisions.map(({ content }) => [content.title, content.body]), [
      ['Before', 'The original words.'], ['After', 'The edited words.'],
    ]);
    assert.deepEqual((await vault.getRevision('text-1', 'revision-original')).content, originalContent);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('media export is one generic file containing exactly the saved original bytes', async () => {
  const vault = new LocalMediaVault(session().value);
  const sourceBytes = Uint8Array.from([0, 255, 3, 19, 0, 128]);
  await vault.put(new Blob([sourceBytes], { type: 'image/png' }), {
    mediaId: 'image-1', title: 'Private title', source: 'file', originalName: 'identity.png',
  });
  const prepared = await prepareMediaExport(vault, 'image-1');
  assert.equal(prepared.fileName, 'lulu-private-image.png');
  assert.equal(prepared.blob.type, 'image/png');
  assert.deepEqual(new Uint8Array(await prepared.blob.arrayBuffer()), sourceBytes);
  assert.equal(prepared.blob.size, sourceBytes.length);
  assert.equal(JSON.stringify(prepared).includes('Private title'), false);
  assert.equal(JSON.stringify(prepared).includes('identity.png'), false);
});

test('locked, wrong-owner and stale sessions cannot prepare or later release text exports', async () => {
  const { value, state } = session();
  const vault = new LocalVault(value);
  await vault.createOriginal({
    recordId: 'text-locked', revisionId: 'v1', provenance: 'user-captured',
    content: { format: 'lulu-private-text-v1', mediaType: 'text/plain', title: '', body: 'Private', languages: [] },
  });
  const prepared = await prepareTextExport(vault, 'text-locked');
  state.unlocked = false;
  assert.throws(() => prepared.assertCurrent(), LocalVaultLockedError);
  await assert.rejects(prepareTextExport(vault, 'text-locked'), LocalVaultLockedError);
  state.unlocked = true;
  state.generation += 1;
  assert.throws(() => prepared.assertCurrent(), LocalVaultLockedError);

  const wrongOwner = new LocalVault(session('other-owner').value);
  await assert.rejects(prepareTextExport(wrongOwner, 'text-locked'), /not available/);
});

test('session invalidation during awaited text and media reads rejects before returning exports', async () => {
  const textSession = session();
  const textVault = new LocalVault(textSession.value);
  await textVault.createOriginal({
    recordId: 'stale-text', revisionId: 'v1', provenance: 'user-authored',
    content: { format: 'lulu-private-text-v1', mediaType: 'text/plain', title: '', body: 'Private', languages: [] },
  });
  const listRevisions = textVault.listRevisions.bind(textVault);
  textVault.listRevisions = async (recordId) => {
    const revisions = await listRevisions(recordId);
    textSession.state.generation += 1;
    return revisions;
  };
  await assert.rejects(prepareTextExport(textVault, 'stale-text'), LocalVaultLockedError);

  const mediaSession = session();
  const mediaVault = new LocalMediaVault(mediaSession.value);
  await mediaVault.put(new Blob(['private bytes'], { type: 'audio/wav' }), { mediaId: 'stale-audio', source: 'file' });
  const getMedia = mediaVault.get.bind(mediaVault);
  mediaVault.get = async (mediaId) => {
    const result = await getMedia(mediaId);
    mediaSession.state.unlocked = false;
    return result;
  };
  await assert.rejects(prepareMediaExport(mediaVault, 'stale-audio'), /Unlock the private session/);
});

test('text export rejects records that are not supported private text', async () => {
  const vault = new LocalVault(session().value);
  await vault.createOriginal({
    recordId: 'not-text', revisionId: 'v1', provenance: 'user-authored', content: { body: 'not the private text schema' },
  });
  await assert.rejects(prepareTextExport(vault, 'not-text'), /not a supported private text record/);
});
