import type { Entry } from './journal.ts';
import { transform, recognised } from './transform.ts';
import type { JournalSnapshot } from '../services/journalStorage.ts';
import { isSnapshot } from '../services/journalStorage.ts';

/** Corrections are explicit; source meaning is retained, never reconstructed from aliases. */
export function correctAlias(snapshot: JournalSnapshot, entityId: string, alias: string): JournalSnapshot {
  if (!isSnapshot(snapshot) || !alias.trim()) throw new Error('Invalid correction');
  if (!snapshot.entities.some(e => e.id === entityId)) throw new Error('Unknown entity');
  const target = snapshot.entities.find(e => e.id === entityId)!;
  const entities = snapshot.entities.map(e => e.id === entityId ? { ...e, alias: alias.trim() } : { ...e });
  const entries = snapshot.entries.map(entry => {
    if (!entry.protected || entry.originalBody === undefined || !recognised(entry.originalBody, [target]).length) return { ...entry };
    return {
      ...entry,
      body: transform(entry.originalBody, entities, { perspectiveDistancing: entry.perspective === 'third' }),
      entitiesRecognized: recognised(entry.originalBody, entities).map(e => e.alias),
    };
  });
  return { version: 1, entries, entities };
}

/** UI access flag only; this does not authenticate a user or encrypt records. */
export function searchJournal(snapshot: JournalSnapshot, query: string, options: { protectedAccess?: boolean; entityId?: string } = {}): Entry[] {
  const term = query.trim().toLocaleLowerCase();
  const entity = options.entityId ? snapshot.entities.find(e => e.id === options.entityId) : undefined;
  if (options.entityId && !entity) return [];
  return snapshot.entries.filter(entry => {
    const source = options.protectedAccess && entry.protected ? entry.originalBody : undefined;
    if (entity) {
      // Original source disambiguates identical outward aliases while access is active.
      const text = source ?? entry.body;
      const match = source !== undefined ? { ...entity, alias: entity.original } : { ...entity, original: entity.alias };
      if (!recognised(text, [match]).length) return false;
    }
    return !term || [entry.title, entry.body, source ?? ''].some(text => text.toLocaleLowerCase().includes(term));
  });
}
