import React from 'react';
import { Plus, Search, Lock, Heart, ArrowUpRight, ShieldCheck, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { Entry } from '../domain/journal';
import { LuLuLogo } from './Logo';

type JournalHomeProps = {
  entries: Entry[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewEntry: () => void;
  onSelectEntry: (entry: Entry) => void;
  onOpenProtectedGate: () => void;
  protectedMode: boolean;
  onOpenSearch: () => void;
};

export const JournalHome: React.FC<JournalHomeProps> = ({
  entries,
  activeTab,
  onTabChange,
  onNewEntry,
  onSelectEntry,
  onOpenProtectedGate,
  protectedMode,
  onOpenSearch,
}) => {
  const tabs = ['All', 'Journal', 'Stories', 'Private'];

  // Filter entries according to active tab
  const filtered = entries.filter((e) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Journal') return e.kind === 'Journal';
    if (activeTab === 'Stories') return e.kind === 'Story';
    if (activeTab === 'Private') return e.protected;
    return true;
  });

  const todayEntries = filtered.filter((e) => e.groupDate === 'Today');
  const pastEntries = filtered.filter((e) => e.groupDate !== 'Today');

  return (
    <div className="journal-home-screen">
      {/* App Header */}
      <header className="journal-topbar">
        <LuLuLogo size="md" />

        <div className="topbar-actions">
          <button className="icon-btn search-trigger-btn" onClick={onOpenSearch} aria-label="Search">
            <Search size={18} />
          </button>
          <button className="icon-btn-primary add-entry-btn" onClick={onNewEntry} aria-label="New Entry">
            <Plus size={19} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="journal-tabs" aria-label="Entry categories">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Protected Session Status Indicator if unlocked */}
      {protectedMode && (
        <div className="protected-banner-active">
          <div className="banner-left">
            <ShieldCheck size={14} className="banner-icon" />
            <span>Protected writing session active • Real mappings accessible</span>
          </div>
        </div>
      )}

      {/* Main Journal Content Scroll */}
      <main className="journal-timeline">
        {/* Featured / Stacked Card (Screen 05 in Image 02) */}
        {activeTab === 'All' && (
          <div className="featured-card-stack" onClick={onNewEntry}>
            <div className="stack-layer layer-3" />
            <div className="stack-layer layer-2" />
            <div className="stack-card-front">
              <div className="stack-card-head">
                <span className="card-tag">Today</span>
                <span className="card-date-sub">24 October 2026</span>
              </div>
              <p className="stack-card-quote">
                “Some days arrive quietly, while others leave a mark. Write what happened, on your terms.”
              </p>
              <div className="stack-card-footer">
                <span className="prompt-pill">Tap to capture a moment...</span>
                <Plus size={14} />
              </div>
            </div>
          </div>
        )}

        {/* Today Group */}
        {todayEntries.length > 0 && (
          <section className="timeline-group">
            <h3 className="group-heading">Today</h3>
            <div className="entry-card-list">
              {todayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="entry-row-card"
                  onClick={() => onSelectEntry(entry)}
                >
                  <div className="entry-card-body">
                    <div className="entry-title-row">
                      <h4 className="entry-title">{entry.title}</h4>
                      <span className="entry-time">{entry.timeStr}</span>
                    </div>
                    <p className="entry-snippet">{entry.body}</p>
                  </div>
                  <div className="entry-card-aside">
                    {entry.protected && (
                      <span className="lock-indicator" title="Protected narrative">
                        <Lock size={12} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past / Earlier Group */}
        {pastEntries.length > 0 && (
          <section className="timeline-group">
            <h3 className="group-heading">Earlier</h3>
            <div className="entry-card-list">
              {pastEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="entry-row-card"
                  onClick={() => onSelectEntry(entry)}
                >
                  <div className="entry-card-body">
                    <div className="entry-title-row">
                      <h4 className="entry-title">{entry.title}</h4>
                      <span className="entry-time">{entry.timeStr}</span>
                    </div>
                    <p className="entry-snippet">{entry.body}</p>
                  </div>
                  <div className="entry-card-aside">
                    {entry.protected && (
                      <span className="lock-indicator" title="Protected narrative">
                        <Lock size={12} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>No entries found in this collection.</p>
            <button className="primary-btn" onClick={onNewEntry}>
              Write something
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
