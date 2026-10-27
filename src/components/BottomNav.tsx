import React from 'react';
import {
  BookOpen,
  Layers,
  Edit3,
  LibraryBig,
} from 'lucide-react';

type Props = {
  currentView: 'home' | 'leaves' | 'stories' | 'library' | 'compose' | 'vault' | 'inspector';
  onNavigate: (view: 'home' | 'leaves' | 'stories' | 'library' | 'compose') => void;
};

export const BottomNav: React.FC<Props> = ({ currentView, onNavigate }) => {
  return (
    <nav className="stitch-bottom-dock" aria-label="Main Navigation" data-ordinary-navigation-dock="true" data-testid="ordinary-navigation-dock">
      <div className="dock-inner-container">
        {/* Home */}
        <button
          className={`dock-item-btn ${currentView === 'home' ? 'active' : ''}`}
          aria-current={currentView === 'home' ? 'page' : undefined}
          onClick={() => onNavigate('home')}
          aria-label="Home"
        >
          <div className="dock-icon-wrapper">
            <BookOpen size={18} />
          </div>
          <span className="dock-label">Home</span>
        </button>

        {/* Journal */}
        <button
          className={`dock-item-btn ${currentView === 'leaves' ? 'active' : ''}`}
          aria-current={currentView === 'leaves' ? 'page' : undefined}
          onClick={() => onNavigate('leaves')}
          aria-label="Journal"
        >
          <div className="dock-icon-wrapper">
            <Layers size={18} />
          </div>
          <span className="dock-label">Journal</span>
        </button>

        {/* Write */}
        <button
          className="dock-compose-btn"
          onClick={() => onNavigate('compose')}
          aria-label="Write"
        >
          <Edit3 size={20} />
        </button>

        {/* Stories */}
        <button
          className={`dock-item-btn ${currentView === 'stories' ? 'active' : ''}`}
          aria-current={currentView === 'stories' ? 'page' : undefined}
          onClick={() => onNavigate('stories')}
          aria-label="Stories"
        >
          <div className="dock-icon-wrapper">
            <Layers size={18} />
          </div>
          <span className="dock-label">Stories</span>
        </button>

        {/* Library */}
        <button
          className={`dock-item-btn ${currentView === 'library' ? 'active' : ''}`}
          aria-current={currentView === 'library' ? 'page' : undefined}
          onClick={() => onNavigate('library')}
          aria-label="Library"
        >
          <div className="dock-icon-wrapper">
            <LibraryBig size={18} />
          </div>
          <span className="dock-label">Library</span>
        </button>
      </div>
    </nav>
  );
};
