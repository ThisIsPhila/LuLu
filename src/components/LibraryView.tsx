import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Entry } from '../domain/journal';
import type { LibraryItem, LibraryItemDraft, LibraryItemKind } from '../domain/libraryItems';
import { filterOrdinaryEntries, type OrdinaryEntryFilter } from '../domain/ordinaryBrowse';
import { OrdinaryEntryCard } from './OrdinaryEntryCard';
import { LibraryItemsPanel } from './LibraryItemsPanel';
import './LibraryView.css';

type LibraryProps = {
  entries: Entry[];
  items: LibraryItem[];
  itemsLoading: boolean;
  itemsError?: string;
  onRetryItems: () => void;
  onCreateItem: (kind: LibraryItemKind, draft: LibraryItemDraft) => Promise<void>;
  onUpdateItem: (id: string, draft: LibraryItemDraft, completed?: boolean) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onSelectEntry: (entry: Entry) => void;
  initialSection?: 'entries' | 'notes' | 'tasks';
  initialCreateKind?: LibraryItemKind;
  onInitialIntentConsumed?: () => void;
};

const collectionFilters: OrdinaryEntryFilter[] = ['All', 'Journal', 'Stories'];

export const LibraryView: React.FC<LibraryProps> = ({ entries, items, itemsLoading, itemsError, onRetryItems, onCreateItem, onUpdateItem, onDeleteItem, onSelectEntry, initialSection = 'entries', initialCreateKind, onInitialIntentConsumed }) => {
  const [section, setSection] = useState<'entries' | 'notes' | 'tasks'>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [collection, setCollection] = useState<OrdinaryEntryFilter>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    if (initialCreateKind) onInitialIntentConsumed?.();
  }, [initialCreateKind, onInitialIntentConsumed]);

  const ordinaryEntries = useMemo(() => filterOrdinaryEntries(entries), [entries]);
  const tags = useMemo(() => [...new Set(ordinaryEntries.flatMap(entry => entry.tags ?? []))]
    .filter(tag => tag.trim())
    .sort((left, right) => left.localeCompare(right)), [ordinaryEntries]);
  const visibleEntries = useMemo(() => filterOrdinaryEntries(ordinaryEntries, searchQuery, collection)
    .filter(entry => !favoritesOnly || entry.favorite)
    .filter(entry => !selectedTag || (entry.tags ?? []).some(tag => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase())),
  [ordinaryEntries, searchQuery, collection, favoritesOnly, selectedTag]);

  function clearFilters() {
    setSearchQuery('');
    setCollection('All');
    setSelectedTag(null);
    setFavoritesOnly(false);
  }

  const hasFilters = Boolean(searchQuery.trim() || collection !== 'All' || selectedTag || favoritesOnly);

  return (
    <main className="story-leaves-screen library-view" data-ordinary-page-scroll="library" data-testid="ordinary-page-scroll-library">
      <header className="library-view-header">
        <div className="library-view-title-row">
          <div>
            <span className="library-view-kicker">YOUR WRITING</span>
            <h1>Library</h1>
            <p>Browse writing, notes and next steps.</p>
          </div>
        </div>

        <div className="leaves-search-well">
          <Search size={15} className="search-icon-well" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search your library"
            data-ordinary-page-search="true"
            placeholder={section === 'entries' ? 'Search titles, writing, and topics…' : `Search ${section}…`}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
          {searchQuery && <button type="button" className="library-clear-search" aria-label="Clear search" onClick={() => setSearchQuery('')}><X size={14} aria-hidden="true" /></button>}
        </div>

        <div className="leaves-filters-row library-section-filters" role="group" aria-label="Library section">
          {(['entries', 'notes', 'tasks'] as const).map(option => <button key={option} type="button" className={`filter-pill ${section === option ? 'active' : ''}`} aria-pressed={section === option} onClick={() => setSection(option)}>
            <span>{option === 'entries' ? 'Entries' : option === 'notes' ? 'Notes' : 'Tasks'}</span>
          </button>)}
        </div>

        {section === 'entries' && <div className="leaves-filters-row" role="group" aria-label="Filter by collection">
          {collectionFilters.map(filter => (
            <button key={filter} type="button" className={`filter-pill ${collection === filter ? 'active' : ''}`} aria-pressed={collection === filter} onClick={() => setCollection(filter)}>
              <span>{filter}</span>
            </button>
          ))}
          <button type="button" className={`filter-pill ${favoritesOnly ? 'active' : ''}`} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(value => !value)}>
            <span>Favorites</span>
          </button>
        </div>}

        {section === 'entries' && tags.length > 0 && <div className="library-topic-filters" role="group" aria-label="Filter by saved topic">
          <span className="library-topic-label">Topics</span>
          {tags.map(tag => <button key={tag} type="button" className={`filter-pill ${selectedTag?.toLocaleLowerCase() === tag.toLocaleLowerCase() ? 'active' : ''}`} aria-pressed={selectedTag?.toLocaleLowerCase() === tag.toLocaleLowerCase()} onClick={() => setSelectedTag(current => current?.toLocaleLowerCase() === tag.toLocaleLowerCase() ? null : tag)}>
            <span>#{tag}</span>
          </button>)}
        </div>}
      </header>

      {section === 'entries' && <div className="library-results-heading" aria-live="polite">
        <span>{visibleEntries.length} {visibleEntries.length === 1 ? 'entry' : 'entries'}</span>
        {hasFilters && <button type="button" className="library-reset-filters" onClick={clearFilters}>Clear filters</button>}
      </div>}

      {section === 'entries' ? <div className="leaves-list" aria-label="Library entries">
        {visibleEntries.length ? visibleEntries.map(entry => <OrdinaryEntryCard key={entry.id} entry={entry} onSelect={onSelectEntry} />) : (
          <p className="leaves-empty-state" role="status">
            {hasFilters ? 'No ordinary entries match these filters.' : 'Your saved entries will appear here.'}
          </p>
        )}
      </div> : <LibraryItemsPanel kind={section === 'notes' ? 'note' : 'task'} startWithCreate={initialCreateKind === (section === 'notes' ? 'note' : 'task')} items={items} query={searchQuery} loading={itemsLoading} loadError={itemsError} onRetry={onRetryItems}
        onCreate={onCreateItem} onUpdate={onUpdateItem} onDelete={onDeleteItem} />}
    </main>
  );
};
