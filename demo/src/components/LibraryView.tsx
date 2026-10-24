import React, { useState } from 'react';
import { Search, X, Lock, Filter, Plus, User, MapPin, Clock, Tag } from 'lucide-react';
import type { Entry } from '../domain/journal';
import type { Entity } from '../domain/transform';

type LibraryProps = {
  entries: Entry[];
  entities: Entity[];
  protectedMode: boolean;
  onSelectEntry: (entry: Entry) => void;
  onNewEntry: () => void;
  onOpenProtectedGate: () => void;
};

export const LibraryView: React.FC<LibraryProps> = ({
  entries,
  entities,
  protectedMode,
  onSelectEntry,
  onNewEntry,
  onOpenProtectedGate,
}) => {
  const [subTab, setSubTab] = useState<'Entries' | 'People' | 'Places' | 'Topics'>('Entries');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtectedOnly, setFilterProtectedOnly] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  // Search logic: matches title, body, and (if in protectedMode) originalBody!
  const filteredEntries = entries.filter((entry) => {
    if (filterProtectedOnly && !entry.protected) return false;
    if (selectedPerson) {
      const matchAlias = entry.body.toLowerCase().includes(selectedPerson.toLowerCase());
      const matchOriginal =
        protectedMode && entry.originalBody?.toLowerCase().includes('david');
      if (!matchAlias && !matchOriginal) return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const inTitle = entry.title.toLowerCase().includes(query);
    const inBody = entry.body.toLowerCase().includes(query);
    const inOriginal =
      protectedMode && entry.originalBody
        ? entry.originalBody.toLowerCase().includes(query)
        : false;

    return inTitle || inBody || inOriginal;
  });

  return (
    <div className="library-screen">
      <header className="library-header">
        <div className="library-header-main">
          <h2>Library</h2>
          <button className="primary-btn sm" onClick={onNewEntry}>
            <Plus size={14} />
            <span>New</span>
          </button>
        </div>

        {/* Search input with original-intent indicator */}
        <div className="library-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={
              protectedMode
                ? 'Search concealed narrative or original author terms (e.g. David)...'
                : 'Search your entries and stories...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sub-tabs: Entries | People | Places | Topics */}
        <div className="library-subtabs">
          {(['Entries', 'People', 'Places', 'Topics'] as const).map((tab) => (
            <button
              key={tab}
              className={`subtab-pill ${subTab === tab ? 'active' : ''}`}
              onClick={() => setSubTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter chips (Screen G in design) */}
        <div className="library-filter-chips">
          <button
            className={`filter-chip ${filterProtectedOnly ? 'active' : ''}`}
            onClick={() => setFilterProtectedOnly(!filterProtectedOnly)}
          >
            <Lock size={11} />
            <span>Protected</span>
            {filterProtectedOnly && <X size={11} />}
          </button>

          {selectedPerson && (
            <button
              className="filter-chip active"
              onClick={() => setSelectedPerson(null)}
            >
              <User size={11} />
              <span>Person: {selectedPerson}</span>
              <X size={11} />
            </button>
          )}

          {!selectedPerson && (
            <button
              className="filter-chip"
              onClick={() => setSelectedPerson('John')}
            >
              <User size={11} />
              <span>Person: John</span>
            </button>
          )}
        </div>
      </header>

      {/* Content depending on selected subtab */}
      <main className="library-content">
        {subTab === 'Entries' && (
          <div className="library-entries-list">
            <div className="entries-count-bar">
              <span>{filteredEntries.length} entries found</span>
              {protectedMode && (
                <span className="search-mode-tag">Protected Search Active</span>
              )}
            </div>

            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="library-entry-item"
                onClick={() => onSelectEntry(entry)}
              >
                <div className="item-main">
                  <div className="item-title-row">
                    <h4>{entry.title}</h4>
                    {entry.protected && (
                      <span className="entry-lock-pill">
                        <Lock size={10} />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>
                  <p className="item-preview">{entry.body}</p>
                </div>
                <div className="item-date">
                  <span>
                    {new Date(entry.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {filteredEntries.length === 0 && (
              <div className="empty-state">
                <p>No entries match your search criteria.</p>
                {!protectedMode && searchQuery.toLowerCase().includes('david') && (
                  <p className="hint-note">
                    Searching for original author words like "David"? Unlock your{' '}
                    <button className="text-link" onClick={onOpenProtectedGate}>
                      Protected Session
                    </button>{' '}
                    to enable author-intent retrieval.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {subTab === 'People' && (
          <div className="entity-directory">
            <h3>Connected People</h3>
            <p className="directory-sub">
              These representations replace real names across your entries to maintain personal safety.
            </p>
            <div className="directory-grid">
              {entities
                .filter((e) => e.type === 'Person')
                .map((p) => (
                  <div
                    key={p.id}
                    className="directory-card"
                    onClick={() => {
                      setSelectedPerson(p.alias);
                      setSubTab('Entries');
                    }}
                  >
                    <div className="dir-icon"><User size={16} /></div>
                    <div className="dir-info">
                      <h4>{p.alias}</h4>
                      <span>
                        {protectedMode ? `Original: ${p.original}` : 'Protected Alias'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {subTab === 'Places' && (
          <div className="entity-directory">
            <h3>Connected Places</h3>
            <p className="directory-sub">
              Geographic and residential references mapped into coherent literary metaphors.
            </p>
            <div className="directory-grid">
              {entities
                .filter((e) => e.type === 'Place')
                .map((p) => (
                  <div key={p.id} className="directory-card">
                    <div className="dir-icon"><MapPin size={16} /></div>
                    <div className="dir-info">
                      <h4>{p.alias}</h4>
                      <span>{protectedMode ? `Original: ${p.original}` : 'Protected Location'}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {subTab === 'Topics' && (
          <div className="entity-directory">
            <h3>Time & Thematic Anchors</h3>
            <div className="directory-grid">
              {entities
                .filter((e) => e.type === 'Time' || e.type === 'Topic')
                .map((t) => (
                  <div key={t.id} className="directory-card">
                    <div className="dir-icon"><Clock size={16} /></div>
                    <div className="dir-info">
                      <h4>{t.alias}</h4>
                      <span>{protectedMode ? `Original: ${t.original}` : 'Protected Reference'}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
