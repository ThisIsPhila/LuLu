import React, { useState } from 'react';
import { EntryStack, EntrySpread } from './EntryStack';
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
  LogOut,
  UserRound,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entry } from '../domain/journal';
import { filterOrdinaryEntries } from '../domain/ordinaryBrowse';

type Props = {
  entries: Entry[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewEntry: () => void;
  onSelectEntry: (entry: Entry) => void;
  onOpenProtectedGate: () => void;
  protectedMode: boolean;
  onOpenVault: () => void;
  onSignOut: () => void;
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
  onSignOut,
}) => {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [openCollection, setOpenCollection] = useState<'Journal' | 'Stories' | null>(null);
  const spreadId = React.useId();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const ordinaryEntries = filterOrdinaryEntries(entries);
  const weeklyCount = ordinaryEntries.filter(entry => {
    const age = now.getTime() - Date.parse(entry.date);
    return age >= 0 && age < 7 * 86400000;
  }).length;
  const filteredEntries = ordinaryEntries.filter((e) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Journal') return e.kind === 'Journal';
    if (activeTab === 'Stories') return e.kind === 'Story';

    return true;
  });

  const visibleEntries = filterOrdinaryEntries(filteredEntries, query);

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
              onClick={() => { if (searching) setQuery(''); setSearching(!searching); }}
              aria-label="Search entries" aria-expanded={searching}
            >
              <Search size={16} />
            </button>

            <details className="account-menu">
              <summary className="user-avatar-circle" aria-label="Account menu" title="Account menu"><UserRound size={18} aria-hidden="true" /></summary>
              <div className="account-menu-panel">
                <span className="account-menu-label">Your account</span>
                <button type="button" onClick={onSignOut}><LogOut size={16} aria-hidden="true" />Sign out</button>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Main Stream */}
      <main className="stitch-main-stream">
        {/* Temporal Greeting */}
        <section className="temporal-greeting-section">
          <div className="temporal-date-row">
            <span className="temporal-date">{new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}</span>

          </div>

          <h1 className="greeting-headline">{greeting}</h1>
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
            <span className="count-pill-stitch">{ordinaryEntries.length}</span>
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
            <button type="button" className="quick-entry-well" onClick={onNewEntry}>
              <div className="well-left">
                <span className="well-pen-icon">✎</span>
                <span className="well-placeholder">Begin quick entry...</span>
              </div>
              <div className="well-right">
                <kbd className="enter-kbd">Enter</kbd>
                <ArrowRight size={13} className="arrow-well" />
              </div>
            </button>
          </section>
        )}

        {searching && <input className="home-search-input" type="search" aria-label="Search entries" placeholder="Search your entries…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />}
        <div className="home-collection-stacks" aria-label="Your collections">
          {(['Journal', 'Stories'] as const).map(title => (
            <EntryStack
              key={title}
              title={title}
              entries={visibleEntries.filter(e => e.kind === (title === 'Journal' ? 'Journal' : 'Story'))}
              expanded={openCollection === title || Boolean(query.trim())}
              onToggle={() => setOpenCollection(current => current === title ? null : title)}
              controls={spreadId}
            />
          ))}
        </div>
        {query.trim() ? (
          <EntrySpread id={spreadId} title="Search results" entries={visibleEntries} onSelectEntry={onSelectEntry} />
        ) : openCollection && (
          <EntrySpread
            id={spreadId}
            title={openCollection}
            entries={visibleEntries.filter(e => e.kind === (openCollection === 'Journal' ? 'Journal' : 'Story'))}
            onSelectEntry={onSelectEntry}
          />
        )}
        {/* Weekly Clarity Rhythm Card */}
        <section className="clarity-rhythm-card">
          <div className="clarity-left">
            <div className="clarity-icon-circle">
              <Compass size={17} />
            </div>
            <div className="clarity-text">
              <h4>Weekly Clarity Rhythm</h4>
              <p>{weeklyCount} {weeklyCount === 1 ? 'entry' : 'entries'} in the last 7 days</p>
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
