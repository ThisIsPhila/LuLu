import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDemoRecord } from '../../src/services/backend/demoCatalogueRecords.ts';

test('catalogue mapping returns display-only synthetic fields and ignores source fields', () => {
  const entry = mapDemoRecord('demo-one', {
    title: 'A fictional sample',
    body: 'A short invented scene.',
    kind: 'Story',
    protected: false,
    perspective: 'third',
    tags: ['Demo'],
    createdAt: { toDate: () => new Date('2026-10-24T12:30:00.000Z') },
    originalBody: 'This field must never be returned.',
    ownerId: 'someone',
  });
  assert.equal(entry.id, 'demo-one');
  assert.equal(entry.body, 'A short invented scene.');
  assert.equal(entry.protected, false);
  assert.equal(entry.favorite, false);
  assert.deepEqual(entry.tags, ['Demo']);
  assert.equal('originalBody' in entry, false);
  assert.equal('ownerId' in entry, false);
});

test('catalogue mapping retains an ordinary Story collection label', () => {
  const entry = mapDemoRecord('demo-story', {
    title: 'The next chapter',
    body: 'Nia and Rowan return to the garden.',
    kind: 'Story',
    protected: false,
    perspective: 'third',
    curatedDeck: 'Juniper Street Garden',
    tags: ['Fiction', 'Part 2'],
    createdAt: { toDate: () => new Date('2026-10-24T12:30:00.000Z') },
  });
  assert.equal(entry.curatedDeck, 'Juniper Street Garden');
  assert.deepEqual(entry.tags, ['Fiction', 'Part 2']);
});

test('catalogue mapping refuses protected or malformed records', () => {
  const base = {
    title: 'A fictional sample',
    body: 'A short invented scene.',
    kind: 'Story',
    protected: false,
    createdAt: { toDate: () => new Date('2026-10-24T12:30:00.000Z') },
  };
  assert.throws(() => mapDemoRecord('demo-one', { ...base, protected: true }));
  assert.throws(() => mapDemoRecord('demo-one', { ...base, body: 10 }));
  assert.throws(() => mapDemoRecord('demo-one', { ...base, kind: 'Journal', curatedDeck: 'Not a Story collection' }));
});
