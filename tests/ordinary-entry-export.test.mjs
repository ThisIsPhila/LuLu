import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareOrdinaryEntryExport } from '../src/services/ordinaryEntryExport.ts';

test('ordinary export emits only a saved-source whitelist with a generic filename', async () => {
  const entry = {
    id: 'entry-1', title: 'Saved title', body: 'Saved source body.', kind: 'Story', date: '2026-10-26T03:00:00.000Z', tags: ['garden'],
    protected: false, originalBody: 'private original', entities: [{ original: 'Private name' }], entitiesRecognized: ['Private name'],
    perspective: 'third', imageUrl: 'https://example.invalid/private.png', curatedDeck: 'fictional', favorite: true,
  };
  const result = prepareOrdinaryEntryExport(entry);
  assert.equal(result.fileName, 'lulu-ordinary-entry.json');
  const payload = JSON.parse(await result.blob.text());
  assert.deepEqual(payload, {
    id: 'entry-1', title: 'Saved title', body: 'Saved source body.', kind: 'Story', date: '2026-10-26T03:00:00.000Z', tags: ['garden'],
  });
  for (const excluded of ['private original', 'Private name', 'entities', 'imageUrl', 'favorite', 'protected']) {
    assert.equal(result.blob.size > 0 && (await result.blob.text()).includes(excluded), false, `${excluded} must not be exported`);
  }
});

test('ordinary export rejects protected records and invalid saved fields', () => {
  const base = { id: 'entry', title: 'Title', body: 'Body', kind: 'Journal', date: '2026-10-26T03:00:00.000Z', protected: false };
  assert.throws(() => prepareOrdinaryEntryExport({ ...base, protected: true }), /Only saved ordinary/);
  assert.throws(() => prepareOrdinaryEntryExport({ ...base, kind: 'Private' }), /cannot be exported/);
  assert.throws(() => prepareOrdinaryEntryExport({ ...base, date: 'not-a-date' }), /cannot be exported/);
});
