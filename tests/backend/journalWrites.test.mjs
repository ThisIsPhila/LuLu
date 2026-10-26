import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { saveEntry, updateEntry } from '../../src/services/backend/journal.ts';

let env;
const [emulatorHost, emulatorPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085').split(':');
const session = { uid: 'alice', expiresAt: Date.now() + 3600000, privateUntil: Date.now() + 600000 };
const db = (uid = 'alice', sid = 'session') => env.authenticatedContext(uid, { passkey: true, sid }).firestore();
const ordinary = (overrides = {}) => ({
  title: 'A journal thought', body: 'Rain crossed the garden.', originalBody: 'Rain crossed the garden.',
  protected: false, entities: [], ...overrides,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lulu-journal-writes',
    firestore: {
      host: emulatorHost,
      port: Number(emulatorPort),
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});
after(async () => {
  await env?.cleanup();
  const request = indexedDB.deleteDatabase('lulu.device-vault.v1');
  await new Promise(resolve => { request.onsuccess = request.onerror = request.onblocked = resolve; });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), '_sessions/session'), session);
  });
});

test('saveEntry stores the chosen ordinary kind and defaults older callers to Journal', async () => {
  const firestore = db();
  await saveEntry('alice', ordinary({ kind: 'Story', title: 'Blue Moon' }), firestore);
  await saveEntry('alice', ordinary({ title: 'Evening notes' }), firestore);

  const records = (await getDocs(query(collection(firestore, 'users/alice/entries'), limit(100)))).docs.map(snapshot => snapshot.data());
  assert.deepEqual(records.map(record => [record.title, record.kind]).sort(), [
    ['Blue Moon', 'Story'],
    ['Evening notes', 'Journal'],
  ]);
  assert.equal(records.every(record => record.ownerId === 'alice' && record.protected === false), true);
});

test('updateEntry can reclassify an ordinary entry and omission preserves its current kind', async () => {
  const firestore = db();
  const ref = doc(firestore, 'users/alice/entries/change-kind');
  await setDoc(ref, {
    ownerId: 'alice', title: 'Original title', body: 'Original body.', kind: 'Journal', protected: false,
    perspective: 'first', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  await updateEntry('alice', 'change-kind', { title: 'A story', body: 'Revised prose.', kind: 'Story' }, firestore);
  let saved = (await getDoc(ref)).data();
  assert.equal(saved.kind, 'Story');
  assert.equal(saved.body, 'Revised prose.');

  await updateEntry('alice', 'change-kind', { title: 'A story again', body: 'Another revision.' }, firestore);
  saved = (await getDoc(ref)).data();
  assert.equal(saved.kind, 'Story');
});

test('unsupported kinds are rejected before writes', async () => {
  const firestore = db();
  await assert.rejects(saveEntry('alice', ordinary({ kind: 'Admin' }), firestore), /Choose Journal or Story/);
  await assert.rejects(updateEntry('alice', 'missing-entry', { title: 'Title', body: 'Body.', kind: 'Admin' }, firestore), /choose Journal or Story/);
  assert.equal((await getDocs(query(collection(firestore, 'users/alice/entries'), limit(100)))).size, 0);
});

test('protected records retain generic display fields and keep source material in ciphertext', async () => {
  const firestore = db();
  await saveEntry('alice', {
    title: 'Private title Alice original', body: 'A concealed sentence.', originalBody: 'Alice original source words.',
    entities: [{ id: 'person-alice', original: 'Alice', alias: 'a friend', type: 'Person' }],
    kind: 'Story', protected: true,
  }, firestore);
  const records = (await getDocs(query(collection(firestore, 'users/alice/entries'), limit(100)))).docs;
  assert.equal(records.length, 1);
  const display = records[0].data();
  assert.equal(display.kind, 'Journal');
  assert.equal(display.title, 'Journal entry');
  assert.equal(display.body, 'A concealed sentence.');
  assert.deepEqual(Object.keys(display).sort(), ['body', 'createdAt', 'kind', 'ownerId', 'perspective', 'protected', 'title', 'updatedAt'].sort());

  const privateRecord = await getDoc(doc(firestore, 'users/alice/private', records[0].id));
  assert.equal(privateRecord.exists(), true);
  assert.equal('ciphertext' in privateRecord.data(), true);
  assert.equal(JSON.stringify(privateRecord.data()).includes('Alice original source words.'), false);
});

test('another account cannot save into or reclassify the owner journal', async () => {
  const ownerDb = db();
  const ref = doc(ownerDb, 'users/alice/entries/ordinary');
  await setDoc(ref, {
    ownerId: 'alice', title: 'Owner entry', body: 'Owner text.', kind: 'Journal', protected: false,
    perspective: 'first', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  await assert.rejects(saveEntry('alice', ordinary({ kind: 'Story' }), db('bob', 'bob-session')));
  await assert.rejects(updateEntry('alice', 'ordinary', { title: 'Changed', body: 'Changed.', kind: 'Story' }, db('bob', 'bob-session')));
  const saved = (await getDoc(ref)).data();
  assert.equal(saved.title, 'Owner entry');
  assert.equal(saved.kind, 'Journal');
});

test('protected entries cannot be reclassified through the ordinary update path', async () => {
  const firestore = db();
  const ref = doc(firestore, 'users/alice/entries/protected');
  await setDoc(ref, {
    ownerId: 'alice', title: 'Journal entry', body: 'Concealed text.', kind: 'Journal', protected: true,
    perspective: 'third', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  await assert.rejects(updateEntry('alice', 'protected', { title: 'Story title', body: 'Changed.', kind: 'Story' }, firestore), /Protected entries/);
  assert.equal((await getDoc(ref)).data().kind, 'Journal');
});
