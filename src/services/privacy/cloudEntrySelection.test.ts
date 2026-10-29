import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { prepareCloudEntrySelection } from './cloudEntrySelection.ts';

const entry = (overrides: Partial<Parameters<typeof prepareCloudEntrySelection>[0][number]> = {}) => ({
  id: 'entry', title: 'A day', body: 'A passage.', kind: 'Journal' as const,
  date: '2026-04-14T09:00:00.000Z', protected: false, ...overrides,
});

test('orders selected ordinary passages from older to newer without sending exact dates', () => {
  const result = prepareCloudEntrySelection([
    entry({ id: 'later', title: 'Later', date: '2026-04-15T09:00:00.000Z' }),
    entry({ id: 'earlier', title: 'Earlier', date: '2026-04-14T09:00:00.000Z', kind: 'Story' }),
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.entryCount, 2);
  assert.ok(result.text.indexOf('Title: Earlier') < result.text.indexOf('Title: Later'));
  assert.match(result.text, /Passage 1 · Story/);
  assert.doesNotMatch(result.text, /2026-04-1[45]/);
});

test('rejects protected writing, empty selections, too many entries and oversized passages', () => {
  assert.equal(prepareCloudEntrySelection([]).ok, false);
  assert.match(prepareCloudEntrySelection([entry({ protected: true })]).message, /Protected private writing/);
  assert.match(prepareCloudEntrySelection([entry(), entry(), entry(), entry()]).message, /up to 3 entries/);
  assert.match(prepareCloudEntrySelection([entry({ body: 'x'.repeat(4_100) })]).message, /exceed 4,000 characters/);
});
