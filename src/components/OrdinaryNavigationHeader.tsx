import React from 'react';
import { LogOut, Search, Settings2, UserRound } from 'lucide-react';
import { LuLuLogo } from './Logo';

type Props = {
  protectedMode: boolean;
  searchExpanded?: boolean;
  onSearch: () => void;
  onOpenVault: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

/** Shared ordinary-route navigation chrome. Immersive/private routes keep their own headers. */
export const OrdinaryNavigationHeader: React.FC<Props> = ({
  searchExpanded,
  onSearch,
  onOpenSettings,
  onSignOut,
}) => (
  <header className="stitch-topbar ordinary-navigation-header" data-ordinary-navigation-header="true" data-testid="ordinary-navigation-header">
    <div className="topbar-container">
      <LuLuLogo size="sm" />

      <div className="topbar-actions">
        <button type="button" className="topbar-circle-btn" onClick={onSearch} aria-label="Search entries" aria-expanded={searchExpanded}>
          <Search size={16} aria-hidden="true" />
        </button>

        <details className="account-menu">
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
