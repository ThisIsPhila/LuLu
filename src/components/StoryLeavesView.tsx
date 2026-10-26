import React, { useState } from 'react';
import {
  Search,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import type { Entry } from '../domain/journal';
import { filterOrdinaryEntries, findCuratedDeck, type OrdinaryEntryFilter } from '../domain/ordinaryBrowse';

type Props = {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  onOpenProtectedGate: () => void;
};

export const StoryLeavesView: React.FC<Props> = ({ entries, onSelectEntry }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<OrdinaryEntryFilter>('All');

  const visibleEntries = filterOrdinaryEntries(entries, searchQuery, activeFilter);
  const curatedDeck = findCuratedDeck(visibleEntries);
  const filters: OrdinaryEntryFilter[] = ['All', 'Journal', 'Stories'];

  const selectWithKeyboard = (event: React.KeyboardEvent<HTMLElement>, entry: Entry) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectEntry(entry);
    }
  };

  return (
    <div className="story-leaves-screen">
      {curatedDeck && (
        <section className="curated-deck-section" aria-label="Curated collection">
          <div className="curated-deck-card">
            <div className="deck-card-head">
              <span className="deck-tag">CURATED DECK • {curatedDeck.count} {curatedDeck.count === 1 ? 'entry' : 'entries'}</span>
              <button
                type="button"
                className="deck-flip-trigger"
                aria-label={`Open ${curatedDeck.name} collection`}
                onClick={() => onSelectEntry(curatedDeck.entry)}
              >
                <Layers size={14} />
              </button>
            </div>

            <div className="deck-card-content">
              <div className="deck-text-col">
                <h2 className="deck-title">{curatedDeck.name}</h2>
                <p className="deck-snippet">{curatedDeck.entry.body}</p>
              </div>
            </div>

            <div className="deck-footer-row">
              <span className="deck-touch-meta">{curatedDeck.count} {curatedDeck.count === 1 ? 'entry' : 'entries'}</span>
              <button type="button" className="deck-flip-btn" onClick={() => onSelectEntry(curatedDeck.entry)}>
                <span>Open entry</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="leaves-search-well">
        <Search size={15} className="search-icon-well" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search ordinary entries"
          placeholder="Search titles, writing, and tags..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="leaves-filters-row" role="group" aria-label="Filter entries by type">
        {filters.map(filter => (
          <button
            key={filter}
            type="button"
            className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
            aria-pressed={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            <span>{filter}</span>
          </button>
        ))}
      </div>

      <div className="leaves-list" aria-live="polite">
        {visibleEntries.length > 0 ? visibleEntries.map(entry => (
          <article
            key={entry.id}
            className="leaf-card"
            role="button"
            tabIndex={0}
            aria-label={`Open ${entry.title}, ${entry.kind}, ${entry.groupDate}`}
            onClick={() => onSelectEntry(entry)}
            onKeyDown={event => selectWithKeyboard(event, entry)}
          >
            <div className="leaf-top-row">
              <span className="leaf-meta-time">
                {entry.groupDate}{entry.timeStr ? ` · ${entry.timeStr}` : ''} • {entry.kind}
              </span>
              {entry.curatedDeck && (
                <span className="leaf-sheets-tag">
                  <Layers size={11} />
                  <span>{entry.curatedDeck}</span>
                </span>
              )}
            </div>

            <div className="leaf-body-row">
              <div className="leaf-text-col">
                <h3 className="leaf-title">{entry.title}</h3>
                <p className="leaf-excerpt">{entry.body}</p>
              </div>
              {entry.imageUrl && <img src={entry.imageUrl} alt="" className="leaf-image-preview" />}
            </div>

            <div className="leaf-footer-row">
              <div className="leaf-tags-group">
                {entry.tags.map(tag => (
                  <span key={tag} className="leaf-tag-pill">#{tag.toLowerCase()}</span>
                ))}
              </div>
              <BookOpen size={14} aria-hidden="true" />
            </div>
          </article>
        )) : (
          <p className="leaves-empty-state" role="status">
            {searchQuery.trim()
              ? 'No ordinary entries match your search.'
              : activeFilter === 'All'
                ? 'Your ordinary entries will appear here.'
                : `No ${activeFilter === 'Journal' ? 'journal entries' : 'stories'} yet.`}
          </p>
        )}
      </div>
    </div>
  );
};
