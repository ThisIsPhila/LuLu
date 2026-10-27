import React from 'react';
import { BookOpen, Layers } from 'lucide-react';
import type { Entry } from '../domain/journal';

export function OrdinaryEntryCard({ entry, onSelect }: { entry: Entry; onSelect: (entry: Entry) => void }) {
  function selectWithKeyboard(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(entry);
    }
  }

  return (
    <article
      className="leaf-card"
      role="button"
      tabIndex={0}
      aria-label={`Open ${entry.title}, ${entry.kind}, ${entry.groupDate}`}
      onClick={() => onSelect(entry)}
      onKeyDown={selectWithKeyboard}
    >
      <div className="leaf-top-row">
        <span className="leaf-meta-time">{entry.groupDate}{entry.timeStr ? ` · ${entry.timeStr}` : ''} • {entry.kind}</span>
        {entry.curatedDeck && <span className="leaf-sheets-tag"><Layers size={11} aria-hidden="true" /><span>{entry.curatedDeck}</span></span>}
      </div>
      <div className="leaf-body-row">
        <div className="leaf-text-col">
          <h3 className="leaf-title">{entry.title}</h3>
          <p className="leaf-excerpt">{entry.body}</p>
        </div>
        {entry.imageUrl && <img src={entry.imageUrl} alt="" className="leaf-image-preview" />}
      </div>
      <div className="leaf-footer-row">
        <div className="leaf-tags-group">{(entry.tags ?? []).map(tag => <span key={tag} className="leaf-tag-pill">#{tag.toLowerCase()}</span>)}</div>
        <BookOpen size={14} aria-hidden="true" />
      </div>
    </article>
  );
}
