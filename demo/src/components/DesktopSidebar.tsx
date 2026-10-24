import React from 'react';
import {
  Home,
  Search,
  BookOpen,
  Users,
  MapPin,
  Clock,
  Settings,
  Shield,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { LuLuLogo, LuLuAppIcon } from './Logo';

type DesktopSidebarProps = {
  activeView: 'home' | 'search' | 'library' | 'edit';
  onNavigate: (view: 'home' | 'search' | 'library' | 'edit') => void;
  protectedMode: boolean;
  onOpenProtectedGate: () => void;
  onExitProtected: () => void;
  onNewEntry: () => void;
};

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeView,
  onNavigate,
  protectedMode,
  onOpenProtectedGate,
  onExitProtected,
  onNewEntry,
}) => {
  return (
    <aside className="desktop-sidebar" aria-label="Main Navigation">
      <div className="sidebar-brand-row">
        <LuLuLogo size="md" />
      </div>

      <button className="sidebar-new-btn" onClick={onNewEntry}>
        <Plus size={16} />
        <span>New Entry</span>
      </button>

      <nav className="sidebar-nav-links">
        <button
          className={`sidebar-link ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <Home size={17} />
          <span>Home</span>
        </button>

        <button
          className={`sidebar-link ${activeView === 'search' ? 'active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          <Search size={17} />
          <span>Search</span>
        </button>

        <button
          className={`sidebar-link ${activeView === 'library' ? 'active' : ''}`}
          onClick={() => onNavigate('library')}
        >
          <BookOpen size={17} />
          <span>Library</span>
        </button>

        <div className="sidebar-section-divider" />
        <span className="sidebar-section-title">METADATA</span>

        <button
          className="sidebar-link"
          onClick={() => onNavigate('library')}
        >
          <Users size={17} />
          <span>People</span>
        </button>

        <button
          className="sidebar-link"
          onClick={() => onNavigate('library')}
        >
          <MapPin size={17} />
          <span>Places</span>
        </button>

        <button
          className="sidebar-link"
          onClick={() => onNavigate('library')}
        >
          <Clock size={17} />
          <span>Topics</span>
        </button>
      </nav>

      {/* Protected Session Control */}
      <div className="sidebar-protected-box">
        <button
          className={`sidebar-protect-toggle ${protectedMode ? 'active' : ''}`}
          onClick={protectedMode ? onExitProtected : onOpenProtectedGate}
        >
          {protectedMode ? (
            <>
              <ShieldCheck size={16} className="text-emerald" />
              <div className="protect-info">
                <strong>Session Active</strong>
                <span>Passkey authenticated</span>
              </div>
            </>
          ) : (
            <>
              <Shield size={16} />
              <div className="protect-info">
                <strong>Protected Mode</strong>
                <span>Click to authenticate</span>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Footer Profile */}
      <div className="sidebar-footer-profile">
        <div className="profile-avatar">P</div>
        <div className="profile-info">
          <span className="profile-name">Phila</span>
          <span className="profile-role">Author</span>
        </div>
        <button className="icon-btn-ghost" title="Settings">
          <Settings size={15} />
        </button>
      </div>
    </aside>
  );
};
