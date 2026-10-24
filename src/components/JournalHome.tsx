import React, { useState } from 'react';
import { EntryStack } from './EntryStack';
import {
  Shield,
  Search,
  Lock,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  ChevronRight,
  Footprints,
  Compass,
  Target,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entry } from '../domain/journal';

type Props = {
  entries: Entry[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewEntry: () => void;
  onSelectEntry: (entry: Entry) => void;
  onOpenProtectedGate: () => void;
  protectedMode: boolean;
  onOpenVault: () => void;
};

export const JournalHome: React.FC<Props> = ({
  entries,
  activeTab,
  onTabChange,
  onNewEntry,
  onSelectEntry,
  onOpenProtectedGate,
  protectedMode,
  onOpenVault,
}) => {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const filteredEntries = entries.filter((e) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Journal') return e.kind === 'Journal';
    if (activeTab === 'Stories') return e.kind === 'Story';

    return true;
  });

  const visibleEntries = filteredEntries.filter(e => `${e.title} ${e.body}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="stitch-journal-home">
      {/* Fixed Sticky Header */}
      <header className="stitch-topbar">
        <div className="topbar-container">
          <LuLuLogo size="sm" />

          <div className="topbar-actions">
            <button
              className={`topbar-circle-btn ${protectedMode ? 'active-vault' : ''}`}
              onClick={onOpenVault}
              title="Open Private Vault & Safety Sanctuary"
            >
              <Shield size={16} />
            </button>

            <button
              className="topbar-circle-btn"
              onClick={() => setSearching(!searching)}
              aria-label="Search entries" aria-expanded={searching}
            >
              <Search size={16} />
            </button>

            <div className="user-avatar-circle" title="Lerato Profile">
              <span>L</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Stream */}
      <main className="stitch-main-stream">
        {/* Temporal Greeting */}
        <section className="temporal-greeting-section">
          <div className="temporal-date-row">
            <span className="temporal-date">Tuesday, 14 May 2026</span>

          </div>

          <h1 className="greeting-headline">Good morning, Lerato</h1>
          <p className="greeting-sub">
            A quiet sanctuary for your personal thoughts & discoveries.
          </p>
        </section>

        {/* Tactile Pill Category Filters */}
        <nav className="tactile-filters-row" aria-label="Journal Filters">
          <button
            className={`filter-pill-stitch ${activeTab === 'All' ? 'active' : ''}`}
            onClick={() => onTabChange('All')}
          >
            <span>All</span>
            <span className="count-pill-stitch">{entries.length}</span>
          </button>

          <button
            className={`filter-pill-stitch ${activeTab === 'Journal' ? 'active' : ''}`}
            onClick={() => onTabChange('Journal')}
          >
            <span>Journal</span>
          </button>

          <button
            className={`filter-pill-stitch ${activeTab === 'Stories' ? 'active' : ''}`}
            onClick={() => onTabChange('Stories')}
          >
            <span>Stories</span>
          </button>


        </nav>

        {/* Daily Reflection Quote Card */}
        {activeTab === 'All' && (
          <section className="daily-reflection-card">
            <div className="reflection-card-header">
              <span className="reflection-tag">
                <Sparkles size={11} />
                <span>Daily Reflection</span>
              </span>
              <span className="reflection-prompt-time">06:00 AM Prompt</span>
            </div>

            <blockquote className="reflection-quote">
              “What felt quiet today, even while everything else was moving?”
            </blockquote>

            {/* Inset Well Quick Entry */}
            <div className="quick-entry-well" onClick={onNewEntry} role="button" tabIndex={0}>
              <div className="well-left">
                <span className="well-pen-icon">✎</span>
                <span className="well-placeholder">Begin quick entry...</span>
              </div>
              <div className="well-right">
                <kbd className="enter-kbd">Enter</kbd>
                <ArrowRight size={13} className="arrow-well" />
              </div>
            </div>
          </section>
        )}

        {searching && <input className="home-search-input" type="search" aria-label="Search entries" placeholder="Search your entries…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />}
        <div className="home-collection-stacks">
          <EntryStack title="Journal" entries={visibleEntries.filter(e => e.kind === 'Journal')} onSelectEntry={onSelectEntry} />
          <EntryStack title="Stories" entries={visibleEntries.filter(e => e.kind === 'Story')} onSelectEntry={onSelectEntry} />
          {visibleEntries.length === 0 && <p className="empty-collection">No entries in this collection yet.</p>}
        </div>

        {/* Weekly Clarity Rhythm Card */}
        <section className="clarity-rhythm-card">
          <div className="clarity-left">
            <div className="clarity-icon-circle">
              <Compass size={17} />
            </div>
            <div className="clarity-text">
              <h4>Weekly Clarity Rhythm</h4>
              <p>7 entries recorded • 100% on-device</p>
            </div>
          </div>

          <div className="clarity-bars-visualizer" aria-hidden="true">
            <span style={{ height: '14px' }} />
            <span style={{ height: '22px' }} />
            <span style={{ height: '8px' }} />
            <span style={{ height: '26px' }} />
            <span style={{ height: '18px' }} />
          </div>
        </section>
      </main>
    </div>
  );
};
