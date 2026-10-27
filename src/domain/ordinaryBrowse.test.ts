import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Entry } from './journal.ts';
import { filterOrdinaryEntries, findCuratedDeck, findCuratedDeckEntries } from './ordinaryBrowse.ts';

const entries: Entry[] = [
  {
    id: 'journal-1', title: 'Evening notes', body: 'Tea by the garden gate.', kind: 'Journal',
    date: '2026-10-25T18:00:00.000Z', timeStr: '18:00', wordsCount: 5, groupDate: 'Yesterday',
    tags: ['Reflection'], favorite: false, protected: false,
  },
  {
    id: 'story-1', title: 'Blue Moon', body: 'A quiet walk after rain.', kind: 'Story',
    date: '2026-10-24T18:00:00.000Z', timeStr: '18:00', wordsCount: 5, groupDate: 'Earlier',
    tags: ['Night Walk'], favorite: false, protected: false, curatedDeck: 'Moonlight',
  },
  {
    id: 'story-2', title: 'Lanterns', body: 'The path was bright.', kind: 'Story',
    date: '2026-10-23T18:00:00.000Z', timeStr: '18:00', wordsCount: 4, groupDate: 'Earlier',
    tags: ['Reflection'], favorite: false, protected: false, curatedDeck: 'Moonlight',
  },
  {
    id: 'protected-1', title: 'Private David record', body: 'Secret keyword hidden.', kind: 'Journal',
    date: '2026-10-22T18:00:00.000Z', timeStr: '18:00', wordsCount: 4, groupDate: 'Earlier',
    tags: ['PrivateTag'], favorite: false, protected: true,
  },
];

test('ordinary browse searches title, body and tags case-insensitively and trims the query', () => {
  assert.deepEqual(filterOrdinaryEntries(entries, ' BLUE moon ').map(entry => entry.id), ['story-1']);
  assert.deepEqual(filterOrdinaryEntries(entries, 'GARDEN').map(entry => entry.id), ['journal-1']);
  assert.deepEqual(filterOrdinaryEntries(entries, 'night WALK').map(entry => entry.id), ['story-1']);
});

test('ordinary browse filters All, Journal and Stories categories', () => {
  assert.deepEqual(filterOrdinaryEntries(entries).map(entry => entry.id), ['journal-1', 'story-1', 'story-2']);
  assert.deepEqual(filterOrdinaryEntries(entries, '', 'Journal').map(entry => entry.id), ['journal-1']);
  assert.deepEqual(filterOrdinaryEntries(entries, '', 'Stories').map(entry => entry.id), ['story-1', 'story-2']);
});

test('protected titles, bodies and tags never appear in ordinary browse or search', () => {
  for (const term of ['David', 'secret keyword', 'PrivateTag']) {
    assert.deepEqual(filterOrdinaryEntries(entries, term), []);
  }
});

test('curated deck summary reflects actual matching entries and is absent without a deck', () => {
  assert.deepEqual(findCuratedDeck(filterOrdinaryEntries(entries)), {
    name: 'Moonlight', count: 2, entry: entries[1],
  });
  assert.equal(findCuratedDeck(filterOrdinaryEntries(entries, 'garden')), null);
});

test('curated Story entries form a chronological reading sequence without protected or Journal records', () => {
  const protectedStory: Entry = { ...entries[2]!, id: 'protected-story', title: 'Hidden', protected: true, date: '2026-10-20T18:00:00.000Z' };
  const journalWithLegacyDeck: Entry = { ...entries[0]!, id: 'journal-deck', kind: 'Journal', curatedDeck: 'Moonlight' };
  assert.deepEqual(findCuratedDeckEntries([...entries, protectedStory, journalWithLegacyDeck], ' Moonlight ').map(entry => entry.id), ['story-2', 'story-1']);
  assert.deepEqual(findCuratedDeckEntries(entries, '  '), []);
});
