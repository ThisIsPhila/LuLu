import React, { useState, useEffect, useSyncExternalStore } from 'react';
import type { Entry } from './domain/journal';
import { loadEntries, persistEntries } from './domain/journal';
import type { Entity, EntityType } from './domain/transform';
import { initialEntities } from './domain/transform';
import { JournalHome } from './components/JournalHome';
import { EditorView } from './components/EditorView';
import { ReaderView } from './components/ReaderView';
import { LibraryView } from './components/LibraryView';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { ProtectedGateModal } from './components/ProtectedGateModal';
import { EntityControlsSheet } from './components/EntityControlsSheet';

const desktopQuery = '(min-width: 1024px)';
function subscribeToViewport(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function isDesktopViewport() { return window.matchMedia(desktopQuery).matches; }

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());
  const [entities, setEntities] = useState<Entity[]>(initialEntities);
  const desktop = useSyncExternalStore(subscribeToViewport, isDesktopViewport, () => false);

  // Navigation and screen routing
  const [activeNav, setActiveNav] = useState<'home' | 'search' | 'library' | 'edit'>('home');
  const [activeScreen, setActiveScreen] = useState<'list' | 'editor' | 'reader'>('list');
  const [activeTab, setActiveTab] = useState<string>('All');

  // Selected item / draft
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [draftEntry, setDraftEntry] = useState<Partial<Entry> | null>(null);

  // Protected Mode & Modals
  const [protectedMode, setProtectedMode] = useState<boolean>(false);
  const [isProtectedGateOpen, setIsProtectedGateOpen] = useState<boolean>(false);
  const [isEntityControlsOpen, setIsEntityControlsOpen] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');

  // Persist entries on change
  useEffect(() => {
    persistEntries(entries);
  }, [entries]);

  // Notice auto-clear
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleNewEntry = () => {
    setDraftEntry({
      title: '',
      body: '',
      kind: activeTab === 'Stories' ? 'Story' : 'Journal',
      protected: protectedMode,
      perspective: protectedMode ? 'third' : 'first',
    });
    setActiveScreen('editor');
  };

  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setActiveScreen('reader');
  };

  const handleSaveEntry = (data: {
    title: string;
    body: string;
    originalBody?: string;
    kind: 'Journal' | 'Story';
    protected: boolean;
    perspective: 'first' | 'third';
  }) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (draftEntry && 'id' in draftEntry && draftEntry.id) {
      // Update existing
      setEntries((prev) =>
        prev.map((e) =>
          e.id === draftEntry.id
            ? {
                ...e,
                ...data,
              }
            : e
        )
      );
      setNotice('Entry updated successfully.');
    } else {
      // Create new
      const newEntry: Entry = {
        id: 'entry-' + Date.now(),
        title: data.title,
        body: data.body,
        originalBody: data.originalBody,
        kind: data.kind,
        date: now.toISOString(),
        timeStr,
        groupDate: 'Today',
        favorite: false,
        protected: data.protected,
        perspective: data.perspective,
      };
      setEntries((prev) => [newEntry, ...prev]);
      setNotice(data.protected ? 'Protected entry saved with narrative distancing.' : 'Entry saved.');
    }

    setDraftEntry(null);
    setActiveScreen('list');
    setActiveNav('home');
  };

  const handleFavorite = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e))
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this entry?')) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setActiveScreen('list');
      setNotice('Entry deleted.');
    }
  };

  const handleUpdateEntityAlias = (entityId: string, newAlias: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === entityId ? { ...e, alias: newAlias } : e))
    );
    setNotice(`Updated alias to "${newAlias}".`);
  };

  const handleAddEntity = (newEntity: { original: string; alias: string; type: EntityType }) => {
    const created: Entity = {
      id: 'entity-' + Date.now(),
      original: newEntity.original,
      alias: newEntity.alias,
      type: newEntity.type,
      mentions: 1,
    };
    setEntities((prev) => [...prev, created]);
    setNotice(`Added association for ${newEntity.original}.`);
  };

  const handleProtectedSuccess = () => {
    setProtectedMode(true);
    setIsProtectedGateOpen(false);
    setNotice('Passkey verified. Protected writing environment active.');
  };

  const handleExitProtected = () => {
    setProtectedMode(false);
    setNotice('Protected session closed. Local private mappings concealed.');
  };

  // App screens adapt to the browser viewport without a demonstration shell.
  const renderScreenContent = () => {
    if (activeScreen === 'editor') {
      return (
        <EditorView
          initialEntry={draftEntry || {}}
          protectedMode={protectedMode}
          entities={entities}
          onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
          onOpenEntityControls={() => setIsEntityControlsOpen(true)}
          onBack={() => {
            setDraftEntry(null);
            setActiveScreen('list');
          }}
          onSave={handleSaveEntry}
          onUpdateEntityAlias={handleUpdateEntityAlias}
        />
      );
    }

    if (activeScreen === 'reader' && selectedEntry) {
      return (
        <ReaderView
          entry={selectedEntry}
          protectedMode={protectedMode}
          entities={entities}
          onBack={() => {
            setSelectedEntry(null);
            setActiveScreen('list');
          }}
          onEdit={() => {
            setDraftEntry(selectedEntry);
            setActiveScreen('editor');
          }}
          onFavorite={() => handleFavorite(selectedEntry.id)}
          onDelete={() => handleDelete(selectedEntry.id)}
          onExitProtected={handleExitProtected}
          onEnterProtected={() => setIsProtectedGateOpen(true)}
        />
      );
    }

    // List Views
    if (activeNav === 'library' || activeNav === 'search') {
      return (
        <LibraryView
          entries={entries}
          entities={entities}
          protectedMode={protectedMode}
          onSelectEntry={handleSelectEntry}
          onNewEntry={handleNewEntry}
          onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
        />
      );
    }

    return (
      <JournalHome
        entries={entries}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewEntry={handleNewEntry}
        onSelectEntry={handleSelectEntry}
        onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
        protectedMode={protectedMode}
        onOpenSearch={() => setActiveNav('search')}
      />
    );
  };

  return (
    <div className="lulu-app-root">
      {notice && (
        <aside className="global-toast" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">✕</button>
        </aside>
      )}
      <div className="app-layout">
        {desktop && (
          <DesktopSidebar
            activeView={activeNav}
            onNavigate={(nav) => {
              if (nav === 'edit') handleNewEntry();
              else { setActiveNav(nav); setActiveScreen('list'); }
            }}
            protectedMode={protectedMode}
            onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
            onExitProtected={handleExitProtected}
            onNewEntry={handleNewEntry}
          />
        )}
        <div className={`app-content ${desktop ? 'wide' : 'compact'}`}>
          {renderScreenContent()}
          {!desktop && activeScreen === 'list' && (
            <BottomNav
              currentView={activeNav}
              onNavigate={(nav) => {
                if (nav === 'edit') handleNewEntry();
                else { setActiveNav(nav); setActiveScreen('list'); }
              }}
              protectedMode={protectedMode}
              onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
              onExitProtected={handleExitProtected}
            />
          )}
        </div>
      </div>

      {/* Protected Gate Passkey Modal (Screen C) */}
      <ProtectedGateModal
        isOpen={isProtectedGateOpen}
        onClose={() => setIsProtectedGateOpen(false)}
        onSuccess={handleProtectedSuccess}
      />

      {/* Entity Controls Sheet (Screen E) */}
      <EntityControlsSheet
        isOpen={isEntityControlsOpen}
        onClose={() => setIsEntityControlsOpen(false)}
        entities={entities}
        onUpdateEntity={handleUpdateEntityAlias}
        onAddEntity={handleAddEntity}
      />
    </div>
  );
}
