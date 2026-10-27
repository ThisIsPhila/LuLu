import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

const { createMemoryEntityLibrary, createSessionEntityLibrary, EntityLibraryConflictError, EntityLibraryLockedError } = await import('../src/services/privacy/entityLibrary.ts');

async function deleteDb(name) {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

beforeEach(async () => {
  await deleteDb('lulu.private-entity-library.v1');
  await deleteDb('lulu.device-vault.v1');
});

function session(ownerId = 'owner-a') {
  const state = { ownerId, generation: 1, unlocked: true };
  return {
    state,
    value: { get ownerId() { return state.ownerId; }, generation: () => state.generation, isUnlocked: () => state.unlocked },
  };
}

const detection = (start, end, label = 'person') => ({ start, end, label, confidence: 0.9, detector: 'synthetic' });

test('stable alias continuity is keyed by exact normalized text and entity type', async () => {
  const library = createMemoryEntityLibrary();
  const input = '🌿 Nomsa met Nomsa at HOME.';
  const first = input.indexOf('Nomsa');
  const second = input.indexOf('Nomsa', first + 1);
  const home = input.indexOf('HOME');
  const applied = await library.apply(input, [detection(second, second + 5), detection(first, first + 5), detection(home, home + 4, 'place')]);
  assert.equal(applied.sanitised, '🌿 Person 1 met Person 1 at Place 1.');
  await library.setAlias({ text: ' nomsa ', type: 'Person', alias: 'Zinhle' });
  const corrected = await library.apply('Nomsa called.', [detection(0, 5)]);
  assert.equal(corrected.sanitised, 'Zinhle called.');
  await library.setAlias({ text: 'Nomsa', type: 'Topic', alias: 'the name' });
  assert.equal((await library.match('NOMSA', 'Person')).alias, 'Zinhle');
  assert.equal((await library.match('NOMSA', 'Topic')).alias, 'the name');
  assert.equal(await library.match('Nomsa', 'Place'), null);
});

test('encrypted session library preserves a user correction across session instances without plaintext IndexedDB fields', async () => {
  const firstSession = session();
  const first = createSessionEntityLibrary(firstSession.value);
  await first.setAlias({ text: 'David', type: 'Person', alias: 'Ari' });
  const secondSession = session();
  const reopened = createSessionEntityLibrary(secondSession.value);
  assert.equal((await reopened.match(' DAVID ', 'Person')).alias, 'Ari');

  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.private-entity-library.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const row = await new Promise((resolve, reject) => {
    const request = db.transaction('entities').objectStore('entities').get(JSON.stringify(['owner-a', 'private-entity-library']));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  // Short names can occur randomly in base64 ciphertext. Check the stored
  // schema instead of treating an accidental substring as plaintext leakage.
  assert.deepEqual(Object.keys(row).sort(), ['envelope', 'key', 'ownerId', 'version']);
  assert.deepEqual(Object.keys(row.envelope).sort(), ['ciphertext', 'iv', 'version']);
  assert.equal(row.ownerId, 'owner-a');
  assert.equal(row.key, JSON.stringify(['owner-a', 'private-entity-library']));
  assert.match(row.envelope.ciphertext, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(Buffer.from(row.envelope.iv, 'base64').byteLength, 12);
  assert.equal(row.envelope.version, 1);
});

test('locked, changed-generation and different-owner sessions cannot read or write mappings', async () => {
  const firstSession = session();
  const library = createSessionEntityLibrary(firstSession.value);
  await library.setAlias({ text: 'David', type: 'Person', alias: 'Ari' });
  firstSession.state.unlocked = false;
  await assert.rejects(() => library.match('David', 'Person'), EntityLibraryLockedError);
  await assert.rejects(() => library.setAlias({ text: 'David', type: 'Person', alias: 'Other' }), EntityLibraryLockedError);
  firstSession.state.unlocked = true;
  firstSession.state.generation++;
  await assert.rejects(() => library.load(), EntityLibraryLockedError);
  assert.equal(await createSessionEntityLibrary(session('owner-b').value).match('David', 'Person'), null);
});

test('span validation preserves UTF-16 offsets and memory demo disposal drops access', async () => {
  const library = createMemoryEntityLibrary();
  const input = '🌿 Noe\u0308l met Sam.';
  const start = input.indexOf('Sam');
  const result = await library.apply(input, [detection(start, start + 3)]);
  assert.equal(result.sanitised, '🌿 Noe\u0308l met Person 1.');
  await assert.rejects(() => library.apply(input, [detection(1, 2)]), /invalid or overlapping/i);
  library.dispose();
  await assert.rejects(() => library.load(), EntityLibraryLockedError);
});

test('demo detector categories stay distinct and normalize labels without guessing identity', async () => {
  const library = createMemoryEntityLibrary();
  const input = 'Mina lives in Midrand, works at Acme, email mina@example.invalid, phone 1234567890.';
  const spans = [
    ['Mina', 'person'], ['Midrand', 'location'], ['Acme', 'organization'],
    ['mina@example.invalid', 'email'], ['1234567890', 'phone number'],
  ].map(([text, label]) => {
    const start = input.indexOf(text);
    return detection(start, start + text.length, label);
  });
  const result = await library.apply(input, spans);
  assert.equal(result.sanitised, 'Person 1 lives in Location 1, works at Organization 1, email Email 1, phone Phone Number 1.');
  assert.deepEqual((await library.load()).entities.map(entity => entity.type), ['Person', 'Location', 'Organization', 'Email', 'Phone Number']);
});

test('date, time and relationship labels retain distinct user-correctable aliases', async () => {
  const library = createMemoryEntityLibrary();
  const input = 'Friday Friday Friday';
  const starts = [0, 7, 14];
  const labels = ['date', 'time', 'relationship'];
  const detections = starts.map((start, index) => detection(start, start + 6, labels[index]));
  assert.equal((await library.apply(input, detections)).sanitised, 'Date 1 Time 1 Relationship 1');
  await library.setAlias({ text: 'FRIDAY', type: 'date', alias: 'the night of the event' });
  const changed = await library.apply(input, detections);
  assert.equal(changed.sanitised, 'the night of the event Time 1 Relationship 1');
  assert.equal((await library.match('Friday', 'Date')).alias, 'the night of the event');
  assert.equal((await library.match('Friday', 'Time')).alias, 'Time 1');
  assert.equal((await library.match('Friday', 'Relationship')).alias, 'Relationship 1');
});

test('concurrent snapshots conflict and in-flight memory reads fail after disposal', async () => {
  const owner = session();
  const first = createSessionEntityLibrary(owner.value);
  const second = createSessionEntityLibrary(owner.value);
  await Promise.all([first.load(), second.load()]);
  await first.setAlias({ text: 'Nomsa', type: 'person', alias: 'Ari' });
  await assert.rejects(() => second.setAlias({ text: 'Sipho', type: 'person', alias: 'Bee' }), EntityLibraryConflictError);

  const demo = createMemoryEntityLibrary();
  await demo.setAlias({ text: 'Mina', type: 'person', alias: 'Cee' });
  const pending = demo.load();
  demo.dispose();
  await assert.rejects(() => pending, EntityLibraryLockedError);
});
