import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LocalVault, LocalVaultDraft, LocalVaultRevision } from '../services/vault/localVault';
import type { LocalMediaVault, MediaMetadata } from '../services/vault/localMediaVault';
import { readPrivateText, readPrivateTextContent } from '../services/privateCapture';
import { BookOpen, FilePenLine } from 'lucide-react';
import { PrivateDraftFields } from './PrivateDraftFields';
import { LuLuLogo } from './Logo';
import './PrivateWriting.css';
import { PrivateRecordExport } from './PrivateRecordExport';
import { PrivateRecordDeletion } from './PrivateRecordDeletion';
import { PrivateRecordBackup, PrivateBackupRestore } from './PrivateBackupControls';

type Props = { vault: LocalVault; mediaVault?: LocalMediaVault; onExit: () => void; onCompose: () => void };

/** Mounted only within a live private session; no ordinary preview receives these values. */
export function LocalPrivateJournal({vault, mediaVault, onExit, onCompose}: Props) {
  const [records, setRecords] = useState<LocalVaultRevision[]>([]);
  const [media, setMedia] = useState<MediaMetadata[]>([]);
  const [drafts, setDrafts] = useState<LocalVaultDraft[]>([]);
  const [selected, setSelected] = useState<LocalVaultRevision | null>(null);
  const [textEdited, setTextEdited] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<LocalVaultDraft | null>(null);
  const [history, setHistory] = useState<LocalVaultRevision[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [revealedMedia, setRevealedMedia] = useState<{metadata: MediaMetadata; url: string} | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const mediaRequest = useRef(0);
  const mediaElement = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    Promise.allSettled([vault.listRecords(),vault.listDrafts(),mediaVault?.list() ?? Promise.resolve([])]).then(([rowsResult,draftsResult,mediaResult]) => {
      if (!active) return;
      const failed = rowsResult.status==='rejected' || draftsResult.status==='rejected' || mediaResult.status==='rejected';
      if(rowsResult.status==='fulfilled') setRecords(rowsResult.value);
      if(draftsResult.status==='fulfilled') setDrafts(draftsResult.value);
      if(mediaResult.status==='fulfilled') setMedia(mediaResult.value);
      setError(failed ? 'Could not read some items in this browser’s private journal. Stored records and recovery drafts were left unchanged.' : '');
    })
      .finally(() => {if(active) setBusy(false);});
    return () => {active=false;};
  },[vault,mediaVault,refresh]);

  useEffect(() => {
    let active = true;
    setHistory([]);setShowHistory(false);
    if(selected) vault.listRevisions(selected.recordId).then(rows => {if(active) setHistory(rows);})
      .catch(() => {if(active) setError('Could not read the record history.');});
    return () => {active=false;};
  },[vault,selected]);

  function open(record: LocalVaultRevision) {
    concealMedia(true);
    try {readPrivateText(record);setSelected(record);setSelectedDraft(null);setTextEdited(false);setError('');}
    catch {setError('This record format cannot be opened here.');}
  }

  function openMedia(record: MediaMetadata) {
    concealMedia(true);
    setSelected(null);setSelectedDraft(null);setSelectedMedia(record);setShowHistory(false);setMediaError('');setError('');
  }

  function concealMedia(closeDetail = false) {
    mediaRequest.current += 1;
    mediaElement.current?.pause();
    setRevealedMedia(null);setMediaLoading(false);setMediaError('');
    if (closeDetail) setSelectedMedia(null);
  }

  async function revealMedia() {
    if (!selectedMedia || !mediaVault || mediaLoading || revealedMedia) return;
    const request = ++mediaRequest.current;
    setMediaLoading(true);setMediaError('');
    try {
      const result = await mediaVault.get(selectedMedia.mediaId);
      if (request !== mediaRequest.current) return;
      const url = URL.createObjectURL(result.blob);
      if (request !== mediaRequest.current) { URL.revokeObjectURL(url); return; }
      setRevealedMedia({metadata:result.metadata,url});
    } catch {
      if (request === mediaRequest.current) setMediaError('Could not reveal this private media. It remains stored in this browser.');
    } finally {
      if (request === mediaRequest.current) setMediaLoading(false);
    }
  }

  useLayoutEffect(() => {
    const playback = mediaElement.current;
    return () => {
      mediaRequest.current += 1;
      playback?.pause();
      if (revealedMedia) URL.revokeObjectURL(revealedMedia.url);
    };
  },[revealedMedia]);

  function recover(draft: LocalVaultDraft) {
    concealMedia(true);
    try {readPrivateTextContent(draft.content);setSelected(null);setSelectedDraft(draft);setError('');}
    catch {setError('This draft format cannot be opened here. Its encrypted snapshot was left unchanged.');}
  }

  function backToRecords() {
    concealMedia(true);
    setSelected(null);setSelectedDraft(null);setTextEdited(false);setShowHistory(false);setRefresh(value=>value+1);
  }

  function saved(revision: LocalVaultRevision) {
    concealMedia(true);
    setSelectedDraft(null);setSelected(revision);setTextEdited(false);setShowHistory(false);setRefresh(value=>value+1);
  }

  const editing=Boolean(selected || selectedDraft || selectedMedia);
  const savedItems = [
    ...records.map(record => ({type:'text' as const, date:record.clientCreatedAt, record})),
    ...media.map(record => ({type:'media' as const, date:record.clientCreatedAt, record})),
  ].sort((left,right)=>right.date.localeCompare(left.date));
  const text=selected ? readPrivateText(selected) : null;
  return <section className="stitch-main-stream private-journal-page" aria-label="Local private journal">
    <header className="private-journal-toolbar">
      <LuLuLogo size="sm" />
      <div className="private-journal-actions">
      <button className="private-journal-action private-journal-action-quiet private-journal-exit" onClick={onExit}>Quick exit</button>
        <button className="private-journal-action private-journal-action-primary" onClick={onCompose}>Write privately</button>
        {editing && <button className="private-journal-action private-journal-action-quiet" onClick={backToRecords}>Back to records and drafts</button>}
      </div>
    </header>
    <header className="private-journal-heading">
      <span className="private-writing-kicker">PRIVATE JOURNAL</span>
      <h1>Private writing</h1>
      <p>Writing, recovery drafts and media are encrypted in this browser without automatic sync. You can manually back up saved records; recovery drafts are excluded. Clearing browser data can lose access. Opening a private session currently requires a connection.</p>
    </header>
    {mediaVault && !editing && <PrivateBackupRestore vault={vault} mediaVault={mediaVault} onRestored={backToRecords} />}
    {error && <p className="private-journal-alert" role="alert">{error} <button className="private-journal-action private-journal-action-quiet" onClick={()=>setRefresh(value=>value+1)}>Reload private list</button></p>}
    {busy && <p className="private-journal-status" role="status">Reading local storage…</p>}
    {!editing && <>
      <button className="private-journal-action private-journal-refresh" type="button" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>Refresh records and drafts</button>
      {drafts.length>0 && <section aria-label="Recovery drafts">
        <div className="private-journal-section-heading"><span className="private-writing-kicker">RECOVER</span><h2>Continue a draft</h2></div>
        <p className="private-journal-note">Only the latest completed autosave can be recovered. Changes interrupted while saving may be missing.</p>
        <ul className="private-journal-list private-journal-drafts">{drafts.map(draft=>{
          let label='Private draft';
          try {label=readPrivateTextContent(draft.content).title || label;} catch {}
          return <li className="private-journal-list-item" key={draft.draftId}><button className="private-journal-record" onClick={()=>recover(draft)}><span className="private-journal-record-mark" aria-hidden="true"><FilePenLine size={17} strokeWidth={1.6} /></span><span className="private-journal-record-copy"><strong>{label}</strong><span>Continue recovery draft</span></span><span className="private-journal-record-arrow" aria-hidden="true">↗</span></button></li>;
        })}</ul>
      </section>}
      {!busy && savedItems.length===0 && <p className="private-journal-empty">No saved private records yet.</p>}
      {savedItems.length > 0 && <section className="private-journal-record-section" aria-label="Saved private records">
        <div className="private-journal-section-heading"><span className="private-writing-kicker">SAVED HERE</span><h2>Your records</h2></div>
      <ul className="private-journal-list">{savedItems.map(item=>{
        if(item.type==='media') {
          const record=item.record;
          const label=record.title || record.originalName || `Private ${record.kind}`;
          return <li className="private-journal-list-item" key={`media-${record.mediaId}`}><button className="private-journal-record" onClick={()=>openMedia(record)}><span className="private-journal-record-mark" aria-hidden="true"><BookOpen size={17} strokeWidth={1.6} /></span><span className="private-journal-record-copy"><strong>{label}</strong><span>{record.kind==='image'?'Private image':'Private audio'} · Open private media</span></span><span className="private-journal-record-arrow" aria-hidden="true">↗</span></button></li>;
        }
        const record=item.record;
        let label='Private record';
        try {label=readPrivateText(record).title || label;} catch {}
        return <li className="private-journal-list-item" key={`text-${record.recordId}`}><button className="private-journal-record" onClick={()=>open(record)}><span className="private-journal-record-mark" aria-hidden="true"><BookOpen size={17} strokeWidth={1.6} /></span><span className="private-journal-record-copy"><strong>{label}</strong><span>Open private record</span></span><span className="private-journal-record-arrow" aria-hidden="true">↗</span></button></li>;
      })}</ul></section>}
    </>}
    {selectedDraft && <PrivateDraftFields key={`draft-${selectedDraft.draftId}`} vault={vault} draft={selectedDraft} onSaved={saved} />}
    {selectedMedia && <div className="private-journal-record-detail">
      <section className="private-journal-history-card" aria-label="Private media details">
        <strong>Original {selectedMedia.kind} capture</strong>
        <p>{selectedMedia.clientCreatedAt} · Device time; this timestamp does not prove when capture occurred.</p>
        <p>{selectedMedia.kind==='image'?'Image':'Audio'} · {selectedMedia.mimeType} · {selectedMedia.byteLength.toLocaleString()} bytes · Captured with {selectedMedia.source}.</p>
        {selectedMedia.originalName && <p>Original file name: {selectedMedia.originalName}</p>}
        {selectedMedia.durationMs !== undefined && <p>Approximate recording duration: {Math.round(selectedMedia.durationMs/1000)} seconds</p>}
        {mediaError && <p className="private-journal-alert" role="alert">{mediaError}</p>}
        {!revealedMedia ? <button className="private-journal-history-toggle" type="button" disabled={mediaLoading || !mediaVault} onClick={revealMedia}>{mediaLoading?'Reading private media…':'Reveal media'}</button> : <>
          <button className="private-journal-history-toggle" type="button" onClick={()=>concealMedia()}>Conceal media</button>
          {revealedMedia.metadata.kind==='image'
            ? <img src={revealedMedia.url} alt={revealedMedia.metadata.title || 'Revealed private image'} style={{maxWidth:'100%',height:'auto'}} onError={()=>setMediaError('This browser cannot preview the saved image format. The encrypted original is unchanged.')} />
            : <audio ref={mediaElement} src={revealedMedia.url} controls preload="none" style={{maxWidth:'100%'}} onError={()=>setMediaError('This browser cannot play the saved audio format. The encrypted original is unchanged.')} />}
        </>}
      </section>
      {mediaVault && <PrivateRecordExport key={`export-media-${selectedMedia.mediaId}`} kind="media" vault={mediaVault} recordId={selectedMedia.mediaId} />}
      {mediaVault && <PrivateRecordBackup key={`backup-media-${selectedMedia.mediaId}`} kind="media" vault={mediaVault} recordId={selectedMedia.mediaId} />}
      {mediaVault && <PrivateRecordDeletion key={`delete-media-${selectedMedia.mediaId}`} kind="media" vault={mediaVault} recordId={selectedMedia.mediaId} onDeleted={backToRecords} />}
    </div>}
    {selected && text && <div className="private-journal-record-detail">
      <PrivateDraftFields key={`revision-${selected.revisionId}`} vault={vault}
        target={{recordId:selected.recordId,parentRevisionId:selected.revisionId}}
        initialTitle={text.title} initialBody={text.body} onSaved={saved} onContentChange={()=>{setShowHistory(false);setTextEdited(true);}} />
      <button className="private-journal-history-toggle" type="button" aria-expanded={showHistory} onClick={()=>setShowHistory(value=>!value)}>{showHistory?'Conceal history':'Reveal original and revision history'} ({history.length})</button>
      {showHistory && <section className="private-journal-history" aria-label="Original and revision history">
        <p className="private-journal-history-note">Times come from this device. History preserves saved versions; it does not prove when an event occurred.</p>
        {history.map(record=><article className="private-journal-history-card" key={record.revisionId}>
          <strong>{record.kind==='original'?'Original capture':'Appended revision'}</strong>
          <p>{record.clientCreatedAt}</p><pre>{safeHistoryText(record)}</pre>
        </article>)}
      </section>}
      <PrivateRecordExport key={`export-text-${selected.recordId}`} kind="text" vault={vault} recordId={selected.recordId} />
      {!textEdited && <PrivateRecordBackup key={`backup-text-${selected.recordId}`} kind="text" vault={vault} recordId={selected.recordId} />}
      {textEdited
        ? <p className="private-journal-note">Save your current edits as a revision before preparing deletion, so they are not silently discarded.</p>
        : <PrivateRecordDeletion key={`delete-text-${selected.recordId}`} kind="text" vault={vault} recordId={selected.recordId} onDeleted={backToRecords} />}
    </div>}
  </section>;
}

function safeHistoryText(record:LocalVaultRevision) {
  try {return readPrivateText(record).body;} catch {return 'This revision format cannot be displayed here.';}
}
