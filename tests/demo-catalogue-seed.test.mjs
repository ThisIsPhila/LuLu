import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const catalogue = JSON.parse(readFileSync(new URL('../scripts/demo-catalogue-seed.json', import.meta.url), 'utf8'));

test('starter catalogue is bounded, complete and maps every manifest ID once', () => {
  const { entryIds } = catalogue.manifest;
  assert.equal(catalogue.catalogueId, 'johannesburg-v1');
  assert.equal(catalogue.source, 'fictional-demo-content');
  assert.equal(entryIds.length, 10);
  assert.equal(new Set(entryIds).size, entryIds.length);
  assert.deepEqual(catalogue.entries.map(entry => entry.id), entryIds);
  for (const entry of catalogue.entries) {
    assert.ok(entry.title.length > 8);
    assert.ok(entry.body.split(/\s+/).length >= 65, `${entry.id} should have substantial content`);
    assert.equal(entry.protected, false);
    assert.ok(['Journal', 'Story'].includes(entry.kind));
    assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0);
    assert.ok(Number.isFinite(Date.parse(entry.createdAt)));
  }
});

test('story collections have coherent multi-part membership and chronological parts', () => {
  const stories = catalogue.entries.filter(entry => entry.kind === 'Story');
  const collections = Map.groupBy(stories, entry => entry.curatedDeck);
  assert.deepEqual([...collections.keys()].sort(), ['Juniper Street Garden', 'Lanternlight Notes']);
  assert.equal(collections.get('Juniper Street Garden').length, 3);
  assert.equal(collections.get('Lanternlight Notes').length, 2);
  for (const entries of collections.values()) {
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    assert.deepEqual(sorted, entries);
    assert.ok(sorted.every(entry => entry.perspective === 'third'));
  }
  assert.equal(stories.filter(entry => !entry.curatedDeck).length, 0);
});
