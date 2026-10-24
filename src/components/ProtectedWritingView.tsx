import React, { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Type,
  Image,
  Mic,
  Hash,
  Sparkles,
  ChevronRight,
  Shield,
  Check,
} from 'lucide-react';
import { useWritingViewport } from '../hooks/useWritingViewport';
import { transform, initialEntities } from '../domain/transform';
import { LuLuLogo } from './Logo';

type Props = {
  onBack: () => void;
  onOpenEntityInspector: () => void;
  onDone: () => void;
};

export const ProtectedWritingView: React.FC<Props> = ({
  onBack,
  onOpenEntityInspector,
  onDone,
}) => {
  const viewport = useWritingViewport();
  const [isMasked, setIsMasked] = useState(true);
  const [bodyText, setBodyText] = useState(
    'Started the day with a walk. The air was crisp and it helped me think more clearly about what I want to work on this month.\n\nI met up with David later and we discussed a few ideas for the project at my place. It felt like a good conversation and I left feeling motivated for this month.'
  );

  return (
    <div className="protected-writing-screen keyboard-writing-screen" style={viewport}>
      {/* Top Header */}
      <header className="enclave-header">
        <button className="icon-btn-round" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <LuLuLogo size="sm" />
        <button className="done-pill-btn" onClick={onDone}>
          Done
        </button>
      </header>

      {/* Subheader Protection Banner */}
      <div className="enclave-status-banner">
        <div className="status-left">
          <span className="enclave-lock-icon">
            <Lock size={12} />
          </span>
          <div className="status-text-col">
            <div className="status-mode-row">
              <span className="green-dot" />
              <strong>PROTECTED MODE</strong>
              <span className="enclave-tag">ENCLAVE</span>
            </div>
            <span className="status-sub">Live pseudonymization active</span>
          </div>
        </div>

        <button
          className={`mask-toggle-btn ${isMasked ? 'active' : ''}`}
          onClick={() => setIsMasked(!isMasked)}
        >
          {isMasked ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>{isMasked ? 'Masked' : 'Unmasked'}</span>
        </button>
      </div>

      {/* Writing Paper Canvas */}
      <main className="enclave-writing-canvas">
        <div className="canvas-meta-row">
          <span className="canvas-date">14 APRIL 2026 • 09:14</span>
          <span className="canvas-words">
            <span className="green-dot-sm" /> 56 words
          </span>
        </div>

        <h1 className="canvas-title">A walk around the city</h1>

        <div className="canvas-body-prose"><p>{isMasked ? transform(bodyText, initialEntities, {perspectiveDistancing: true}) : bodyText}</p></div>
      </main>

      {/* Floating Enclave Feedback Toast */}
      <div className="floating-enclave-toast" onClick={onOpenEntityInspector}>
        <div className="toast-top-row">
          <div className="toast-icon-circle">
            <Sparkles size={14} />
          </div>
          <div className="toast-title-col">
            <div className="toast-title-line">
              <strong>3 entities transformed</strong>
              <span className="green-dot-sm" />
            </div>
            <span className="toast-sub">Zero knowledge representation</span>
          </div>
          <button className="btn-review-toast">Review all</button>
        </div>

        <div className="toast-bottom-lock-row">
          <Shield size={12} className="shield-icon" />
          <span>Original mentions (David, Cape Town) locked in Enclave</span>
          <Lock size={12} className="lock-sub-icon" />
        </div>
      </div>

      <div className="protected-input-dock"><label htmlFor="protected-draft">Your words</label><textarea id="protected-draft" value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Continue writing freely…" rows={3} /></div>
      {/* Bottom Writing Dock */}
      <footer className="enclave-dock">
        <button className="dock-icon-btn"><Type size={16} /></button>
        <button className="dock-icon-btn"><Image size={16} /></button>
        <button className="dock-icon-btn"><Mic size={16} /></button>
        <button className="dock-icon-btn"><Hash size={16} /></button>
        <div className="dock-separator" />
        <button className="dock-lock-action" onClick={onDone}>
          <Lock size={13} />
          <span>LOCK</span>
        </button>
      </footer>
    </div>
  );
};
