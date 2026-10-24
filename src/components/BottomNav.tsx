import React from 'react';
import {
  BookOpen,
  Layers,
  Edit3,
  Shield,
  ShieldCheck,
  Settings2,
  Lock,
} from 'lucide-react';

type Props = {
  currentView: 'home' | 'leaves' | 'compose' | 'vault' | 'inspector';
  onNavigate: (view: 'home' | 'leaves' | 'compose' | 'vault' | 'inspector') => void;
  protectedMode: boolean;
};

export const BottomNav: React.FC<Props> = ({ currentView, onNavigate, protectedMode }) => {
  return (
    <nav className="stitch-bottom-dock" aria-label="Main Navigation">
      <div className="dock-inner-container">
        {/* 1. Home / Journal */}
        <button
          className={`dock-item-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
          aria-label="Journal Home"
        >
          <div className="dock-icon-wrapper">
            <BookOpen size={18} />
          </div>
          <span className="dock-label">Home</span>
        </button>

        {/* 2. Leaves / Decks */}
        <button
          className={`dock-item-btn ${currentView === 'leaves' ? 'active' : ''}`}
          onClick={() => onNavigate('leaves')}
          aria-label="Story Leaves"
        >
          <div className="dock-icon-wrapper">
            <Layers size={18} />
          </div>
          <span className="dock-label">Leaves</span>
        </button>

        {/* 3. Center Compose Button */}
        <button
          className="dock-compose-btn"
          onClick={() => onNavigate('compose')}
          aria-label="Compose Entry"
        >
          <Edit3 size={20} />
        </button>

        {/* 4. Vault / Sanctuary */}
        <button
          className={`dock-item-btn ${currentView === 'vault' ? 'active' : ''} ${
            protectedMode ? 'enclave-unlocked' : ''
          }`}
          onClick={() => onNavigate('vault')}
          aria-label="Private Sanctuary Vault"
        >
          <div className="dock-icon-wrapper">
            {protectedMode ? <ShieldCheck size={18} className="text-sage" /> : <Shield size={18} />}
          </div>
          <span className="dock-label">Vault</span>
        </button>

        {/* 5. Entity Inspector */}
        <button
          className={`dock-item-btn ${currentView === 'inspector' ? 'active' : ''}`}
          onClick={() => onNavigate('inspector')}
          aria-label="Entity Inspector"
        >
          <div className="dock-icon-wrapper">
            <Settings2 size={18} />
          </div>
          <span className="dock-label">Inspector</span>
        </button>
      </div>
    </nav>
  );
};
