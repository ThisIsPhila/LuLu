import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJournal, writeJournal, JOURNAL_STORAGE_KEY, type JournalSnapshot, type StoragePort } from '../services/journalStorage.ts';
import { correctAlias, searchJournal } from './continuity.ts';
import { transform, initialEntities } from './transform.ts';
import { loadEntries } from './journal.ts';
const defaults: JournalSnapshot = { version: 1, entities: initialEntities, entries: [
  { id: 'synthetic-1', title: 'Synthetic record', body: 'John went to the Nest.', originalBody: 'David went to my home.', kind: 'Journal', date: '2026-10-24T10:00:00Z', protected: true, favorite: false, perspective: 'first' },
  { id: 'synthetic-2', title: 'Ordinary record', body: 'David went home.', kind: 'Story', date: '2026-10-24T11:00:00Z', protected: false, favorite: false },
] };
function memory(raw: string | null = null) {
  const data = new Map<string, string>(raw === null ? [] : [[JOURNAL_STORAGE_KEY, raw]]);
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
function read(storage: StoragePort) {
  const result = readJournal(storage, defaults);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

test('legacy entry loader preserves valid records and uses an empty list for absent or invalid data', () => {
  assert.deepEqual(loadEntries({ getItem: () => null }), []);
  assert.deepEqual(loadEntries({ getItem: () => '[]' }), []);
  assert.deepEqual(loadEntries({ getItem: () => '{broken' }), []);
  assert.deepEqual(loadEntries({ getItem: () => JSON.stringify([{ ...defaults.entries[0], body: 4 }]) }), []);
  assert.deepEqual(loadEntries({ getItem: () => JSON.stringify(defaults.entries) }), defaults.entries);
});

test('missing storage returns independent defaults without writing', () => {
  const storage = memory();
  const loaded = read(storage);
  loaded.entries[0].body = 'changed';
  assert.equal(storage.getItem(JOURNAL_STORAGE_KEY), null);
  assert.notEqual(defaults.entries[0].body, 'changed');
});
test('legacy arrays migrate on explicit save; deleting everything stays empty on reload', () => {
  const storage = memory(JSON.stringify(defaults.entries));
  assert.deepEqual(read(storage).entries, defaults.entries);
  assert.equal(writeJournal(storage, { ...read(storage), entries: [] }).ok, true);
  assert.deepEqual(read(storage).entries, []);
  assert.equal(JSON.parse(storage.getItem(JOURNAL_STORAGE_KEY)!).version, 1);
});
test('malformed, duplicate and future-version data are retained and cannot be overwritten', () => {
  for (const raw of ['{broken', '{}', JSON.stringify([{ ...defaults.entries[0], body: 12 }]), JSON.stringify([defaults.entries[0], defaults.entries[0]]), JSON.stringify({ ...defaults, version: 2 })]) {
    const storage = memory(raw);
    assert.deepEqual(readJournal(storage, defaults), { ok: false, error: 'invalid-data' });
    assert.equal(writeJournal(storage, defaults).ok, false);
    assert.equal(storage.getItem(JOURNAL_STORAGE_KEY), raw);
  }
});
test('read and quota failures are observable without changing saved bytes', () => {
  assert.deepEqual(readJournal({ getItem() { throw new Error('blocked'); }, setItem() {} }, defaults), { ok: false, error: 'unavailable' });
  const storage = memory(JSON.stringify(defaults));
  const original = storage.getItem(JOURNAL_STORAGE_KEY);
  assert.deepEqual(writeJournal({ ...storage, setItem() { throw new Error('quota'); } }, defaults), { ok: false, error: 'write-failed' });
  assert.equal(storage.getItem(JOURNAL_STORAGE_KEY), original);
});
test('invalid records or blank mappings cannot be saved', () => {
  assert.equal(writeJournal(memory(), { ...defaults, entities: [{ ...initialEntities[0], alias: '' }] }).ok, false);
  assert.equal(writeJournal(memory(), { ...defaults, entries: [{ ...defaults.entries[0], date: 'invalid' }] }).ok, false);
});
test('alias correction persists across entries and reload while preserving source and ordinary writing', () => {
  const snapshot = { ...defaults, entries: [...defaults.entries, { ...defaults.entries[0], id: 'synthetic-3' }] };
  const corrected = correctAlias(correctAlias(snapshot, 'person-david', 'Robin'), 'place-home', 'the Studio');
  assert.equal(corrected.entries[0].body, 'Robin went to the Studio.');
  assert.equal(corrected.entries[2].body, 'Robin went to the Studio.');
  assert.equal(corrected.entries[0].originalBody, snapshot.entries[0].originalBody);
  assert.deepEqual(corrected.entries[1], snapshot.entries[1]);
  assert.equal(snapshot.entries[0].body, 'John went to the Nest.');
  const storage = memory();
  assert.equal(writeJournal(storage, corrected).ok, true);
  assert.deepEqual(read(storage), corrected);
});
test('original-meaning retrieval requires explicit access; entity filters use chosen identity', () => {
  const snapshot = correctAlias(defaults, 'person-david', 'Robin');
  assert.equal(searchJournal(snapshot, 'David').some(e => e.id === 'synthetic-1'), false);
  assert.equal(searchJournal(snapshot, ' David ', { protectedAccess: true }).some(e => e.id === 'synthetic-1'), true);
  assert.equal(searchJournal(snapshot, 'Robin').length, 1);
  assert.equal(searchJournal(snapshot, '', { entityId: 'time-evening', protectedAccess: true }).length, 0);
  assert.equal(searchJournal(snapshot, '', { entityId: 'missing' }).length, 0);
});
test('correction rejects unknown or blank representations and leaves source-less legacy records intact', () => {
  assert.throws(() => correctAlias(defaults, 'missing', 'Robin'));
  assert.throws(() => correctAlias(defaults, 'person-david', ' '));
  const entry = { ...defaults.entries[0], originalBody: undefined };
  assert.deepEqual(correctAlias({ ...defaults, entries: [entry] }, 'person-david', 'Robin').entries[0], entry);
});
test('replacement does not cascade aliases, longest overlapping source wins and empty references terminate', () => {
  const entities = [
    { id: 'one', original: 'Ann', alias: 'David', type: 'Person' as const },
    { id: 'two', original: 'David', alias: 'Robin', type: 'Person' as const },
    { id: 'three', original: 'Ann Smith', alias: 'Jordan', type: 'Person' as const },
    { id: 'empty', original: '', alias: 'bad', type: 'Person' as const },
  ];
  assert.equal(transform('Ann met David and Ann Smith.', entities, { perspectiveDistancing: false }), 'David met Robin and Jordan.');
});
