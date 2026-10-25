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
import type { Entry } from '../domain/journal';
import { useWritingViewport } from '../hooks/useWritingViewport';
import { transform, recognised } from '../domain/transform';
import { PrivateParagraphEditor } from './PrivateParagraphEditor';

type Props = {
  entities: Entity[];
  protectedMode: boolean;
  editingEntry?: Entry;
  onBack: () => void;
  onSaveProtected: (data: {
    title: string;
    body: string;
    originalBody: string;
    kind: 'Journal' | 'Story';
  }) => Promise<void>;
  onOpenEntityInspector: () => void;
  onEnterPrivate: () => void;
};

export const TransformProtectView: React.FC<Props> = ({
  entities,
  protectedMode,
  editingEntry,
  onBack,
  onSaveProtected,
  onOpenEntityInspector,
  onEnterPrivate,
}) => {
  const viewport = useWritingViewport();
  const [naturalText, setNaturalText] = useState(editingEntry?.body ?? '');
  const [title, setTitle] = useState(editingEntry?.title ?? '');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [showPreview,setShowPreview]=useState(false);

  // Derive transformed text
  const transformedText = protectedMode && !editingEntry ? transform(naturalText, entities, {
    perspectiveDistancing: true,
  }) : naturalText;

  const wordsCount = naturalText.trim().split(/\s+/).filter(Boolean).length;

  const handleSave = async () => {
    setBusy(true);setError('');
    try {await onSaveProtected({title:title || 'Journal entry',body:transformedText,originalBody:naturalText,kind:'Journal'});}
    catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft is still here.');}
    finally{setBusy(false);}
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
        {!protectedMode && !editingEntry && <button type="button" onClick={onEnterPrivate}>Write privately</button>}
      </header>

      {/* Main Flow */}
      <main className="transform-flow-body">
        {/* Date Row */}
        <div className="composer-date-row">
          <div>
            <h2 className="composer-day">Today</h2>
            <span className="composer-date-sub">{new Date().toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
          </div>
          <button className="icon-btn-ghost">
            <MoreHorizontal size={18} />
          </button>
        </div>

{protectedMode && <div className="composer-processing-panel">
        <p>Private writing saves encrypted in this browser. No backup is configured.</p>
        <p>Save to keep this draft. Quick exit or Escape closes unsaved writing.</p>
        <button type="button" onClick={()=>setShowPreview(value=>!value)}>{showPreview?'Conceal preview':'Inspect representation preview'}</button>
        {showPreview && <>
        <div className="protected-vault-card">
          <div className="vault-glow-ambient" />
          <div className="vault-card-header">
            <div className="vault-lock-badge">
              <Lock size={14} />
            </div>
            <div className="vault-titles">
              <h3>Protected Version</h3>
              <p>Preview with your configured representations.</p>
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

</>}
</div>}<div className="composer-input-dock">        {/* 1. Original Entry Card (Warm Paper) */}
        <div className="original-entry-card">
          <div className="card-top-meta">
            <div className="source-badge">
              <span className="dot-orange" />
              <span>{editingEntry ? 'Edit your entry' : protectedMode?'Original Entry · Your Natural Words':'Your writing'}</span>
            </div>
            <span className="timestamp">{wordsCount} words</span>
          </div>

          <input aria-label="Entry title" placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} style={{width:'100%',border:0,background:'transparent',padding:'12px 0',font:'inherit'}}/>
          {error && <p role="alert">{error}</p>}
          {protectedMode ? <PrivateParagraphEditor value={naturalText} sessionUnlocked
            onChange={value=>{setNaturalText(value);setShowPreview(false);}} /> : <textarea
            className="original-natural-textarea"
            aria-label="Write your entry"
            value={naturalText}
            onChange={(e) => setNaturalText(e.target.value)}
            rows={4}
            placeholder="Write naturally in your own words..."
          />}

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
            <button className="save-protected-btn composer-save" onClick={handleSave} disabled={busy || !naturalText.trim()}><ShieldCheck size={15} /><span>{busy?'Saving…':editingEntry?'Save changes':'Save entry'}</span></button>
          </div>
        </div>

</div>
      </main>
    </div>
  );
};
