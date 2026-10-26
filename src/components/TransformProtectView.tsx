import React, { useState } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  Image,
  Mic,
  User,
  ShieldCheck,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entity } from '../domain/transform';
import type { Entry } from '../domain/journal';
import { useWritingViewport } from '../hooks/useWritingViewport';
import type { LocalVault, LocalVaultRevision } from '../services/vault/localVault';
import { PrivateDraftComposer } from './PrivateDraftComposer';
import type { LocalMediaVault } from '../services/vault/localMediaVault';

type Props = {
  entities: Entity[];
  protectedMode: boolean;
  editingEntry?: Entry;
  initialKind?: Entry['kind'];
  onBack: () => void;
  onSaveProtected: (data: {
    title: string;
    body: string;
    originalBody: string;
    kind: 'Journal' | 'Story';
  }) => Promise<void>;
  onOpenEntityInspector: () => void;
  onEnterPrivate: () => void;
  privateVault?: LocalVault;
  privateMediaVault?: LocalMediaVault;
  onPrivateSaved: (revision: LocalVaultRevision) => void;
};

export const TransformProtectView: React.FC<Props> = ({
  entities,
  protectedMode,
  editingEntry,
  initialKind = 'Journal',
  onBack,
  onSaveProtected,
  onOpenEntityInspector,
  onEnterPrivate,
  privateVault,
  privateMediaVault,
  onPrivateSaved,
}) => {
  const viewport = useWritingViewport();
  const [naturalText, setNaturalText] = useState(editingEntry?.body ?? '');
  const [title, setTitle] = useState(editingEntry?.title ?? '');
  const kind = editingEntry?.kind ?? initialKind;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const transformedText = naturalText;

  const wordsCount = naturalText.trim().split(/\s+/).filter(Boolean).length;

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);setError('');
    try {await onSaveProtected({title:title || (kind === 'Story' ? 'Story' : 'Journal entry'),body:transformedText,originalBody:naturalText,kind});}
    catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft is still here.');}
    finally{setBusy(false);}
  };

  if (protectedMode) {
    if (!privateVault) return <p role="alert">Unlock private writing again before continuing.</p>;
    return <PrivateDraftComposer vault={privateVault} initialTitle={title} initialBody={naturalText}
      mediaVault={privateMediaVault}
      entities={entities} onBack={onBack} onSaved={onPrivateSaved} onOpenEntityInspector={onOpenEntityInspector} />;
  }

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

<div className="composer-input-dock">        {/* 1. Original Entry Card (Warm Paper) */}
        <div className="original-entry-card">
          <div className="card-top-meta">
            <div className="source-badge">
              <span className="dot-orange" />
              <span>{editingEntry ? 'Edit your entry' : 'Your writing'}</span>
            </div>
            <span className="timestamp">{wordsCount} words</span>
          </div>


          <input aria-label="Entry title" placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} style={{width:'100%',border:0,background:'transparent',padding:'12px 0',font:'inherit'}}/>
          {error && <p role="alert">{error}</p>}
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
              <button className="shelf-tool-btn" title="Image" onClick={()=>setError('Image capture is available in private writing. Start a new entry and choose Write privately.')}>
                <Image size={15} />
              </button>
              <button className="shelf-tool-btn" title="Mic" onClick={()=>setError('Audio capture is available in private writing. Start a new entry and choose Write privately.')}>
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
