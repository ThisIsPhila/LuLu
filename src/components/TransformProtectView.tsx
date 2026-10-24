import React, { useState } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  Image,
  Mic,
  Lock,
  Sparkles,
  ArrowRight,
  Shield,
  User,
  MapPin,
  Clock,
  Shuffle,
  ShieldCheck,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entity } from '../domain/transform';
import { useWritingViewport } from '../hooks/useWritingViewport';
import { transform, recognised } from '../domain/transform';

type Props = {
  entities: Entity[];
  onBack: () => void;
  onSaveProtected: (data: {
    title: string;
    body: string;
    originalBody: string;
    kind: 'Journal' | 'Story';
  }) => void;
  onOpenEntityInspector: () => void;
};

export const TransformProtectView: React.FC<Props> = ({
  entities,
  onBack,
  onSaveProtected,
  onOpenEntityInspector,
}) => {
  const viewport = useWritingViewport();
  const [naturalText, setNaturalText] = useState(
    "David came to my place yesterday and threatened me. I'm worried about what might happen next..."
  );
  const [title, setTitle] = useState('An evening account');
  const [isSaved, setIsSaved] = useState(false);

  // Derive transformed text
  const transformedText = transform(naturalText, entities, {
    perspectiveDistancing: true,
  });

  const wordsCount = naturalText.trim().split(/\s+/).filter(Boolean).length;

  const handleSave = () => {
    onSaveProtected({
      title: title || 'An evening account',
      body: transformedText,
      originalBody: naturalText,
      kind: 'Journal',
    });
    setIsSaved(true);
  };

  return (
    <div className="transform-protect-screen keyboard-writing-screen" style={viewport}>
      {/* Header */}
      <header className="transform-header">
        <button className="icon-btn-round" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="header-brand-title"><LuLuLogo size="sm" /></div>
        <div className="header-avatar-circle">
          <User size={15} />
        </div>
      </header>

      {/* Main Flow */}
      <main className="transform-flow-body">
        {/* Date Row */}
        <div className="composer-date-row">
          <div>
            <h2 className="composer-day">Today</h2>
            <span className="composer-date-sub">Mon, 14 Apr 2025</span>
          </div>
          <button className="icon-btn-ghost">
            <MoreHorizontal size={18} />
          </button>
        </div>

<div className="composer-processing-panel">        {/* 3. Protected Version Vault Card (Obsidian Dark) */}
        <div className="protected-vault-card">
          <div className="vault-glow-ambient" />
          <div className="vault-card-header">
            <div className="vault-lock-badge">
              <Lock size={14} />
            </div>
            <div className="vault-titles">
              <h3>Protected Version</h3>
              <p>Same meaning. Identifying details removed.</p>
            </div>
          </div>

          <div className="protected-body-rendered">
            {transformedText || "Your transformed writing will appear here."}
          </div>

          <div className="vault-card-footer">
            <div className="shelf-tools-dark">
              <Image size={15} />
              <Mic size={15} />
              <MoreHorizontal size={15} />
            </div>
            <div className="sync-badge">
              <span className="green-dot" />
              <span>Live preview</span>
            </div>
          </div>
        </div>

        <details className="cloaking-ledger-section compact-processing-ledger">
          <summary>Representations · {recognised(naturalText, entities).length} recognised</summary>
          {recognised(naturalText, entities).map(entity => (
            <button key={entity.id} className="cloaking-item" onClick={onOpenEntityInspector}>
              <span className="item-labels"><span className="item-type">{entity.type}</span><span>{entity.original}</span></span>
              <ArrowRight size={12} /><span className="item-alias-capsule">{entity.alias}</span>
            </button>
          ))}
        </details>

</div><div className="composer-input-dock">        {/* 1. Original Entry Card (Warm Paper) */}
        <div className="original-entry-card">
          <div className="card-top-meta">
            <div className="source-badge">
              <span className="dot-orange" />
              <span>Original Entry · Your Natural Words</span>
            </div>
            <span className="timestamp">{wordsCount} words</span>
          </div>

          <textarea
            className="original-natural-textarea"
            aria-label="Write your entry"
            value={naturalText}
            onChange={(e) => setNaturalText(e.target.value)}
            rows={4}
            placeholder="Write naturally in your own words..."
          />

          <div className="card-bottom-shelf">
            <div className="shelf-tools">
              <button className="shelf-tool-btn" title="Image">
                <Image size={15} />
              </button>
              <button className="shelf-tool-btn" title="Mic">
                <Mic size={15} />
              </button>
              <button className="shelf-tool-btn" title="Options">
                <MoreHorizontal size={15} />
              </button>
            </div>
            <button className="save-protected-btn composer-save" onClick={handleSave} disabled={!naturalText.trim()}><ShieldCheck size={15} /><span>Save entry</span></button>
          </div>
        </div>

</div>
      </main>
    </div>
  );
};
