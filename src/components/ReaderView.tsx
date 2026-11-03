import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Unlock,
  Eye,
  KeyRound,
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
  onReviewReplacements?: () => void;
  showNavigationHeader?: boolean;
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
  onReviewReplacements,
  showNavigationHeader = true,
  storySequence = [],
  onSelectStorySequenceEntry,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [revealScrubbed, setRevealScrubbed] = useState(false);
  const [fontSize, setFontSize] = useState<'regular' | 'large'>('regular');
  const [colorTheme, setColorTheme] = useState<'paper' | 'stone' | 'dark'>(() =>
    document.documentElement.dataset.luluTheme === 'dark' ? 'dark' : 'paper',
  );
  const storySequenceIndex = storySequence.findIndex(item => item.id === entry.id);
  const hasStorySequence = entry.kind === 'Story' && storySequence.length > 1 && storySequenceIndex >= 0 && Boolean(onSelectStorySequenceEntry);

  useEffect(() => {
    setShowOriginal(false);
    setRevealScrubbed(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [entry.id]);

  // The reveal session ends with the private session: highlights conceal again.
  useEffect(() => {
    if (!protectedMode) setRevealScrubbed(false);
  }, [protectedMode]);

  const hasReadAccess = !entry.protected || protectedMode;
  const hasOriginal = Boolean(entry.originalBody && protectedMode);
  const isDemo = entry.tags.includes('Demo');
  const scrubAliases = [...(entry.entitiesRecognized ?? [])].sort((a, b) => b.length - a.length);
  const showingScrubLocations = revealScrubbed && protectedMode && !showOriginal && scrubAliases.length > 0;

  let displayText = entry.body;
  if (showOriginal && hasOriginal) {
    displayText = entry.originalBody!;
  }

  function handleRevealToggle() {
    if (!protectedMode) { onEnterProtected(); return; }
    setRevealScrubbed(value => !value);
  }

  function renderParagraph(paragraph: string) {
    if (!showingScrubLocations) return paragraph;
    const pattern = new RegExp(`(${scrubAliases.map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return paragraph.split(pattern).map((part, index) =>
      scrubAliases.some(alias => alias.toLocaleLowerCase() === part.toLocaleLowerCase())
        ? <mark key={index} className="reader-scrub-mark">{part}</mark>
        : part,
    );
  }

  return (
    <div className={`story-reading-screen theme-${colorTheme}`}>
      {/* Top Header */}
      {showNavigationHeader && <header className="reading-header">
        <button className="icon-btn-round" type="button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="header-brand-title">
          <LuLuLogo size="sm" dark={colorTheme === 'dark' || document.documentElement.dataset.luluTheme === 'dark'} />
          {hasReadAccess && <span className="composer-label">{entry.kind === 'Story' ? 'Story' : 'Journal'}</span>}
        </div>
        <div className="header-right-tools">
          {!entry.protected && <button className="icon-btn-round" type="button" onClick={onEdit} title="Edit entry" aria-label="Edit entry">
            <Pencil size={16} />
          </button>}
        </div>
      </header>}

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

        {isDemo && entry.demoGuide && (
          <section className="reader-demo-guide" aria-label="About this demo entry">
            <span className="reader-demo-badge">Demo entry</span>
            <p>{entry.demoGuide}</p>
            <div className="reader-demo-actions">
              <button type="button" className="btn-pill-action primary" onClick={handleRevealToggle}>
                {protectedMode ? (revealScrubbed ? 'Conceal replacements' : 'Reveal replacements') : 'Unlock to reveal replacements'}
              </button>
              {onReviewReplacements && <button type="button" className="btn-pill-action secondary" onClick={onReviewReplacements}>Review or add details</button>}
            </div>
            <p className="reader-demo-note">In a real entry, the original is stored encrypted on this device, separately from the scrubbed copy — the two are never kept together. The key button highlights where details were replaced; it does not show the hidden originals. A professional only ever sees this scrubbed version, unless you choose otherwise.</p>
          </section>
        )}

        {showOriginal && (
          <div className="author-unmasked-banner">
            <Unlock size={14} />
            <span>Original text is visible while private access is active.</span>
          </div>
        )}

        {/* Prose */}
        <article className={`reading-prose font-size-${fontSize}`}>
          {displayText.split('\n\n').map((paragraph, index) => (
            <p key={index}>{renderParagraph(paragraph)}</p>
          ))}
        </article>

        {showingScrubLocations && (
          <p className="reader-scrub-legend" role="status">Highlighted words are replacements. The original details stay hidden — this view only shows where scrubbing happened.</p>
        )}

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
        {(entry.protected ? protectedMode : showingScrubLocations) && Boolean(entry.entitiesRecognized?.length) && (
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

        <button
          className={`circle-tool-btn ${showingScrubLocations ? 'active' : ''}`}
          type="button"
          onClick={handleRevealToggle}
          title={protectedMode ? 'Reveal replaced details' : 'Unlock with passkey to reveal replaced details'}
          aria-label={protectedMode ? (revealScrubbed ? 'Conceal replaced details' : 'Reveal replaced details') : 'Unlock with passkey to reveal replaced details'}
          aria-pressed={showingScrubLocations}
        >
          {protectedMode ? <Eye size={17} /> : <KeyRound size={17} />}
        </button>

      </footer>
    </div>
  );
};
