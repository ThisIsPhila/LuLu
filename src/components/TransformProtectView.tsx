import React, { useEffect, useRef, useState } from 'react';
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
import { prepareOrdinaryEntryExport } from '../services/ordinaryEntryExport';

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
  onDeleteOrdinary: (entryId: string) => Promise<void>;
  isOrdinarySessionActive: () => boolean;
  onOpenEntityInspector: (currentText?: string) => void;
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
  onDeleteOrdinary,
  isOrdinarySessionActive,
  onOpenEntityInspector,
  onEnterPrivate,
  privateVault,
  privateMediaVault,
  onPrivateSaved,
}) => {
  const viewport = useWritingViewport();
  const [naturalText, setNaturalText] = useState(editingEntry?.body ?? '');
  const [title, setTitle] = useState(editingEntry?.title ?? '');
  const [kind, setKind] = useState<Entry['kind']>(editingEntry?.kind ?? initialKind);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [menuAction,setMenuAction]=useState<'menu'|'export'|'delete'>('menu');
  const [deleteAcknowledged,setDeleteAcknowledged]=useState(false);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const optionsMenu=useRef<HTMLDetailsElement|null>(null);
  const mounted=useRef(false);
  const exportUrls=useRef(new Set<string>());
  const exportTimers=useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(()=>{
    mounted.current=true;
    return()=>{
      mounted.current=false;
      for(const timer of exportTimers.current)clearTimeout(timer);
      exportTimers.current.clear();
      for(const url of exportUrls.current)URL.revokeObjectURL(url);
      exportUrls.current.clear();
    };
  },[]);

  const transformedText = naturalText;

  const wordsCount = naturalText.trim().split(/\s+/).filter(Boolean).length;

  const handleSave = async () => {
    if (busy || deleteBusy) return;
    setBusy(true);setError('');
    try {await onSaveProtected({title:title || (kind === 'Story' ? 'Story' : 'Journal entry'),body:transformedText,originalBody:naturalText,kind});}
    catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft is still here.');}
    finally{setBusy(false);}
  };

  function closeOptions() {
    if(optionsMenu.current)optionsMenu.current.open=false;
    setMenuAction('menu');
  }

  function downloadSavedCopy() {
    if(!editingEntry || editingEntry.protected || protectedMode || !isOrdinarySessionActive()) {
      setError('Ordinary journal access is no longer active. Return to the journal and sign in again.');
      return;
    }
    try {
      const prepared=prepareOrdinaryEntryExport(editingEntry);
      const url=URL.createObjectURL(prepared.blob);
      exportUrls.current.add(url);
      const link=document.createElement('a');
      link.href=url;link.download=prepared.fileName;link.hidden=true;
      document.body.append(link);link.click();link.remove();
      closeOptions();
      setNoticeText('Download requested. Check your browser downloads.');
      const timer=setTimeout(()=>{URL.revokeObjectURL(url);exportUrls.current.delete(url);exportTimers.current.delete(timer);},1000);
      exportTimers.current.add(timer);
    } catch {
      setError('Could not prepare this saved ordinary copy. The saved entry is unchanged.');
    }
  }

  async function deleteSavedEntry() {
    if(!editingEntry || editingEntry.protected || protectedMode || !deleteAcknowledged || deleteBusy) return;
    if(!isOrdinarySessionActive()) {setError('Ordinary journal access is no longer active. Return to the journal and sign in again.');return;}
    setDeleteBusy(true);setError('');
    try {
      await onDeleteOrdinary(editingEntry.id);
    } catch {
      if(mounted.current)setError('Could not confirm whether deletion completed. Refresh your journal before trying again.');
    } finally {
      if(mounted.current)setDeleteBusy(false);
    }
  }

  const [downloadNotice,setDownloadNotice]=useState('');
  function setNoticeText(message:string) {setDownloadNotice(message);}

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
          <details className="account-menu" ref={optionsMenu} inert={deleteBusy} onToggle={event=>{if(!event.currentTarget.open){setMenuAction('menu');setDeleteAcknowledged(false);}}}>
            <summary className="icon-btn-ghost" aria-label="Entry options" title="Entry options"><MoreHorizontal size={18} /></summary>
            <div className="account-menu-panel">
              {menuAction==='menu' ? <>
                <span className="account-menu-label">Entry options</span>
                <button type="button" aria-pressed={kind==='Journal'} onClick={()=>{setKind('Journal');closeOptions();}}>Journal{kind==='Journal'?' · current':''}</button>
                <button type="button" aria-pressed={kind==='Story'} onClick={()=>{setKind('Story');closeOptions();}}>Story{kind==='Story'?' · current':''}</button>
                {editingEntry && !editingEntry.protected && <>
                  <span className="account-menu-label">Saved entry</span>
                  <button type="button" onClick={()=>setMenuAction('export')}>Export saved copy</button>
                  <button type="button" onClick={()=>{setMenuAction('delete');setDeleteAcknowledged(false);}}>Delete entry</button>
                </>}
              </> : menuAction==='export' ? <>
                <span className="account-menu-label">Saved copy</span>
                <p className="private-journal-note">This downloads an unencrypted JSON copy of the saved source entry. Unsaved edits are excluded. Keep the file somewhere private.</p>
                <button type="button" onClick={downloadSavedCopy}>Download saved copy</button>
                <button type="button" onClick={closeOptions}>Cancel export</button>
              </> : <>
                <span className="account-menu-label">Delete saved entry</span>
                <p className="private-journal-note">This permanently deletes only this ordinary entry. There is no history or backup for this action. Unsaved edits will be discarded; private records and other entries are not included.</p>
                <label className="private-journal-note"><input type="checkbox" checked={deleteAcknowledged} disabled={deleteBusy} onChange={event=>setDeleteAcknowledged(event.target.checked)} /> I understand this cannot be undone.</label>
                <button type="button" disabled={!deleteAcknowledged || deleteBusy} onClick={()=>void deleteSavedEntry()}>{deleteBusy?'Deleting…':'Delete permanently'}</button>
                <button type="button" disabled={deleteBusy} onClick={closeOptions}>Cancel deletion</button>
              </>}
            </div>
          </details>
        </div>

<div className="composer-input-dock">        {/* 1. Original Entry Card (Warm Paper) */}
        <div className="original-entry-card">
          <div className="card-top-meta">
            <div className="source-badge">
              <span className="dot-orange" />
              <span>{editingEntry ? `Edit your ${kind.toLowerCase()}` : `Your ${kind.toLowerCase()}`}</span>
            </div>
            <span className="timestamp">{wordsCount} words</span>
          </div>


          <input aria-label="Entry title" placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} disabled={deleteBusy} style={{width:'100%',border:0,background:'transparent',padding:'12px 0',font:'inherit'}}/>
          {error && <p role="alert">{error}</p>}
          <textarea
            className="original-natural-textarea"
            aria-label="Write your entry"
            value={naturalText}
            onChange={(e) => setNaturalText(e.target.value)}
            disabled={deleteBusy}
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
              <button className="shelf-tool-btn" type="button" title="Options" aria-label="Entry options" disabled={deleteBusy} onClick={()=>{if(optionsMenu.current)optionsMenu.current.open=!optionsMenu.current.open;}}>
                <MoreHorizontal size={15} />
              </button>
            </div>
            <button className="save-protected-btn composer-save" onClick={handleSave} disabled={busy || deleteBusy || !naturalText.trim()}><ShieldCheck size={15} /><span>{busy?'Saving…':editingEntry?'Save changes':'Save entry'}</span></button>
          </div>
        </div>
        {downloadNotice && <p className="journal-source-status" role="status">{downloadNotice}</p>}

</div>
      </main>
    </div>
  );
};
