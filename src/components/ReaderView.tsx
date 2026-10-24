import React, { useState } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Type,
  Eye,
  EyeOff,
  Heart,
  Share2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type { Entry } from '../domain/journal';
import type { Entity } from '../domain/transform';
import { transform } from '../domain/transform';

type ReaderProps = {
  entry: Entry;
  protectedMode: boolean;
  entities: Entity[];
  onBack: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onExitProtected: () => void;
  onEnterProtected: () => void;
};

export const ReaderView: React.FC<ReaderProps> = ({
  entry,
  protectedMode,
  entities,
  onBack,
  onEdit,
  onFavorite,
  onDelete,
  onExitProtected,
  onEnterProtected,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [perspective, setPerspective] = useState<'first' | 'third'>(entry.perspective || 'third');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [fontSize, setFontSize] = useState<'regular' | 'large'>('regular');

  // If entry has original text and author is authenticated in protected mode, allow reveal
  const hasOriginal = Boolean(entry.originalBody && protectedMode);

  // Compute text to display
  let displayText = entry.body;
  if (showOriginal && hasOriginal) {
    displayText = entry.originalBody!;
  } else if (entry.protected) {
    displayText = transform(entry.originalBody || entry.body, entities, {
      perspectiveDistancing: perspective === 'third',
    });
  }

  const toggleListen = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  const formattedDate = entry.date
    ? new Date(entry.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '24 Oct 2026';

  return (
    <div className={`reader-screen ${entry.protected && protectedMode ? 'protected-reader' : ''}`}>
      {/* Top Header */}
      <header className="reader-header">
        <button className="icon-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>

        <div className="reader-date-meta">
          <span>{formattedDate}</span>
          {entry.timeStr && <span> • {entry.timeStr}</span>}
          {entry.protected && (
            <span className="reader-protected-chip">
              <Lock size={11} />
              <span>Concealed</span>
            </span>
          )}
        </div>

        <div className="reader-top-actions">
          <button
            className={`icon-btn ${entry.favorite ? 'favorited' : ''}`}
            onClick={onFavorite}
            aria-label="Favorite"
          >
            <Heart size={17} fill={entry.favorite ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-btn" onClick={onEdit} aria-label="Edit">
            Edit
          </button>
        </div>
      </header>

      {/* Reader Main Article */}
      <article className={`reader-article font-size-${fontSize}`}>
        <h1 className="reader-title">{entry.title}</h1>

        {showOriginal && hasOriginal ? (
          <div className="author-revealed-notice">
            <Unlock size={14} />
            <span>Author original intent revealed (passkey authenticated)</span>
          </div>
        ) : null}

        <div className="reader-body">
          {displayText.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>

      {/* Audio Simulation Indicator */}
      {isPlayingAudio && (
        <div className="audio-simulation-bar">
          <Volume2 size={15} className="audio-wave-icon" />
          <div className="audio-wave-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span>Reading aloud in calm neutral cadence...</span>
        </div>
      )}

      {/* Floating Reader Controls Pill (Screen F) */}
      <nav className="floating-reader-dock" aria-label="Reader tools">
        {entry.protected && (
          <button
            className={`dock-btn ${protectedMode ? 'active-lock' : ''}`}
            onClick={protectedMode ? onExitProtected : onEnterProtected}
            title={protectedMode ? 'Exit protected session' : 'Unlock private author view'}
          >
            {protectedMode ? <Unlock size={15} /> : <Lock size={15} />}
          </button>
        )}

        <button
          className={`dock-btn ${!showOriginal ? 'active' : ''}`}
          onClick={() => setShowOriginal(false)}
        >
          Read
        </button>

        {hasOriginal && (
          <button
            className={`dock-btn reveal-btn ${showOriginal ? 'active' : ''}`}
            onClick={() => setShowOriginal(!showOriginal)}
            title="Reveal author's original words"
          >
            {showOriginal ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>Original</span>
          </button>
        )}

        <button
          className={`dock-btn ${isPlayingAudio ? 'active' : ''}`}
          onClick={toggleListen}
          title="Listen to story"
        >
          {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
          <span>Listen</span>
        </button>

        {entry.protected && (
          <button
            className="dock-btn perspective-toggle-btn"
            onClick={() => setPerspective(perspective === 'first' ? 'third' : 'first')}
            title="Toggle 1st / 3rd person narrative distancing"
          >
            <span className="dock-tr-symbol">Tr</span>
            <span>{perspective === 'third' ? '3rd' : '1st'}</span>
          </button>
        )}

        <button
          className="dock-btn"
          onClick={() => setFontSize(fontSize === 'regular' ? 'large' : 'regular')}
          title="Toggle font size"
        >
          <Type size={15} />
        </button>
      </nav>
    </div>
  );
};
