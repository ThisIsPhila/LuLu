import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Shield,
  ShieldCheck,
  Type,
  Image,
  Mic,
  ChevronRight,
  Eye,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import type { Entry } from '../domain/journal';
import type { Entity } from '../domain/transform';
import { transform, recognised, detectEntitySpans } from '../domain/transform';
import { EntityPopover } from './EntityPopover';

type EditorProps = {
  initialEntry?: Partial<Entry>;
  protectedMode: boolean;
  entities: Entity[];
  onOpenProtectedGate: () => void;
  onOpenEntityControls: () => void;
  onBack: () => void;
  onSave: (entry: {
    title: string;
    body: string;
    originalBody?: string;
    kind: 'Journal' | 'Story';
    protected: boolean;
    perspective: 'first' | 'third';
  }) => void;
  onUpdateEntityAlias: (id: string, newAlias: string) => void;
};

export const EditorView: React.FC<EditorProps> = ({
  initialEntry,
  protectedMode,
  entities,
  onOpenProtectedGate,
  onOpenEntityControls,
  onBack,
  onSave,
  onUpdateEntityAlias,
}) => {
  const [title, setTitle] = useState(initialEntry?.title || '');
  const [body, setBody] = useState(initialEntry?.body || '');
  const [kind, setKind] = useState<'Journal' | 'Story'>(initialEntry?.kind || 'Journal');
  const [perspective, setPerspective] = useState<'first' | 'third'>(
    initialEntry?.perspective || (protectedMode ? 'third' : 'first')
  );
  const [previewMode, setPreviewMode] = useState<'edit' | 'concealed'>('edit');
  const [activePopover, setActivePopover] = useState<{
    original: string;
    alias: string;
    type: string;
    pos: { top: number; left: number };
  } | null>(null);

  // Sync perspective if protectedMode flips
  useEffect(() => {
    if (protectedMode && perspective === 'first') {
      setPerspective('third');
    }
  }, [protectedMode]);

  const activeRecognised = recognised(body, entities);
  const spans = detectEntitySpans(body, entities);

  const concealedBody = transform(body, entities, {
    perspectiveDistancing: perspective === 'third',
  });
  const concealedTitle = transform(title, entities, {
    perspectiveDistancing: perspective === 'third',
  });

  const handleSave = () => {
    if (!body.trim() && !title.trim()) return;
    onSave({
      title: title.trim() || 'Untitled entry',
      body: protectedMode ? concealedBody : body,
      originalBody: protectedMode ? body : undefined,
      kind,
      protected: protectedMode,
      perspective,
    });
  };

  const handleSpanClick = (
    span: { original: string; alias: string; type: string },
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setActivePopover({
      original: span.original,
      alias: span.alias,
      type: span.type,
      pos: { top: rect.bottom + 8, left: rect.left },
    });
  };

  return (
    <div className={`editor-screen ${protectedMode ? 'protected-theme' : ''}`}>
      {/* Top Header */}
      <header className="editor-header">
        <button className="icon-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>

        <div className="editor-title-container">
          {protectedMode ? (
            <div className="protected-entry-pill" onClick={onOpenEntityControls}>
              <ShieldCheck size={13} className="text-emerald" />
              <span>Protected entry</span>
            </div>
          ) : (
            <span className="entry-header-label">New Entry</span>
          )}
        </div>

        <div className="editor-header-actions">
          {!protectedMode ? (
            <button
              className="btn-protect-toggle"
              onClick={onOpenProtectedGate}
              title="Activate protected writing"
            >
              <Shield size={14} />
              <span>Protect</span>
            </button>
          ) : (
            <button
              className={`btn-preview-toggle ${previewMode === 'concealed' ? 'active' : ''}`}
              onClick={() => setPreviewMode(previewMode === 'edit' ? 'concealed' : 'edit')}
              title="Toggle concealed narrative view"
            >
              <Eye size={14} />
              <span>{previewMode === 'concealed' ? 'Original' : 'Concealed'}</span>
            </button>
          )}

          <button className="primary-btn save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </header>

      {/* Narrative Distancing Sub-bar (when in Protected Mode) */}
      {protectedMode && (
        <div className="narrative-distancing-bar">
          <div className="distancing-info">
            <Sparkles size={13} />
            <span>Narrative distancing</span>
          </div>
          <div className="perspective-segmented-control">
            <button
              type="button"
              className={perspective === 'first' ? 'active' : ''}
              onClick={() => setPerspective('first')}
            >
              1st person (I)
            </button>
            <button
              type="button"
              className={perspective === 'third' ? 'active' : ''}
              onClick={() => setPerspective('third')}
            >
              3rd person (She)
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <main className="editor-main-content">
        <input
          type="text"
          className="editor-title-input"
          placeholder="A calm morning"
          value={previewMode === 'concealed' && protectedMode ? concealedTitle : title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={previewMode === 'concealed'}
        />

        {previewMode === 'concealed' && protectedMode ? (
          <div className="concealed-reading-preview">
            <div className="concealed-badge">Transformed Coherent Narrative</div>
            <p className="concealed-body-text">{concealedBody}</p>
          </div>
        ) : (
          <div className="editor-body-wrapper">
            <textarea
              className="editor-body-textarea"
              placeholder={
                protectedMode
                  ? 'Write freely. LuLu will automatically recognise sensitive people, places, times and relationships...'
                  : 'Start writing. LuLu will keep your stories calm and focused...'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
            />

            {/* Ambient inline indicators overlay when protected mode is on */}
            {protectedMode && spans.length > 0 && (
              <div className="ambient-indicators-bar">
                <span className="ambient-label">Ambient recognition:</span>
                <div className="ambient-chips">
                  {spans.map((s, idx) => (
                    <button
                      key={idx}
                      className="ambient-span-chip"
                      onClick={(e) => handleSpanClick(s, e)}
                    >
                      <span className="span-alias">{s.alias}</span>
                      <span className="span-type">{s.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Recognition Toast (Screen D) */}
      {protectedMode && activeRecognised.length > 0 && (
        <div className="recognition-toast" onClick={onOpenEntityControls}>
          <div className="recognition-toast-info">
            <span className="toast-count-pill">
              {activeRecognised.reduce((acc, curr) => acc + (curr.mentions || 1), 0)}
            </span>
            <span className="toast-text">
              {activeRecognised.length} reference{activeRecognised.length > 1 ? 's' : ''} recognised
              ({activeRecognised.map((e) => e.alias).join(', ')})
            </span>
          </div>
          <button className="toast-action-btn">
            <span>Review</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Popover for clicked span */}
      {activePopover && (
        <EntityPopover
          original={activePopover.original}
          alias={activePopover.alias}
          type={activePopover.type}
          position={activePopover.pos}
          onKeep={() => setActivePopover(null)}
          onChangeAlias={() => {
            const next = prompt(`Change alias for ${activePopover.original}:`, activePopover.alias);
            if (next && next.trim()) {
              const entity = entities.find((e) => e.original.toLowerCase() === activePopover.original.toLowerCase());
              if (entity) {
                onUpdateEntityAlias(entity.id, next.trim());
              }
            }
            setActivePopover(null);
          }}
          onDismiss={() => setActivePopover(null)}
        />
      )}

      {/* Bottom Writing Toolbar */}
      <footer className="editor-footer-toolbar">
        <button className="toolbar-btn" title="Typography">
          <Type size={17} />
        </button>
        <button className="toolbar-btn" title="Add image">
          <Image size={17} />
        </button>
        <button className="toolbar-btn" title="Voice memo">
          <Mic size={17} />
        </button>
        <div className="toolbar-divider" />
        <div className="kind-selector">
          <button
            className={`kind-pill ${kind === 'Journal' ? 'active' : ''}`}
            onClick={() => setKind('Journal')}
          >
            Journal
          </button>
          <button
            className={`kind-pill ${kind === 'Story' ? 'active' : ''}`}
            onClick={() => setKind('Story')}
          >
            Story
          </button>
        </div>
      </footer>
    </div>
  );
};
