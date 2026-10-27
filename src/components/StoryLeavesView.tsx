import React, { useState } from 'react';
import {
  Search,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import type { Entry } from '../domain/journal';
import { filterOrdinaryEntries, findCuratedDeckEntries, findCuratedDecks, type OrdinaryEntryFilter } from '../domain/ordinaryBrowse';
import { OrdinaryEntryCard } from './OrdinaryEntryCard';

type Props = {
  entries: Entry[];
  onSelectEntry: (entry: Entry, narrativeSequence?: Entry[]) => void;
  initialFilter?: OrdinaryEntryFilter;
  pageTitle: 'Journal' | 'Stories';
};

export const StoryLeavesView: React.FC<Props> = ({ entries, onSelectEntry, initialFilter = 'All', pageTitle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<OrdinaryEntryFilter>(initialFilter);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  const filteredEntries = filterOrdinaryEntries(entries, searchQuery, activeFilter);
  const visibleEntries = selectedDeck
    ? filteredEntries.filter(entry => entry.curatedDeck?.trim() === selectedDeck)
    : filteredEntries;
  const curatedDecks = findCuratedDecks(filterOrdinaryEntries(entries)).filter(deck =>
    (!selectedDeck || deck.name === selectedDeck) &&
    filteredEntries.some(entry => entry.curatedDeck?.trim() === deck.name),
  );
  const filters: OrdinaryEntryFilter[] = ['All', 'Journal', 'Stories'];

  function openDeck(name: string) {
    setSelectedDeck(name);
    setSearchQuery('');
    setActiveFilter('All');
  }

  return (
    <main className="story-leaves-screen" data-ordinary-page-scroll={pageTitle.toLowerCase()} data-testid={`ordinary-page-scroll-${pageTitle.toLowerCase()}`}>
      <h1 className="leaves-page-title">{pageTitle}</h1>
      {pageTitle === 'Stories' && curatedDecks.length > 0 && (
        <section className="curated-deck-section" aria-label="Curated collection">
          {curatedDecks.map(curatedDeck => <div className="curated-deck-card" key={curatedDeck.name}>
            <div className="deck-card-head">
              <span className="deck-tag">CURATED DECK • {curatedDeck.count} {curatedDeck.count === 1 ? 'entry' : 'entries'}</span>
              <button
                type="button"
                className="deck-flip-trigger"
                aria-label={`Open ${curatedDeck.name} collection`}
                aria-pressed={selectedDeck === curatedDeck.name}
                onClick={() => openDeck(curatedDeck.name)}
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
              <button type="button" className="deck-flip-btn" aria-pressed={selectedDeck === curatedDeck.name} onClick={() => openDeck(curatedDeck.name)}>
                <span>{selectedDeck === curatedDeck.name ? 'Showing collection' : 'Open collection'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>)}
        </section>
      )}

      <div className="leaves-search-well">
        <Search size={15} className="search-icon-well" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search ordinary entries"
          data-ordinary-page-search="true"
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
        {selectedDeck && (
          <button type="button" className="filter-pill active" aria-label={`Clear ${selectedDeck} collection filter`} onClick={() => setSelectedDeck(null)}>
            <span>{selectedDeck}</span><X size={12} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="leaves-list" aria-live="polite">
        {visibleEntries.length > 0 ? visibleEntries.map(entry => (
          <OrdinaryEntryCard key={entry.id} entry={entry} onSelect={selectedEntry => {
            const deckName = pageTitle === 'Stories' && selectedEntry.kind === 'Story' ? selectedEntry.curatedDeck?.trim() : '';
            const narrativeSequence = deckName ? findCuratedDeckEntries(entries, deckName) : undefined;
            onSelectEntry(selectedEntry, narrativeSequence);
          }} />
        )) : (
          <p className="leaves-empty-state" role="status">
            {searchQuery.trim() && selectedDeck
              ? `No entries in ${selectedDeck} match your search.`
              : searchQuery.trim()
              ? 'No ordinary entries match your search.'
              : selectedDeck
                ? `No entries in ${selectedDeck} match these filters.`
                : activeFilter === 'All'
                ? 'Your ordinary entries will appear here.'
                : `No ${activeFilter === 'Journal' ? 'journal entries' : 'stories'} yet.`}
          </p>
        )}
      </div>
    </main>
  );
};
