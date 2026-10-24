import React from 'react';
import { Smartphone, Monitor, Shield, ShieldCheck, RotateCcw } from 'lucide-react';

type PreviewToolbarProps = {
  displayMode: 'mobile' | 'desktop';
  onToggleDisplay: (mode: 'mobile' | 'desktop') => void;
  protectedMode: boolean;
  onOpenProtectedGate: () => void;
  onExitProtected: () => void;
  onResetSeed: () => void;
};

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  displayMode,
  onToggleDisplay,
  protectedMode,
  onOpenProtectedGate,
  onExitProtected,
  onResetSeed,
}) => {
  return (
    <header className="preview-top-toolbar" aria-label="Demo controls">
      <div className="toolbar-left">
        <span className="prototype-badge">LuLu Interactive Demo</span>
        <span className="prototype-sub">FNB Hackathon 2026 • Design Direction 02</span>
      </div>

      <div className="toolbar-center">
        <div className="segmented-preview-toggle">
          <button
            className={`seg-btn ${displayMode === 'mobile' ? 'active' : ''}`}
            onClick={() => onToggleDisplay('mobile')}
            title="Mobile Phone View (390px)"
          >
            <Smartphone size={14} />
            <span>Mobile Frame</span>
          </button>
          <button
            className={`seg-btn ${displayMode === 'desktop' ? 'active' : ''}`}
            onClick={() => onToggleDisplay('desktop')}
            title="Desktop / Responsive Web View"
          >
            <Monitor size={14} />
            <span>Desktop Web</span>
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <button
          className={`toolbar-protect-btn ${protectedMode ? 'active' : ''}`}
          onClick={protectedMode ? onExitProtected : onOpenProtectedGate}
        >
          {protectedMode ? (
            <>
              <ShieldCheck size={14} className="text-emerald" />
              <span>Passkey Active</span>
            </>
          ) : (
            <>
              <Shield size={14} />
              <span>Use Passkey</span>
            </>
          )}
        </button>

        <button
          className="toolbar-reset-btn"
          onClick={onResetSeed}
          title="Reset to default seed entries"
        >
          <RotateCcw size={13} />
          <span>Reset Data</span>
        </button>
      </div>
    </header>
  );
};
