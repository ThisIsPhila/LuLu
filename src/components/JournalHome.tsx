import React, { useState } from 'react';
import { EntryStack, EntrySpread } from './EntryStack';
import {
  Sparkles,
  ArrowRight,
  Compass,
  StickyNote,
  CheckSquare,
} from 'lucide-react';
import type { Entry } from '../domain/journal';
import type { LibraryItemKind } from '../domain/libraryItems';
import { filterOrdinaryEntries } from '../domain/ordinaryBrowse';
import { OrdinaryEntryCard } from './OrdinaryEntryCard';

type Props = {
  entries: Entry[];
  displayName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewEntry: () => void;
  onQuickCreateLibraryItem: (kind: LibraryItemKind) => void;
  onSelectEntry: (entry: Entry) => void;
  onOpenProtectedGate: () => void;
};

export const JournalHome: React.FC<Props> = ({
  entries,
  displayName,
  activeTab,
  onTabChange,
  onNewEntry,
  onQuickCreateLibraryItem,
  onSelectEntry,
  onOpenProtectedGate,
}) => {
  const [openCollection, setOpenCollection] = useState<'Journal' | 'Stories' | null>(null);
  const spreadId = React.useId();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const ordinaryEntries = filterOrdinaryEntries(entries);
  const dayMs = 86400000;
  const nowMs = now.getTime();
  const dailyCounts = Array.from({ length: 7 }, () => 0);
  for (const entry of ordinaryEntries) {
    const timestamp = Date.parse(entry.date);
    const age = nowMs - timestamp;
    if (!Number.isFinite(timestamp) || age < 0 || age >= 7 * dayMs) continue;
    dailyCounts[6 - Math.floor(age / dayMs)] += 1;
  }
  const weeklyCount = dailyCounts.reduce((total, count) => total + count, 0);
  const maxDailyCount = Math.max(1, ...dailyCounts);
  const filteredEntries = ordinaryEntries.filter((e) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Journal') return e.kind === 'Journal';
    if (activeTab === 'Stories') return e.kind === 'Story';

    return true;
  });

  const visibleEntries = filterOrdinaryEntries(filteredEntries);

  return (
    <div className="stitch-journal-home">
      {/* Main Stream */}
      <main className="stitch-main-stream" data-ordinary-page-scroll="home" data-testid="ordinary-page-scroll-home">
        {/* Temporal Greeting */}
        <section className="temporal-greeting-section">
          <div className="temporal-date-row">
            <span className="temporal-date">{new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}</span>

          </div>

          <h1 className="greeting-headline">{greeting}{displayName.trim() ? `, ${displayName.trim()}` : ''}</h1>
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

        {/* Reflection question */}
        {activeTab === 'All' && (
          <section className="daily-reflection-card">
            <div className="reflection-card-header">
              <span className="reflection-tag">
                <Sparkles size={11} />
                <span>Reflection question</span>
              </span>
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
            <div className="home-quick-actions" role="group" aria-label="Quick actions">
              <button type="button" className="home-quick-action" onClick={() => onQuickCreateLibraryItem('note')}>
                <StickyNote size={14} aria-hidden="true" />
                <span>Quick note</span>
              </button>
              <button type="button" className="home-quick-action" onClick={() => onQuickCreateLibraryItem('task')}>
                <CheckSquare size={14} aria-hidden="true" />
                <span>Task</span>
              </button>
            </div>
          </section>
        )}

        <div className="home-collection-stacks" aria-label="Your collections">
          {(['Journal', 'Stories'] as const).map(title => (
            <EntryStack
              key={title}
              title={title}
              entries={visibleEntries.filter(e => e.kind === (title === 'Journal' ? 'Journal' : 'Story'))}
              expanded={openCollection === title}
              onToggle={() => setOpenCollection(current => current === title ? null : title)}
              controls={spreadId}
            />
          ))}
        </div>
        {openCollection && (
          <EntrySpread
            id={spreadId}
            title={openCollection}
            entries={visibleEntries.filter(e => e.kind === (openCollection === 'Journal' ? 'Journal' : 'Story'))}
            onSelectEntry={onSelectEntry}
          />
        )}
        <section className="home-latest-writing" aria-labelledby="home-latest-writing-title">
          <div className="home-latest-writing-heading">
            <h2 id="home-latest-writing-title">Your latest writing</h2>
            <span>{visibleEntries.length} {visibleEntries.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          {visibleEntries.length ? <div className="home-latest-writing-list">
            {visibleEntries.slice(0, 3).map(entry => <OrdinaryEntryCard key={`latest-${entry.id}`} entry={entry} onSelect={onSelectEntry} />)}
          </div> : <p className="home-latest-writing-empty">Your saved entries will appear here.</p>}
        </section>
        {/* Recent writing count and seven rolling 24-hour buckets */}
        <section className="clarity-rhythm-card">
          <div className="clarity-left">
            <div className="clarity-icon-circle">
              <Compass size={17} />
            </div>
            <div className="clarity-text">
              <h4>Recent writing</h4>
              <p>{weeklyCount} {weeklyCount === 1 ? 'entry' : 'entries'} in the past 7 days</p>
            </div>
          </div>

          <div className="clarity-bars-visualizer" role="img" aria-label={`Entry counts by rolling 24-hour period, oldest to newest: ${dailyCounts.map((count, index) => `${count} ${count === 1 ? 'entry' : 'entries'}`).join(', ')}`}>
            {dailyCounts.map((count, index) => <span key={index} style={{ height: count === 0 ? '0px' : `${Math.max(4, Math.round((count / maxDailyCount) * 28))}px` }} />)}
          </div>
        </section>
      </main>
    </div>
  );
};
