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

/** Return one summary per curated collection, based only on ordinary entries. */
export function findCuratedDecks(entries: readonly Entry[]): CuratedDeckSummary[] {
  const decks = new Map<string, CuratedDeckSummary>();
  for (const entry of entries) {
    if (entry.protected || entry.kind !== 'Story' || typeof entry.curatedDeck !== 'string') continue;
    const name = entry.curatedDeck.trim();
    if (!name) continue;
    const deck = decks.get(name);
    if (deck) deck.count += 1;
    else decks.set(name, { name, count: 1, entry });
  }
  return [...decks.values()];
}

/** Return the first deck summary when callers need a single featured collection. */
export function findCuratedDeck(entries: readonly Entry[]): CuratedDeckSummary | null {
  return findCuratedDecks(entries)[0] ?? null;
}

/** Keep a saved Story collection together in source-time order for continuous reading. */
export function findCuratedDeckEntries(entries: readonly Entry[], deckName: string): Entry[] {
  const target = deckName.trim();
  if (!target) return [];
  return entries
    .filter(entry => !entry.protected && entry.kind === 'Story' && entry.curatedDeck?.trim() === target)
    .slice()
    .sort((left, right) => {
      const leftDate = Date.parse(left.date);
      const rightDate = Date.parse(right.date);
      const orderedDate = (Number.isFinite(leftDate) ? leftDate : 0) - (Number.isFinite(rightDate) ? rightDate : 0);
      return orderedDate || left.id.localeCompare(right.id);
    });
}
