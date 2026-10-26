import type { Entry } from './journal.ts';

export type OrdinaryEntryFilter = 'All' | 'Journal' | 'Stories';

/** Search and categorize only ordinary entries; protected content never enters this surface. */
export function filterOrdinaryEntries(
  entries: readonly Entry[],
  query = '',
  filter: OrdinaryEntryFilter = 'All',
): Entry[] {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(entry => {
    if (entry.protected) return false;
    if (filter === 'Journal' && entry.kind !== 'Journal') return false;
    if (filter === 'Stories' && entry.kind !== 'Story') return false;
    if (!term) return true;
    return [entry.title, entry.body, ...(entry.tags ?? [])]
      .some(value => value.toLocaleLowerCase().includes(term));
  });
}

export type CuratedDeckSummary = { name: string; count: number; entry: Entry };

/** Return a deck summary only when a matching ordinary curated entry exists. */
export function findCuratedDeck(entries: readonly Entry[]): CuratedDeckSummary | null {
  const entry = entries.find(item => typeof item.curatedDeck === 'string' && item.curatedDeck.trim());
  if (!entry || !entry.curatedDeck) return null;
  const name = entry.curatedDeck.trim();
  const count = entries.filter(item => item.curatedDeck?.trim() === name).length;
  return { name, count, entry };
}
