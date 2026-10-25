import React, { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Headphones,
  Palette,
  Type,
  Shield,
  Volume2,
  VolumeX,
  Pencil,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entry } from '../domain/journal';
import type { Entity } from '../domain/transform';
import { transform } from '../domain/transform';

type Props = {
  entry: Entry;
  protectedMode: boolean;
  entities: Entity[];
  onBack: () => void;
  onEdit: () => void;
  onEnterProtected: () => void;
  onExitProtected: () => void;
};

export const ReaderView: React.FC<Props> = ({
  entry,
  protectedMode,
  entities,
  onBack,
  onEdit,
  onEnterProtected,
  onExitProtected,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [fontSize, setFontSize] = useState<'regular' | 'large'>('regular');
  const [colorTheme, setColorTheme] = useState<'paper' | 'stone' | 'dark'>('paper');

  const hasOriginal = Boolean(entry.originalBody && protectedMode);

  let displayText = entry.body;
  if (showOriginal && hasOriginal) {
    displayText = entry.originalBody!;
  }

  return (
    <div className={`story-reading-screen theme-${colorTheme}`}>
      {/* Top Header */}
      <header className="reading-header">
        <button className="icon-btn-round" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="header-brand-title">
          <LuLuLogo size="sm" />
          <span className="composer-label">Story View</span>
        </div>
        <div className="header-right-tools">
          <button className="icon-btn-round" onClick={onEdit} title={entry.protected ? 'Protected entry editing is not available yet' : 'Edit entry'} aria-label={entry.protected ? 'Protected entry editing is not available yet' : 'Edit entry'}>
            <Pencil size={16} />
          </button>
          <button
            className={`icon-btn-round ${protectedMode ? 'active-green' : ''}`}
            onClick={protectedMode ? onExitProtected : onEnterProtected}
            title={protectedMode ? 'Exit Protected Vault' : 'Authenticate Passkey'}
          >
            <Shield size={16} />
          </button>
        </div>
      </header>

      {/* Reader Body */}
      <main className="reading-content-container">
        {/* Date & Mode Meta */}
        <div className="reading-meta-bar">
          <span className="reading-date-timestamp">• 12 May 2026 • 21:36</span>

          {entry.protected && (
            <button
              className={`original-pill-toggle ${showOriginal ? 'active' : ''}`}
              onClick={() => {
                if (!protectedMode) {
                  onEnterProtected();
                } else {
                  setShowOriginal(!showOriginal);
                }
              }}
            >
              <Eye size={12} />
              <span>{showOriginal ? 'CONCEALED' : 'ORIGINAL'} • 3 min</span>
            </button>
          )}
        </div>

        {/* Category Pill */}
        <div className="reading-tag-capsule">
          <span>EVENING REFLECTION • Quiet mood</span>
        </div>

        {/* Title */}
        <h1 className="reading-main-title">{entry.title}</h1>

        {showOriginal && (
          <div className="author-unmasked-banner">
            <Unlock size={14} />
            <span>Author original intent unmasked (Private Enclave Active)</span>
          </div>
        )}

        {/* Prose */}
        <article className={`reading-prose font-size-${fontSize}`}>
          {displayText.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>

        {/* Separator Dots */}
        <div className="reading-separator-dots" aria-hidden="true">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>

        {/* Identified Entities Card (Screen Reading Mode) */}
        {entry.protected && (
          <div className="identified-entities-card">
            <div className="entities-card-header">
              <div className="entities-title-row">
                <Shield size={14} className="shield-icon-stone" />
                <span>IDENTIFIED ENTITIES</span>
              </div>
              <span className="encrypted-tag">3 Encrypted</span>
            </div>

            <div className="entities-chips-list">
              <span className="entity-chip-pill">• John [Person]</span>
              <span className="entity-chip-pill">• The Nest [Place]</span>
              <span className="entity-chip-pill">• Blue Moon [Context]</span>
            </div>
          </div>
        )}
      </main>

      {/* Audio Simulation Indicator */}
      {isPlayingAudio && (
        <div className="audio-playing-indicator">
          <Volume2 size={15} />
          <span>Reading aloud in natural calm cadence...</span>
        </div>
      )}

      {/* Floating Circular Reader Dock (Screen Reading Mode) */}
      <footer className="circular-reader-dock" aria-label="Reader tools">
        <button
          className={`circle-tool-btn ${isPlayingAudio ? 'active' : ''}`}
          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
          title="Listen"
        >
          {isPlayingAudio ? <VolumeX size={17} /> : <Headphones size={17} />}
        </button>

        <button
          className="circle-tool-btn"
          onClick={() =>
            setColorTheme(colorTheme === 'paper' ? 'stone' : colorTheme === 'stone' ? 'dark' : 'paper')
          }
          title="Theme"
        >
          <Palette size={17} />
        </button>

        <button
          className="circle-tool-btn"
          onClick={() => setFontSize(fontSize === 'regular' ? 'large' : 'regular')}
          title="Typography"
        >
          <Type size={17} />
        </button>

        <button
          className={`circle-tool-btn lock-btn ${protectedMode ? 'active-vault' : ''}`}
          onClick={protectedMode ? onExitProtected : onEnterProtected}
          title={protectedMode ? 'Exit Protected Vault' : 'Authenticate Passkey'}
        >
          <Lock size={17} />
        </button>
      </footer>
    </div>
  );
};
