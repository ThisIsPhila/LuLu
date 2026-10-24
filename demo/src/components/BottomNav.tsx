import React from 'react';
import { Home, Search, Plus, BookOpen, Shield, ShieldCheck } from 'lucide-react';

type NavProps = {
  currentView: 'home' | 'search' | 'library' | 'edit';
  onNavigate: (view: 'home' | 'search' | 'library' | 'edit') => void;
  protectedMode: boolean;
  onOpenProtectedGate: () => void;
  onExitProtected: () => void;
};

export const BottomNav: React.FC<NavProps> = ({
  currentView,
  onNavigate,
  protectedMode,
  onOpenProtectedGate,
  onExitProtected,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom Navigation">
      <button
        className={`nav-tab-btn ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        <Home size={20} />
        <span>Home</span>
      </button>

      <button
        className={`nav-tab-btn ${currentView === 'search' ? 'active' : ''}`}
        onClick={() => onNavigate('search')}
      >
        <Search size={20} />
        <span>Search</span>
      </button>

      {/* Center Write Button */}
      <button
        className="nav-center-write-btn"
        onClick={() => onNavigate('edit')}
        aria-label="New Entry"
      >
        <Plus size={22} />
      </button>

      <button
        className={`nav-tab-btn ${currentView === 'library' ? 'active' : ''}`}
        onClick={() => onNavigate('library')}
      >
        <BookOpen size={20} />
        <span>Library</span>
      </button>

      <button
        className={`nav-tab-btn ${protectedMode ? 'active-protected' : ''}`}
        onClick={protectedMode ? onExitProtected : onOpenProtectedGate}
        aria-label={protectedMode ? 'Exit Protected Mode' : 'Enter Protected Mode'}
      >
        {protectedMode ? <ShieldCheck size={20} /> : <Shield size={20} />}
        <span>{protectedMode ? 'Private' : 'Protect'}</span>
      </button>
    </nav>
  );
};
