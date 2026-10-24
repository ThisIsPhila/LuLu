import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import type { Entry } from '../domain/journal';

export function EntryStack({ title, entries, onSelectEntry }: {
  title: string; entries: Entry[]; onSelectEntry: (entry: Entry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = React.useId();
  if (!entries.length) return null;
  return (
    <section className={`entry-collection ${expanded ? 'expanded' : ''}`}>
      <button className="entry-stack-cover" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
        <span className="stack-cover-copy"><strong>{title}</strong><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></span>
        <span className="stack-cover-action">{expanded ? 'Close' : 'Open'}<ChevronDown size={15} /></span>
      </button>
      <div id={id} className="stack-entries" hidden={!expanded}>
        {entries.map(entry => (
          <button key={entry.id} className="stitch-entry-card stack-entry-button" onClick={() => onSelectEntry(entry)}>
            <span className="card-text-col">
              <span className="card-meta-line">{entry.groupDate} · {entry.timeStr}</span>
              <strong className="card-entry-title">{entry.title}</strong>
              <span className="card-entry-snippet">{entry.body}</span>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
