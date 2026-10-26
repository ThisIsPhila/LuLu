import React from 'react';
import { ArrowUpRight, BookOpen, ChevronRight, Layers3 } from 'lucide-react';
import type { Entry } from '../domain/journal';

type Collection = 'Journal' | 'Stories';

/** A compact collection of writing. Opening it reveals a separate sheet of entries. */
export function EntryStack({ title, entries, expanded, onToggle, controls }: {
  title: Collection;
  entries: Entry[];
  expanded: boolean;
  onToggle: () => void;
  controls: string;
}) {
  const latest = entries[0];
  const Icon = title === 'Journal' ? BookOpen : Layers3;
  return (
    <button
      type="button"
      className={`collection-stack ${expanded ? 'is-open' : ''}`}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={`${title}, ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}. ${expanded ? 'Close' : 'Open'} collection`}
      onClick={onToggle}
    >
      <span className="collection-stack-sheet sheet-back" aria-hidden="true" />
      <span className="collection-stack-sheet sheet-middle" aria-hidden="true" />
      <span className="collection-stack-face">
        <span className="collection-stack-top"><Icon size={17} strokeWidth={1.5} /><ChevronRight size={16} className="collection-stack-chevron" /></span>
        <span className="collection-stack-title">{title}</span>
        <span className="collection-stack-count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
        <span className="collection-stack-preview">{latest ? latest.title : 'A place for what matters'}</span>
      </span>
    </button>
  );
}

export function EntrySpread({ title, entries, onSelectEntry, id }: {
  title: Collection | 'Search results';
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  id: string;
}) {
  return (
    <section id={id} className="collection-spread" aria-label={`${title} entries`}>
      <div className="collection-spread-heading"><h2>{title}</h2><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
      {entries.length ? (
        <div className="collection-spread-track">
          {entries.map(entry => (
            <button key={entry.id} type="button" className="collection-leaf" onClick={() => onSelectEntry(entry)}>
              <span className="collection-leaf-meta">{entry.groupDate || 'Entry'}{entry.timeStr ? ` · ${entry.timeStr}` : ''}</span>
              <strong>{entry.title}</strong>
              <span className="collection-leaf-excerpt">{entry.body}</span>
              <span className="collection-leaf-action">Read entry <ArrowUpRight size={15} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      ) : <p className="collection-spread-empty">{title === 'Search results' ? 'No entries match your search.' : `Your first ${title === 'Journal' ? 'journal entry' : 'story'} will appear here.`}</p>}
    </section>
  );
}
