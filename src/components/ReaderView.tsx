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
import { randomEntityValue, entityValuePool, type EntityPoolType } from '../domain/privacy/entityValuePool';

type Props = {
  entry: Entry;
  mediaOwnerId: string;
  protectedMode: boolean;
  onBack: () => void;
  onEdit: () => void;
  onEnterProtected: () => void;
  onReviewReplacements?: () => void;
  onUpdateEntry?: (entry: Entry) => void;
  showNavigationHeader?: boolean;
  storySequence?: readonly Entry[];
  onSelectStorySequenceEntry?: (entry: Entry) => void;
};

type DetectedEntity = { value: string; label: string; replacement: string };

export const ReaderView: React.FC<Props> = ({
  entry,
  mediaOwnerId,
  protectedMode,
  onBack,
  onEdit,
  onEnterProtected,
  onReviewReplacements,
  onUpdateEntry,
  showNavigationHeader = true,
  storySequence = [],
  onSelectStorySequenceEntry,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [revealScrubbed, setRevealScrubbed] = useState(false);
  const [draftAliases, setDraftAliases] = useState<string[]>(() => [...(entry.entitiesRecognized ?? [])]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [cloudResult, setCloudResult] = useState<{entities: DetectedEntity[]; scrubbed: string} | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [fontSize, setFontSize] = useState<'regular' | 'large'>('regular');
  const [colorTheme, setColorTheme] = useState<'paper' | 'stone' | 'dark'>(() =>
    document.documentElement.dataset.luluTheme === 'dark' ? 'dark' : 'paper',
  );
  const storySequenceIndex = storySequence.findIndex(item => item.id === entry.id);
  const hasStorySequence = entry.kind === 'Story' && storySequence.length > 1 && storySequenceIndex >= 0 && Boolean(onSelectStorySequenceEntry);
  const isDemo = entry.tags.includes('Demo');
  const scrubAliases = [...draftAliases].sort((a, b) => b.length - a.length);

  useEffect(() => {
    setShowOriginal(false);
    setRevealScrubbed(false);
    setDraftAliases([...(entry.entitiesRecognized ?? [])]);
    setEditingIndex(null);
    setEditingValue('');
    setCloudResult(null);
    setReviewMode(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [entry.id]);

  // Reveal never starts automatically: only the user toggles it via the dock key.
  // Conceals again when leaving the private session.
  useEffect(() => {
    if (!protectedMode) setRevealScrubbed(false);
  }, [protectedMode]);

  const hasReadAccess = !entry.protected || protectedMode;
  const hasOriginal = Boolean(entry.originalBody && protectedMode);
  const showingScrubLocations = revealScrubbed && protectedMode && !showOriginal && scrubAliases.length > 0;

  let displayText = entry.body;
  if (showOriginal && hasOriginal) {
    displayText = entry.originalBody!;
  }

  // Entity label colors: consistent single colour, not per-type green.
  const ENTITY_COLORS: Record<string, string> = {
    person: '#6f8f65',
    place: '#4f7fa3',
    organisation: '#a37a3f',
    time: '#8a5fa3',
    replaced: '#808080',
    entity: '#6f8f65',
  };

  function aliasLabel(alias: string): string {
    const known: Record<string, string> = {
      Sipho: 'Person', Naledi: 'Person', Zanele: 'Person', Thabo: 'Person', Lerato: 'Person',
      Mandla: 'Person', Nomsa: 'Person', Palesa: 'Person', Bongani: 'Person',
      Ayanda: 'Person', Mpho: 'Person', Dineo: 'Person', Tshepo: 'Person', Refilwe: 'Person',
      Kgomotso: 'Person', Lesedi: 'Person', Neo: 'Person', Karabo: 'Person', Boitumelo: 'Person',
      'Vukani Logistics': 'Organisation', 'Khanya Admin': 'Organisation', 'Motho Services': 'Organisation',
      'Thuso Clinic': 'Organisation', 'Lerato Community Centre': 'Organisation', 'Naledi Outreach': 'Organisation',
      Maboneng: 'Place', Soweto: 'Place', Kagiso: 'Place', Mamelodi: 'Place', Rosebank: 'Place',
      Sandton: 'Place', Tembisa: 'Place', Atteridgeville: 'Place', Pretoria: 'Place', Johannesburg: 'Place',
      Midrand: 'Place', Centurion: 'Place', 'the Nest': 'Place', 'Blue Moon': 'Time', Moonrise: 'Time',
      Dusk: 'Time', Twilight: 'Time', Daybreak: 'Time',
    };
    return known[alias] ?? 'Entity';
  }

  function scrubLabel(alias: string): string {
    const index = draftAliases.findIndex(item => item.toLocaleLowerCase() === alias.toLocaleLowerCase());
    if (index >= 0) {
      const known = aliasLabel(alias);
      return known;
    }
    return aliasLabel(alias);
  }

  function colorFor(label: string): string {
    const key = label.toLowerCase();
    return ENTITY_COLORS[key] ?? ENTITY_COLORS.entity;
  }

  function renderParagraph(paragraph: string) {
    if (!showingScrubLocations) return paragraph;
    const pattern = new RegExp(`(${scrubAliases.map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return paragraph.split(pattern).map((part, index) =>
      scrubAliases.some(alias => alias.toLocaleLowerCase() === part.toLocaleLowerCase())
        ? <mark key={index} className="reader-scrub-mark" style={{ borderBottomColor: colorFor(scrubLabel(part)) }}>{part}<small style={{ color: colorFor(scrubLabel(part)) }}>{scrubLabel(part)}</small></mark>
        : part,
    );
  }

  function handleRevealToggle() {
    if (!protectedMode) { onEnterProtected(); return; }
    setRevealScrubbed(value => !value);
  }

  function updateAlias(oldAlias: string, newAlias: string) {
    const nextAlias = newAlias.trim();
    if (!nextAlias || nextAlias === oldAlias) return;
    const updatedBody = entry.body.split(oldAlias).join(nextAlias);
    const updatedAliases = draftAliases.map(alias => alias === oldAlias ? nextAlias : alias);
    setDraftAliases(updatedAliases);
    const updatedEntry: Entry = { ...entry, body: updatedBody, entitiesRecognized: updatedAliases };
    void onUpdateEntry?.(updatedEntry);
  }

  async function reprocessViaCloud() {
    if (reprocessing) return;
    setReprocessing(true);
    setCloudResult(null);
    setReviewMode(false);
    try {
      const response = await fetch('https://africa-south1-khora-lulu-2026.cloudfunctions.net/api/lu/scrub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entry.body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Cloud reprocessing failed.');
      const entities: DetectedEntity[] = (data.entities ?? []).map((item: {value:string;label:string;replacement:string}) => ({
        value: item.value,
        label: item.label,
        replacement: item.replacement ?? randomEntityValue(item.label as EntityPoolType),
      }));
      setCloudResult({ entities, scrubbed: data.scrubbed ?? entry.body });
      setReviewMode(true);
    } catch {
      setCloudResult(null);
    } finally {
      setReprocessing(false);
    }
  }

  function applyCloudReplacements() {
    if (!cloudResult) return;
    let body = entry.body;
    const aliases: string[] = [];
    const sorted = [...cloudResult.entities].sort((a, b) => b.value.length - a.value.length);
    for (const entity of sorted) {
      const replacement = entity.replacement;
      body = body.split(entity.value).join(replacement);
      aliases.push(replacement);
    }
    setDraftAliases(aliases);
    const updatedEntry: Entry = { ...entry, body, entitiesRecognized: aliases };
    void onUpdateEntry?.(updatedEntry);
    setCloudResult(null);
    setReviewMode(false);
    setRevealScrubbed(true);
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

        {/* Cloud reprocessing review (shown after cloud call returns) */}
        {process.env.NODE_ENV === 'development' && reviewMode && cloudResult && (
          <section className="reader-cloud-review" aria-label="Cloud processing review">
            <h4>Cloud model found entities — review before saving</h4>
            <p className="cloud-review-note">Choose a replacement for each detected entity, then Save to apply to this entry.</p>
            <ul className="cloud-entity-list">
              {cloudResult.entities.map((item, index) => {
                const poolType = (['Person','Place','Organisation','Time'] as EntityPoolType[]).includes(item.label as EntityPoolType) ? item.label as EntityPoolType : 'Person';
                return (
                  <li key={index} className="cloud-entity-item">
                    <span className="cloud-entity-value">{item.value}</span>
                    <span className="cloud-entity-label">{item.label}</span>
                    <select
                      className="cloud-replacement-select"
                      value={item.replacement}
                      onChange={(event) => {
                        const next = [...cloudResult.entities];
                        next[index] = { ...next[index], replacement: event.target.value };
                        setCloudResult({ entities: next, scrubbed: cloudResult.scrubbed });
                      }}
                    >
                      {entityValuePool[poolType].map(poolValue => (
                        <option key={poolValue} value={poolValue}>{poolValue}</option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
            <div className="cloud-review-actions">
              <button type="button" className="btn-pill-action secondary" onClick={applyCloudReplacements}>Save replacements</button>
              <button type="button" className="btn-pill-action" onClick={() => { setCloudResult(null); setReviewMode(false); }}>Cancel</button>
            </div>
          </section>
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
        {(entry.protected ? protectedMode : showingScrubLocations) && Boolean(draftAliases.length) && (
          <div className="identified-entities-card">
            <div className="entities-card-header">
              <div className="entities-title-row">
                <Shield size={14} className="shield-icon-stone" />
                <span>IDENTIFIED ENTITIES</span>
              </div>
              <span className="encrypted-tag">{draftAliases.length} references</span>
            </div>

            <div className="entities-chips-list">
              {draftAliases.map((reference, index) => {
                const label = scrubLabel(reference);
                const isEditing = editingIndex === index;
                return (
                  <div key={`${reference}-${index}`} className={`entity-chip-pill entity-chip-pill--${label.toLowerCase()}`}>
                    <span className="entity-chip-type">{label}</span>
                    {isEditing ? (
                      <>
                        <input
                          className="entity-chip-input"
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          autoFocus
                          aria-label={`Representation for ${reference}`}
                        />
                        <button type="button" className="entity-chip-save" onClick={() => { updateAlias(reference, editingValue); setEditingIndex(null); setEditingValue(''); }}>Save</button>
                        <button type="button" className="entity-chip-cancel" onClick={() => { setEditingIndex(null); setEditingValue(''); }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span className="entity-chip-value">{reference}</span>
                        <button type="button" className="entity-chip-edit" onClick={() => { setEditingIndex(index); setEditingValue(reference); }}>Edit</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="reader-scrub-legend" role="status">Edit a representation and press Save. The scrubbed text updates after saving. Hidden originals are never shown.</p>
          </div>
        )}
        </>}
      </main>

      {process.env.NODE_ENV === 'development' && cloudResult && (
        <section className="reader-cloud-result" aria-label="Cloud reprocessing result">
          <h4>Cloud model detected entities</h4>
          <ul className="cloud-entity-list">
            {cloudResult.entities.map((item,index)=>(
              <li key={index} className="cloud-entity-item">
                <span className="cloud-entity-value">{item.value}</span>
                <span className="cloud-entity-label">{item.label}</span>
                {item.replacement && <span className="cloud-entity-replacement">&#8594; {item.replacement}</span>}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-pill-action secondary" onClick={() => { setCloudResult(null); }}>Close</button>
        </section>
      )}
      <button type="button" className="reprocess-cloud-btn" onClick={reprocessViaCloud} disabled={reprocessing} aria-label="Reprocess entry through cloud privacy model">
        {reprocessing ? 'Processing…' : 'Reprocess via cloud'}
      </button>
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
