import type { Entry } from '../../domain/journal.ts';
import { normalizeStoryCollection } from '../../domain/storyCollections.ts';

export type DemoRecord = {
  title?: unknown;
  body?: unknown;
  kind?: unknown;
  protected?: unknown;
  perspective?: unknown;
  tags?: unknown;
  curatedDeck?: unknown;
  createdAt?: { toDate?: () => Date };
};

export function mapDemoRecord(id: string, record: DemoRecord): Entry {
  if (typeof record.title !== 'string' || typeof record.body !== 'string' ||
      !['Journal', 'Story'].includes(String(record.kind)) || record.protected !== false) {
    throw new Error('A sample entry is unavailable because its catalogue record is invalid.');
  }
  const date = record.createdAt?.toDate?.();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('A sample entry is unavailable because its date is invalid.');
  }
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groupDate = date.toDateString() === today ? 'Today' : date.toDateString() === yesterday ? 'Yesterday' : 'Earlier';
  const tags = Array.isArray(record.tags) && record.tags.every(tag => typeof tag === 'string') ? record.tags : [];
  const curatedDeck = normalizeStoryCollection(record.curatedDeck);
  if (curatedDeck && (record.kind !== 'Story' || record.protected !== false)) {
    throw new Error('A sample Story collection is unavailable because its catalogue record is invalid.');
  }
  return {
    id,
    title: record.title,
    body: record.body,
    kind: record.kind as Entry['kind'],
    date: date.toISOString(),
    timeStr: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    wordsCount: record.body.trim().split(/\s+/).filter(Boolean).length,
    groupDate,
    tags,
    favorite: false,
    protected: false,
    perspective: record.perspective === 'third' ? 'third' : 'first',
    ...(curatedDeck ? { curatedDeck } : {}),
  };
}
