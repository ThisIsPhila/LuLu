import { useState } from 'react';
import type { Entry } from '../domain/journal';
import { initialEntities } from '../domain/transform';
import { correctAlias, searchJournal } from '../domain/continuity';
import { readJournal, writeJournal } from '../services/journalStorage';
import type { JournalSnapshot } from '../services/journalStorage';

const defaultSnapshot: JournalSnapshot = { version: 1, entries: [], entities: initialEntities };

export function useJournal() {
  const [loaded] = useState(() => {
    try {
      return readJournal(localStorage, defaultSnapshot);
    } catch {
      return { ok: true, value: defaultSnapshot } as const;
    }
  });
  const [snapshot, setSnapshot] = useState<JournalSnapshot>(() => loaded.ok ? loaded.value : defaultSnapshot);
  const [error, setError] = useState(loaded.ok ? '' : 'Your journal could not be read. Stored data has been left unchanged.');
  function update(next: JournalSnapshot) {
    try {
      const result = writeJournal(localStorage, next);
      if (!result.ok) throw new Error(result.error);
      setSnapshot(result.value);
      setError('');
      return true;
    } catch {
      setError('Your browser could not save this change. Your draft is still here.');
      return false;
    }
  }
  return {
    entries: snapshot.entries, entities: snapshot.entities, error,
    save: (entry: Entry) => update({ ...snapshot, entries: [entry, ...snapshot.entries.filter(e => e.id !== entry.id)] }),
    remove: (id: string) => update({ ...snapshot, entries: snapshot.entries.filter(e => e.id !== id) }),
    favorite: (id: string) => update({ ...snapshot, entries: snapshot.entries.map(e => e.id === id ? { ...e, favorite: !e.favorite } : e) }),
    correctAlias: (id: string, alias: string) => {
      try { return update(correctAlias(snapshot, id, alias)); }
      catch { setError('Choose an existing reference and a non-empty representation.'); return false; }
    },
    search: (query: string, options?: Parameters<typeof searchJournal>[2]) => searchJournal(snapshot, query, options),
  };
}
