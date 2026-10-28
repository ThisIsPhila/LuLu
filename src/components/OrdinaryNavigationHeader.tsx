import React from 'react';
import { LogOut, Menu, Search, Settings2, UserRound } from 'lucide-react';
import { LuLuLogo } from './Logo';
import { OwnerAccountActivity } from './OwnerAccountActivity';

type Props = {
  protectedMode: boolean;
  notificationUid?: string;
  searchExpanded?: boolean;
  onSearch: () => void;
  onOpenVault: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  currentView: string;
  onNavigate: (view: 'home' | 'leaves' | 'stories' | 'library' | 'compose') => void;
};

const navigationItems = [
  { view: 'home', label: 'Home' }, { view: 'leaves', label: 'Journal' },
  { view: 'stories', label: 'Stories' }, { view: 'library', label: 'Library' },
  { view: 'compose', label: 'Write' },
] as const;

/** Shared ordinary-route navigation chrome. Immersive/private routes keep their own headers. */
export const OrdinaryNavigationHeader: React.FC<Props> = ({
  searchExpanded,
  notificationUid,
  onSearch,
  onOpenSettings,
  onSignOut,
  currentView,
  onNavigate,
}) => (
  <header className="stitch-topbar ordinary-navigation-header" data-ordinary-navigation-header="true" data-testid="ordinary-navigation-header">
    <div className="topbar-container">
      <div className="ordinary-header-brand">
        <details className="ordinary-mobile-menu">
          <summary className="topbar-circle-btn" aria-label="Open navigation menu"><Menu size={18} aria-hidden="true" /></summary>
          <nav className="ordinary-mobile-menu-panel" aria-label="Main navigation">{navigationItems.map(item => <button key={item.view} type="button" aria-current={currentView === item.view ? 'page' : undefined} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onNavigate(item.view); }}>{item.label}</button>)}</nav>
        </details>
        <LuLuLogo size="sm" />
      </div>
      <nav className="ordinary-desktop-links" aria-label="Main navigation">{navigationItems.map(item => <button key={item.view} type="button" aria-current={currentView === item.view ? 'page' : undefined} onClick={() => onNavigate(item.view)}>{item.label}</button>)}</nav>

      <div className="topbar-actions">
        {notificationUid && <OwnerAccountActivity uid={notificationUid} />}
        <button type="button" className="topbar-circle-btn ordinary-header-search" onClick={onSearch} aria-label="Search entries" aria-expanded={searchExpanded}>
          <Search size={16} aria-hidden="true" />
        </button>

        <button type="button" className="user-avatar-circle ordinary-mobile-profile" aria-label="Profile" onClick={onOpenSettings}><UserRound size={18} aria-hidden="true" /></button>
        <details className="account-menu ordinary-desktop-account">
          <summary className="user-avatar-circle" aria-label="Account menu" title="Account menu"><UserRound size={18} aria-hidden="true" /></summary>
          <div className="account-menu-panel">
            <span className="account-menu-label">Your account</span>
            <button type="button" onClick={onOpenSettings}><Settings2 size={16} aria-hidden="true" />Settings</button>
            <button type="button" onClick={onSignOut}><LogOut size={16} aria-hidden="true" />Sign out</button>
          </div>
        </details>
      </div>
    </div>
  </header>
);
