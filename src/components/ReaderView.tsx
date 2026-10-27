import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Unlock,
  Eye,
  Palette,
  Type,
  Pencil,
  Shield,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entry } from '../domain/journal';
import { OrdinaryMediaAttachments } from './OrdinaryMediaAttachments';

type Props = {
  entry: Entry;
  mediaOwnerId: string;
  protectedMode: boolean;
  onBack: () => void;
  onEdit: () => void;
  onEnterProtected: () => void;
  storySequence?: readonly Entry[];
  onSelectStorySequenceEntry?: (entry: Entry) => void;
};

export const ReaderView: React.FC<Props> = ({
  entry,
  mediaOwnerId,
  protectedMode,
  onBack,
  onEdit,
  onEnterProtected,
  storySequence = [],
  onSelectStorySequenceEntry,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [fontSize, setFontSize] = useState<'regular' | 'large'>('regular');
  const [colorTheme, setColorTheme] = useState<'paper' | 'stone' | 'dark'>('paper');
  const storySequenceIndex = storySequence.findIndex(item => item.id === entry.id);
  const hasStorySequence = entry.kind === 'Story' && storySequence.length > 1 && storySequenceIndex >= 0 && Boolean(onSelectStorySequenceEntry);

  useEffect(() => {
    setShowOriginal(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [entry.id]);

  const hasReadAccess = !entry.protected || protectedMode;
  const hasOriginal = Boolean(entry.originalBody && protectedMode);

  let displayText = entry.body;
  if (showOriginal && hasOriginal) {
    displayText = entry.originalBody!;
  }

  return (
    <div className={`story-reading-screen theme-${colorTheme}`}>
      {/* Top Header */}
      <header className="reading-header">
        <button className="icon-btn-round" type="button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="header-brand-title">
          <LuLuLogo size="sm" />
          {hasReadAccess && <span className="composer-label">{entry.kind === 'Story' ? 'Story' : 'Journal'}</span>}
        </div>
        <div className="header-right-tools">
          {!entry.protected && <button className="icon-btn-round" type="button" onClick={onEdit} title="Edit entry" aria-label="Edit entry">
            <Pencil size={16} />
          </button>}
        </div>
      </header>

      {/* Reader Body */}
      <main className="reading-content-container">
        {!hasReadAccess ? (
          <section aria-label="Open saved entry">
            <p className="reading-tag-capsule">Verify to open this saved entry.</p>
            <button className="btn-pill-action primary" type="button" onClick={onEnterProtected}>Verify with passkey</button>
          </section>
        ) : <>
        {/* Date & Mode Meta */}
        <div className="reading-meta-bar">
          <time className="reading-date-timestamp" dateTime={entry.date}>{new Date(entry.date).toLocaleString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>

          {entry.protected && protectedMode && (
            <button
              className={`original-pill-toggle ${showOriginal ? 'active' : ''}`}
              type="button"
              disabled={!hasOriginal}
              aria-label={!hasOriginal ? 'Original text unavailable' : showOriginal ? 'Conceal original text' : 'Reveal original text'}
              aria-pressed={showOriginal}
              onClick={() => {
                if (hasOriginal) setShowOriginal(!showOriginal);
              }}
            >
              <Eye size={12} />
              <span>{!hasOriginal ? 'ORIGINAL UNAVAILABLE' : showOriginal ? 'CONCEAL ORIGINAL' : 'REVEAL ORIGINAL'}</span>
            </button>
          )}
        </div>

        {/* Category Pill */}
        <div className="reading-tag-capsule">
          <span>{entry.kind}{entry.kind === 'Story' && entry.curatedDeck?.trim() ? ` · ${entry.curatedDeck.trim()}` : ''}{entry.tags.length ? ` · ${entry.tags.join(' · ')}` : ''}</span>
        </div>

        {/* Title */}
        <h1 className="reading-main-title">{entry.title}</h1>

        {showOriginal && (
          <div className="author-unmasked-banner">
            <Unlock size={14} />
            <span>Original text is visible while private access is active.</span>
          </div>
        )}

        {/* Prose */}
        <article className={`reading-prose font-size-${fontSize}`}>
          {displayText.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>

        {!entry.protected && <OrdinaryMediaAttachments ownerId={mediaOwnerId} entryId={entry.id} />}

        {/* Separator Dots */}
        {hasStorySequence ? <nav className="reading-story-sequence" aria-label={`${entry.curatedDeck || 'Story'} reading sequence`}>
          <button type="button" className="reading-sequence-step" disabled={storySequenceIndex === 0}
            aria-label="Read previous entry in this story" onClick={() => onSelectStorySequenceEntry?.(storySequence[storySequenceIndex - 1]!)}>
            <ArrowLeft size={15} aria-hidden="true" /><span>Previous</span>
          </button>
          <span className="reading-sequence-position" aria-live="polite">Part {storySequenceIndex + 1} of {storySequence.length}</span>
          <button type="button" className="reading-sequence-step" disabled={storySequenceIndex === storySequence.length - 1}
            aria-label="Read next entry in this story" onClick={() => onSelectStorySequenceEntry?.(storySequence[storySequenceIndex + 1]!)}>
            <span>Next</span><ArrowRight size={15} aria-hidden="true" />
          </button>
        </nav> : <div className="reading-separator-dots" aria-hidden="true">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>}

        {/* Identified Entities Card (Screen Reading Mode) */}
        {entry.protected && protectedMode && Boolean(entry.entitiesRecognized?.length) && (
          <div className="identified-entities-card">
            <div className="entities-card-header">
              <div className="entities-title-row">
                <Shield size={14} className="shield-icon-stone" />
                <span>IDENTIFIED ENTITIES</span>
              </div>
              <span className="encrypted-tag">{entry.entitiesRecognized?.length} references</span>
            </div>

            <div className="entities-chips-list">
              {entry.entitiesRecognized?.map(reference => <span key={reference} className="entity-chip-pill">{reference}</span>)}
            </div>
          </div>
        )}
        </>}
      </main>

      {/* Floating Circular Reader Dock (Screen Reading Mode) */}
      <footer className="circular-reader-dock" aria-label="Reader tools">
        <button
          className="circle-tool-btn"
          type="button"
          onClick={() =>
            setColorTheme(colorTheme === 'paper' ? 'stone' : colorTheme === 'stone' ? 'dark' : 'paper')
          }
          title="Theme"
          aria-label="Change reading theme"
        >
          <Palette size={17} />
        </button>

        <button
          className="circle-tool-btn"
          type="button"
          onClick={() => setFontSize(fontSize === 'regular' ? 'large' : 'regular')}
          title="Typography"
          aria-label="Change reading text size"
        >
          <Type size={17} />
        </button>

      </footer>
    </div>
  );
};
