import React, { useEffect, useState } from 'react';
import { ArrowLeft, Menu, BookOpen, Layers, LibraryBig, PenLine } from 'lucide-react';
import { LuLuLogo } from './Logo';
import { OwnerAccountActivity } from './OwnerAccountActivity';
import { ProfileAvatar } from './ProfileAvatar';

export type HeaderNavigationView = 'home' | 'leaves' | 'stories' | 'library' | 'compose';
export type HeaderNavigationRequest = { type: 'back' } | { type: 'settings' } | { type: 'navigate'; view: HeaderNavigationView };

type Props = {
  notificationUid?: string;
  photoUrl?: string;
  onOpenSettings: () => void;
  onHome: () => void;
  onBack: () => void;
  currentView: string;
  showMobileMenu: boolean;
  showBackButton: boolean;
  onNavigate: (view: HeaderNavigationView) => void;
};

const navigationItems = [
  { view: 'home', label: 'Home', icon: BookOpen },
  { view: 'leaves', label: 'Journal', icon: Layers },
  { view: 'stories', label: 'Stories', icon: Layers },
  { view: 'library', label: 'Library', icon: LibraryBig },
] as const;
const mobileNavigationItems = [
  { view: 'home', label: 'Home', icon: BookOpen },
  { view: 'leaves', label: 'Journal', icon: Layers },
  { view: 'compose', label: 'Write', icon: PenLine },
  { view: 'stories', label: 'Stories', icon: Layers },
  { view: 'library', label: 'Library', icon: LibraryBig },
] as const;

/** Shared navigation header for LuLu's standard app pages. Private/immersive routes retain their own controls. */
export const OrdinaryNavigationHeader: React.FC<Props> = ({
  notificationUid,
  photoUrl,
  onOpenSettings,
  onHome,
  onBack,
  currentView,
  showMobileMenu,
  showBackButton,
  onNavigate,
}) => {
  const [isFloating, setIsFloating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const update = (event: Event) => {
      // Close the mobile dock menu as soon as the page scrolls.
      setMenuOpen(false);
      const target = event.target;
      const scrollTop = target instanceof Document
        ? target.scrollingElement?.scrollTop ?? window.scrollY
        : target instanceof HTMLElement ? target.scrollTop : 0;
      const next = scrollTop > 14;
      setIsFloating(current => current === next ? current : next);
    };
    document.addEventListener('scroll', update, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', update, true);
  }, []);

  // Reset floating state and close the menu when the view changes.
  useEffect(() => { setIsFloating(false); setMenuOpen(false); }, [currentView]);

  const toggleMenu = () => {
    setMenuOpen(open => {
      const next = !open;
      // Menu and notification panel are mutually exclusive.
      if (next) setNotifOpen(false);
      return next;
    });
  };

  const handleNotifOpenChange = (open: boolean) => {
    setNotifOpen(open);
    if (open) setMenuOpen(false);
  };

  const handleNavigate = (view: HeaderNavigationView) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <>
      <header
        className={`stitch-topbar ordinary-navigation-header${isFloating ? ' is-floating' : ''}`}
        data-ordinary-navigation-header="true"
        data-testid="ordinary-navigation-header"
        data-view={currentView}
        data-floating={isFloating ? 'true' : 'false'}
      >
        <div className="topbar-container">
          <div className="ordinary-header-brand">
            {showBackButton && <button type="button" className="topbar-circle-btn ordinary-header-back-button" aria-label="Go back" title="Go back" onClick={onBack}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>}
            {showMobileMenu && <button
              type="button"
              className="topbar-circle-btn ordinary-mobile-menu-button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <Menu size={18} aria-hidden="true" />
            </button>}
            <button type="button" className="ordinary-header-logo" aria-label="LuLu home" title="LuLu home" onClick={onHome}>
              <LuLuLogo size="sm" />
            </button>
          </div>
          <nav className="ordinary-desktop-links" aria-label="Main navigation">
            {navigationItems.map(item => (
              <button key={item.view} type="button" aria-current={currentView === item.view ? 'page' : undefined} onClick={() => onNavigate(item.view)}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="topbar-actions">
            <OwnerAccountActivity
              uid={notificationUid ?? 'local-preview'}
              enabled={Boolean(notificationUid)}
              onOpenSettings={onOpenSettings}
              open={notifOpen}
              onOpenChange={handleNotifOpenChange}
            />
            <button type="button" className="user-avatar-circle ordinary-profile-button" aria-label="Profile and settings" onClick={onOpenSettings}>
              <ProfileAvatar photoUrl={photoUrl} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <nav className="stitch-bottom-dock ordinary-mobile-dock-menu" aria-label="Main navigation" data-testid="ordinary-mobile-dock-menu">
          <div className="dock-inner-container">
            {mobileNavigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  className={item.view === 'compose' ? 'dock-compose-btn' : `dock-item-btn ${currentView === item.view ? 'active' : ''}`}
                  aria-current={currentView === item.view ? 'page' : undefined}
                  aria-label={item.label}
                  onClick={() => handleNavigate(item.view)}
                >
                  {item.view !== 'compose' && <><div className="dock-icon-wrapper"><Icon size={18} /></div><span className="dock-label">{item.label}</span></>}
                  {item.view === 'compose' && <Icon size={20} />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
