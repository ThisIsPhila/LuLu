import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Lock,
  Unlock,
  ChevronRight,
  Layers,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { Entry } from '../domain/journal';

type Props = {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  onOpenProtectedGate: () => void;
};

export const StoryLeavesView: React.FC<Props> = ({
  entries,
  onSelectEntry,
  onOpenProtectedGate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Curated' | 'Masked'>('All');
  const [isFlipped, setIsFlipped] = useState(false);

  const curatedEntries = entries.filter((e) => e.curatedDeck);
  const otherEntries = entries.filter((e) => !e.curatedDeck);

  return (
    <div className="story-leaves-screen">
      {/* Curated Deck Hero Card (Screen Leaves 1 & 2) */}
      <section className="curated-deck-section">
        <div className="curated-deck-card">
          <div className="deck-card-head">
            <span className="deck-tag">CURATED DECK • 4 archival sheets</span>
            <button className="deck-flip-trigger" onClick={() => setIsFlipped(!isFlipped)}>
              <Layers size={14} />
            </button>
          </div>

          <div className="deck-card-content">
            <div className="deck-text-col">
              <h2 className="deck-title">Spring Monologue</h2>
              <p className="deck-snippet">
                Quiet daylight drifting through linen curtains. Notes on stillness, the cadence of
                early tea, and the small rituals that keep life anchored.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80"
              alt="Deck thumbnail"
              className="deck-thumb"
            />
          </div>

          <div className="deck-footer-row">
            <span className="deck-touch-meta">Last touched today</span>
            <button
              className="deck-flip-btn"
              onClick={() => {
                const entry = entries.find((e) => e.title === 'Spring Monologue') || entries[0];
                onSelectEntry(entry);
              }}
            >
              <span>Flip deck</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* Inset Search Bar */}
      <div className="leaves-search-well">
        <Search size={15} className="search-icon-well" />
        <input
          type="text"
          placeholder="Search entries, masked entities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <kbd className="cmd-k-tag">⌘K</kbd>
      </div>

      {/* Filter Chips */}
      <div className="leaves-filters-row">
        <button
          className={`filter-pill ${activeFilter === 'All' ? 'active' : ''}`}
          onClick={() => setActiveFilter('All')}
        >
          <span>April 2025</span>
        </button>
        <button
          className={`filter-pill ${activeFilter === 'Curated' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Curated')}
        >
          <span>Reflections</span>
        </button>
        <button
          className={`filter-pill ${activeFilter === 'Masked' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Masked')}
        >
          <Lock size={11} />
          <span>Protected (1)</span>
        </button>
      </div>

      {/* Entries Stacked List */}
      <div className="leaves-list">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className={`leaf-card ${entry.protected ? 'protected-leaf' : ''}`}
            onClick={() => onSelectEntry(entry)}
          >
            <div className="leaf-top-row">
              <span className="leaf-meta-time">
                {entry.timeStr} • {entry.kind}
              </span>
              {entry.protected ? (
                <span className="masked-badge-capsule">
                  <Lock size={10} />
                  <span>Protected · 3 entities masked</span>
                </span>
              ) : (
                <span className="leaf-sheets-tag">
                  <Layers size={11} />
                  <span>2 sheets stacked</span>
                </span>
              )}
            </div>

            <div className="leaf-body-row">
              <div className="leaf-text-col">
                <h3 className="leaf-title">{entry.title}</h3>
                <p className="leaf-excerpt">
                  {entry.protected
                    ? 'I met with ••••• today. It felt good to be open and honest...'
                    : entry.body}
                </p>
              </div>
              {entry.imageUrl && (
                <img src={entry.imageUrl} alt={entry.title} className="leaf-image-preview" />
              )}
            </div>

            <div className="leaf-footer-row">
              {entry.protected ? (
                <button
                  className="btn-unmask-leaf"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProtectedGate();
                  }}
                >
                  <Sparkles size={12} />
                  <span>Tap to verify & unmask</span>
                </button>
              ) : (
                <div className="leaf-tags-group">
                  {entry.tags.map((t) => (
                    <span key={t} className="leaf-tag-pill">
                      #{t.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
              <span className="read-time-sub">2 min read</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
