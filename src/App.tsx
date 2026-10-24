import React, { useState, useEffect } from 'react';
import type { Entry } from './domain/journal';
import { loadEntries, persistEntries, seed } from './domain/journal';
import type { Entity } from './domain/transform';
import { initialEntities } from './domain/transform';
import { JournalHome } from './components/JournalHome';
import { TransformProtectView } from './components/TransformProtectView';
import { ProtectedWritingView } from './components/ProtectedWritingView';
import { EntityInspectorView } from './components/EntityInspectorView';
import { ReaderView } from './components/ReaderView';
import { StoryLeavesView } from './components/StoryLeavesView';
import { PrivateSanctuaryView } from './components/PrivateSanctuaryView';
import { BottomNav } from './components/BottomNav';
import { ProtectedGateModal } from './components/ProtectedGateModal';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());
  const [entities, setEntities] = useState<Entity[]>(initialEntities);

  // Active view: 'home' | 'leaves' | 'compose' | 'enclave-writing' | 'vault' | 'inspector' | 'reader'
  const [currentView, setCurrentView] = useState<
    'home' | 'leaves' | 'compose' | 'enclave-writing' | 'vault' | 'inspector' | 'reader'
  >('home');

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Protected Mode & Modals
  const [protectedMode, setProtectedMode] = useState<boolean>(false);
  const [isProtectedGateOpen, setIsProtectedGateOpen] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');

  // Persist entries
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

  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setCurrentView('reader');
  };

  const handleSaveProtectedEntry = (data: {
    title: string;
    body: string;
    originalBody: string;
    kind: 'Journal' | 'Story';
  }) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const newEntry: Entry = {
      id: 'entry-' + Date.now(),
      title: data.title,
      body: data.body,
      originalBody: data.originalBody,
      kind: data.kind,
      date: now.toISOString(),
      timeStr,
      wordsCount: data.body.trim().split(/\s+/).length,
      groupDate: 'Today',
      tags: ['Protected', 'Enclave'],
      favorite: false,
      protected: true,
      perspective: 'third',
      entitiesRecognized: ['John', 'Blue Moon'],
    };

    setEntries((prev) => [newEntry, ...prev]);
    setProtectedMode(true);
    setNotice('Protected entry encrypted with your personal passkey.');
    setCurrentView('home');
  };

  const handleUpdateAlias = (id: string, newAlias: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, alias: newAlias } : e))
    );
    setNotice(`Updated representation to "${newAlias}".`);
  };

  const handleProtectedSuccess = () => {
    setProtectedMode(true);
    setIsProtectedGateOpen(false);
    setNotice('Biometric Passkey authenticated. Enclave memory active.');
  };

  const handleExitProtected = () => {
    setProtectedMode(false);
    setNotice('Protected session closed. Real-world mappings locked.');
  };

  return (
    <div className={`lulu-app-root ${currentView === 'vault' ? 'vault-dark-mode' : ''}`}>
      {/* Global Status Toast */}
      {notice && (
        <aside className="global-toast-stitch" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            ✕
          </button>
        </aside>
      )}

      {/* Main Responsive Application Shell (Edge-to-Edge with clean Max-Width) */}
      <div className="lulu-viewport-shell">
        {currentView === 'home' && (
          <JournalHome
            entries={entries}
            activeTab={activeCategoryTab}
            onTabChange={setActiveCategoryTab}
            onNewEntry={() => setCurrentView('compose')}
            onSelectEntry={handleSelectEntry}
            onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
            protectedMode={protectedMode}
            onOpenVault={() => setCurrentView('vault')}
          />
        )}

        {currentView === 'leaves' && (
          <StoryLeavesView
            entries={entries}
            onSelectEntry={handleSelectEntry}
            onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
          />
        )}

        {currentView === 'compose' && (
          <TransformProtectView
            entities={entities}
            onBack={() => setCurrentView('home')}
            onSaveProtected={handleSaveProtectedEntry}
            onOpenEntityInspector={() => setCurrentView('inspector')}
          />
        )}

        {currentView === 'enclave-writing' && (
          <ProtectedWritingView
            onBack={() => setCurrentView('home')}
            onOpenEntityInspector={() => setCurrentView('inspector')}
            onDone={() => setCurrentView('home')}
          />
        )}

        {currentView === 'vault' && (
          <PrivateSanctuaryView
            onQuickExit={() => setCurrentView('home')}
            onOpenJournal={() => setCurrentView('home')}
          />
        )}

        {currentView === 'inspector' && (
          <EntityInspectorView
            entities={entities}
            onBack={() => setCurrentView('home')}
            onUpdateAlias={handleUpdateAlias}
            onConfirm={() => {
              setNotice('Representations confirmed in Neural Enclave.');
              setCurrentView('home');
            }}
          />
        )}

        {currentView === 'reader' && selectedEntry && (
          <ReaderView
            entry={selectedEntry}
            protectedMode={protectedMode}
            entities={entities}
            onBack={() => {
              setSelectedEntry(null);
              setCurrentView('home');
            }}
            onEdit={() => setCurrentView('compose')}
            onEnterProtected={() => setIsProtectedGateOpen(true)}
            onExitProtected={handleExitProtected}
          />
        )}

        {/* Bottom Floating Navigation Dock (Hidden on Reader and Compose) */}
        {currentView !== 'reader' && currentView !== 'compose' && currentView !== 'enclave-writing' && (
          <BottomNav
            currentView={currentView as any}
            onNavigate={(view) => {
              if (view === 'compose') {
                setCurrentView('compose');
              } else {
                setCurrentView(view);
              }
            }}
            protectedMode={protectedMode}
          />
        )}
      </div>

      {/* Biometric Passkey Modal (Screen C) */}
      <ProtectedGateModal
        isOpen={isProtectedGateOpen}
        onClose={() => setIsProtectedGateOpen(false)}
        onSuccess={handleProtectedSuccess}
      />
    </div>
  );
}
