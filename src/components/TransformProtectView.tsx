import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  Image,
  Mic,
  Square,
  X,
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
import { normalizeOrdinaryTags } from '../domain/ordinaryMetadata';
import { createPlatformAudioCapture } from '../platform/nativeAudio';
import type { AudioCaptureController, AudioCaptureState } from '../services/mediaCapture';
import { captureNativeImage } from '../platform/nativeCapture';
import { isNativePlatform } from '../platform/runtime';
import { deleteOrdinaryMedia, listOrdinaryMedia, saveOrdinaryMedia } from '../services/ordinaryMedia';
import type { OrdinaryMediaRef } from '../domain/journal';
import { extractCompletedWritingInput } from '../domain/writingSegments';
import { scrubLuMessage } from '../services/luChat';
import { LU_CHAT_MAX_INPUT_CHARACTERS, type LuScrubbedEntity } from '../services/luChatContracts';
import { assessReviewedPatterns } from '../services/privacy/cloudProcessingClient';
import type { PatternAssessment } from '../services/privacy/patternIntelligenceContracts';

type Props = {
  entities: Entity[];
  ownerId: string;
  protectedMode: boolean;
  editingEntry?: Entry;
  initialKind?: Entry['kind'];
  initialDraft?: string;
  initialDraftTitle?: string;
  onBack: () => void;
  onSaveProtected: (data: {
    entryId: string;
    title: string;
    body: string;
    originalBody: string;
    kind: 'Journal' | 'Story';
    curatedDeck: string;
    favorite: boolean;
    tags: string[];
  }) => Promise<void>;
  onDeleteOrdinary: (entryId: string) => Promise<void>;
  isOrdinarySessionActive: () => boolean;
  onOpenEntityInspector: (currentText?: string) => void;
  onAskLu?: (message: string) => void;
  onOpenSupport?: () => void;
  privateVault?: LocalVault;
  privateMediaVault?: LocalMediaVault;
  onPrivateSaved: (revision: LocalVaultRevision) => void;
};

type WritingSegment = {
  id: string;
  originalText: string;
  status: 'waiting' | 'processing' | 'ready' | 'error';
  scrubbedText?: string;
  entities: LuScrubbedEntity[];
  message?: string;
  assessmentConsent: boolean;
  assessmentStatus: 'idle' | 'assessing' | 'ready' | 'error';
  assessment?: PatternAssessment;
  assessmentMessage?: string;
};

function makeWritingSegment(originalText: string, status: WritingSegment['status']): WritingSegment {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, originalText, status, entities: [], assessmentConsent: false, assessmentStatus: 'idle' };
}

function renderSourceHighlights(text: string, entities: LuScrubbedEntity[]): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [index, entity] of entities.entries()) {
    if (entity.start < cursor || entity.end > text.length) continue;
    parts.push(text.slice(cursor, entity.start));
    parts.push(<mark className="ordinary-writing-pii is-source" key={`source-${index}`}>{text.slice(entity.start, entity.end)}<small>{entity.label}</small></mark>);
    cursor = entity.end;
  }
  parts.push(text.slice(cursor));
  return parts;
}

function renderScrubbedHighlights(text: string, scrubbed: string, entities: LuScrubbedEntity[]): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let sourceCursor = 0;
  let scrubbedCursor = 0;
  for (const [index, entity] of entities.entries()) {
    if (entity.start < sourceCursor || entity.end > text.length) continue;
    const unchanged = text.slice(sourceCursor, entity.start);
    parts.push(scrubbed.slice(scrubbedCursor, scrubbedCursor + unchanged.length));
    scrubbedCursor += unchanged.length;
    parts.push(<mark className="ordinary-writing-pii is-scrubbed" key={`scrubbed-${index}`}>{entity.replacement}<small>{entity.label}</small></mark>);
    scrubbedCursor += entity.replacement.length;
    sourceCursor = entity.end;
  }
  parts.push(scrubbed.slice(scrubbedCursor));
  return parts;
}

export const TransformProtectView: React.FC<Props> = ({
  entities,
  ownerId,
  protectedMode,
  editingEntry,
  initialKind = 'Journal',
  initialDraft,
  initialDraftTitle,
  onBack,
  onSaveProtected,
  onDeleteOrdinary,
  isOrdinarySessionActive,
  onOpenEntityInspector,
  onAskLu,
  onOpenSupport,
  privateVault,
  privateMediaVault,
  onPrivateSaved,
}) => {
  const viewport = useWritingViewport();
  const [entryId] = useState(() => editingEntry?.id ?? crypto.randomUUID());
  const [naturalText, setNaturalText] = useState(editingEntry?.body ?? initialDraft ?? '');
  const [title, setTitle] = useState(editingEntry?.title ?? initialDraftTitle ?? '');
  const [kind, setKind] = useState<Entry['kind']>(editingEntry?.kind ?? initialKind);
  const [curatedDeck, setCuratedDeck] = useState(editingEntry?.curatedDeck ?? '');
  const [favorite, setFavorite] = useState(editingEntry?.favorite ?? false);
  const [tagsDraft, setTagsDraft] = useState((editingEntry?.tags ?? []).join(', '));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const [menuAction,setMenuAction]=useState<'menu'|'export'|'delete'>('menu');
  const [deleteAcknowledged,setDeleteAcknowledged]=useState(false);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [attachments,setAttachments]=useState<Array<{ref:OrdinaryMediaRef;url:string}>>([]);
  const [writingSegments,setWritingSegments]=useState<WritingSegment[]>([]);
  const [cloudScrubConsent,setCloudScrubConsent]=useState(false);
  const [editingSegmentId,setEditingSegmentId]=useState<string|null>(null);
  const [initialAttachmentIds,setInitialAttachmentIds]=useState<string[]>([]);
  const [mediaMessage,setMediaMessage]=useState('');
  const [audioState,setAudioState]=useState<AudioCaptureState>('idle');
  const [captureBusy,setCaptureBusy]=useState(false);
  const [textareaHeight,setTextareaHeight]=useState<number>();
  const optionsMenu=useRef<HTMLDetailsElement|null>(null);
  const mediaInput=useRef<HTMLInputElement|null>(null);
  const textarea=useRef<HTMLTextAreaElement|null>(null);
  const recorder=useRef<AudioCaptureController|null>(null);
  const newMediaIds=useRef(new Set<string>());
  const removedMediaIds=useRef(new Set<string>());
  const saveCompleted=useRef(false);
  const attachmentUrls=useRef(new Set<string>());
  const discardDialog=useRef<HTMLDialogElement|null>(null);
  const mounted=useRef(false);
  const exportUrls=useRef(new Set<string>());
  const exportTimers=useRef(new Set<ReturnType<typeof setTimeout>>());
  const editingSegmentPosition=useRef<number|null>(null);
  const segmentRequests=useRef(new Set<string>());

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

  async function processWritingSegment(segment: WritingSegment) {
    if (segmentRequests.current.has(segment.id)) return;
    if (!isOrdinarySessionActive()) {
      setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, status: 'error', message: 'Your LuLu session expired. Sign in again before cloud processing.' } : item));
      return;
    }
    if (segment.originalText.length > LU_CHAT_MAX_INPUT_CHARACTERS) {
      setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, status: 'error', message: `This paragraph is over ${LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()} characters. Split it into shorter paragraphs to run the cloud review.` } : item));
      return;
    }
    segmentRequests.current.add(segment.id);
    setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, status: 'processing', message: undefined } : item));
    try {
      const result = await scrubLuMessage(segment.originalText);
      if (!isOrdinarySessionActive()) throw new Error('Your LuLu session expired. Sign in again before cloud processing.');
      if (mounted.current) setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, status: 'ready', scrubbedText: result.scrubbed, entities: result.entities, message: undefined, assessmentConsent: false, assessmentStatus: 'idle', assessment: undefined, assessmentMessage: undefined } : item));
    } catch (cause) {
      if (mounted.current) setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, status: 'error', message: cause instanceof Error ? cause.message : 'Cloud review failed. Your original writing is still here.' } : item));
    } finally {
      segmentRequests.current.delete(segment.id);
    }
  }

  function setPatternConsent(segmentId: string, allowed: boolean) {
    setWritingSegments(current => current.map(item => item.id === segmentId
      ? { ...item, assessmentConsent: allowed, assessmentStatus: 'idle', assessment: undefined, assessmentMessage: undefined }
      : item));
  }

  async function assessWritingSegment(segment: WritingSegment) {
    if (segment.status !== 'ready' || !segment.scrubbedText || !segment.assessmentConsent || segment.assessmentStatus === 'assessing') return;
    if (!isOrdinarySessionActive()) {
      setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, assessmentStatus: 'error', assessmentMessage: 'Your LuLu session expired. Sign in again before requesting Decisions.' } : item));
      return;
    }
    setWritingSegments(current => current.map(item => item.id === segment.id ? { ...item, assessmentStatus: 'assessing', assessmentMessage: 'Sending only the scrubbed paragraph to Decisions…', assessment: undefined } : item));
    try {
      const assessment = await assessReviewedPatterns({
        text: segment.scrubbedText,
        revision: segment.id,
        purpose: 'Understand possible behaviour patterns described in this reviewed journal passage',
        isAccountSessionActive: isOrdinarySessionActive,
      });
      if (mounted.current && isOrdinarySessionActive()) setWritingSegments(current => current.map(item => item.id === segment.id
        ? { ...item, assessmentStatus: 'ready', assessment, assessmentMessage: undefined }
        : item));
    } catch (cause) {
      if (mounted.current) setWritingSegments(current => current.map(item => item.id === segment.id
        ? { ...item, assessmentStatus: 'error', assessmentMessage: cause instanceof Error ? cause.message : 'Decisions could not assess this paragraph. Your writing is unchanged.' }
        : item));
    }
  }

  function handleWritingInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const input = event.currentTarget;
    const nextText = input.value;
    const completed = extractCompletedWritingInput(naturalText, nextText, input.selectionStart);
    if (!completed) {
      setNaturalText(nextText);
      return;
    }

    const shouldProcess = cloudScrubConsent;
    const newSegments = completed.paragraphs.map(paragraph => makeWritingSegment(paragraph, shouldProcess ? 'processing' : 'waiting'));
    const insertAt = editingSegmentPosition.current;
    editingSegmentPosition.current = null;
    setEditingSegmentId(null);
    setNaturalText(completed.remainingText);
    setWritingSegments(current => {
      const next = [...current];
      if (insertAt === null) next.push(...newSegments);
      else next.splice(Math.min(insertAt, next.length), 0, ...newSegments);
      return next;
    });
    if (shouldProcess) for (const segment of newSegments) void processWritingSegment(segment);
    requestAnimationFrame(() => {
      const field = textarea.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(0, 0);
    });
  }

  function setCloudConsent(allowed: boolean) {
    setCloudScrubConsent(allowed);
    if (allowed) {
      for (const segment of writingSegments) if (segment.status === 'waiting') void processWritingSegment(segment);
    }
  }

  function editWritingSegment(segment: WritingSegment) {
    if (deleteBusy || editingSegmentId) return;
    const position = writingSegments.findIndex(item => item.id === segment.id);
    if (position < 0) return;
    const unsentDraft = naturalText.trim();
    const draftSegment = unsentDraft ? makeWritingSegment(naturalText, 'waiting') : null;
    setWritingSegments(current => {
      const next = [...current];
      next.splice(position, 1);
      if (draftSegment) next.push(draftSegment);
      return next;
    });
    editingSegmentPosition.current = position;
    setEditingSegmentId(segment.id);
    setNaturalText(segment.originalText);
    requestAnimationFrame(() => textarea.current?.focus());
  }

  function originalBodyForSave() {
    const paragraphs = writingSegments.map(segment => segment.originalText);
    if (editingSegmentId && editingSegmentPosition.current !== null) paragraphs.splice(editingSegmentPosition.current, 0, naturalText);
    else if (naturalText.trim()) paragraphs.push(naturalText);
    return paragraphs.join('\n\n');
  }

  useEffect(()=>{
    let active=true;
    const releaseUrls=()=>{for(const url of attachmentUrls.current)URL.revokeObjectURL(url);attachmentUrls.current.clear();};
    const refresh=async()=>{
      try{
        const stored=await listOrdinaryMedia(ownerId,entryId);
        if(!active)return;
        releaseUrls();
        setInitialAttachmentIds(stored.map(item=>item.ref.id).sort());
        setAttachments(stored.map(item=>{const url=URL.createObjectURL(item.blob);attachmentUrls.current.add(url);return {ref:item.ref,url};}));
      }catch{if(active)setMediaMessage('Attachments could not be loaded from this device.');}
    };
    void refresh();
    const capture=createPlatformAudioCapture({
      onState:status=>{if(active){setAudioState(status.state);if(status.message)setMediaMessage(status.message);}},
      onCaptured:(blob,metadata)=>{if(active)void addAttachment(blob,{kind:'audio',durationMs:metadata.durationMs});},
    });
    recorder.current=capture;
    return()=>{
      active=false;capture.cancel();if(recorder.current===capture)recorder.current=null;
      releaseUrls();
      if(!saveCompleted.current && newMediaIds.current.size)void deleteOrdinaryMedia(ownerId,entryId,[...newMediaIds.current]);
    };
  },[ownerId,entryId]);

  useEffect(()=>{
    const input=textarea.current;
    if(!input)return;
    input.style.height='auto';
    const maxHeight=Math.max(120,Math.floor((viewport.height||window.innerHeight)*0.52));
    const height=Math.min(input.scrollHeight,maxHeight);
    input.style.height=`${height}px`;
    input.style.overflowY=input.scrollHeight>maxHeight?'auto':'hidden';
    setTextareaHeight(height);
  },[naturalText,viewport.height]);

  const transformedText = originalBodyForSave();

  const wordsCount = transformedText.trim().split(/\s+/).filter(Boolean).length;
  const initialTitle = editingEntry?.title ?? '';
  const initialBody = editingEntry?.body ?? '';
  const initialKindValue = editingEntry?.kind ?? initialKind;
  const initialDeck = editingEntry?.curatedDeck ?? '';
  const initialFavorite = editingEntry?.favorite ?? false;
  const initialTags = (editingEntry?.tags ?? []).join(', ');
  const attachmentIds=attachments.map(item=>item.ref.id).sort();
  const isDirty = title !== initialTitle || transformedText !== initialBody || kind !== initialKindValue || curatedDeck !== initialDeck || favorite !== initialFavorite || tagsDraft !== initialTags || attachmentIds.join('|') !== initialAttachmentIds.join('|');

  useEffect(()=>{
    const dialog=discardDialog.current;
    if(!dialog)return;
    if(confirmDiscard && !dialog.open)dialog.showModal();
    else if(!confirmDiscard && dialog.open)dialog.close();
  },[confirmDiscard]);

  function requestBack(){
    if(busy || deleteBusy)return;
    if(isDirty)setConfirmDiscard(true);
    else onBack();
  }

  const handleSave = async () => {
    if (busy || deleteBusy) return;
    setBusy(true);setError('');
    try {
      await onSaveProtected({entryId,title:title || (kind === 'Story' ? 'Story' : 'Journal entry'),body:transformedText,originalBody:naturalText,kind,curatedDeck:kind==='Story'?curatedDeck.trim().replace(/\s+/g,' '):'',favorite,tags:normalizeOrdinaryTags(tagsDraft.split(','))});
      saveCompleted.current=true;
      if(removedMediaIds.current.size)await deleteOrdinaryMedia(ownerId,entryId,[...removedMediaIds.current]);
    }
    catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft is still here.');}
    finally{setBusy(false);}
  };

  function closeOptions() {
    if(optionsMenu.current)optionsMenu.current.open=false;
    setMenuAction('menu');
  }

  async function addAttachment(blob:Blob,details:{kind:OrdinaryMediaRef['kind'];name?:string;durationMs?:number}) {
    if(!blob.size)return;
    setCaptureBusy(true);setMediaMessage('Saving attachment on this device…');
    try{
      const ref=await saveOrdinaryMedia(ownerId,entryId,blob,details);
      newMediaIds.current.add(ref.id);
      const url=URL.createObjectURL(blob);attachmentUrls.current.add(url);
      setAttachments(current=>[...current,{ref,url}]);setMediaMessage('Attachment saved on this device.');
    }catch(error){setMediaMessage(error instanceof Error?error.message:'The attachment could not be saved on this device.');}
    finally{setCaptureBusy(false);}
  }

  async function captureImage() {
    setMediaMessage('');
    if(isNativePlatform()){
      try{const captured=await captureNativeImage();if(captured)await addAttachment(captured.blob,{kind:'image',name:`Photo.${captured.format}`});}
      catch{setMediaMessage('The camera could not capture an image. Check camera permission and try again.');}
    }else mediaInput.current?.click();
  }

  function removeAttachment(id:string){
    setAttachments(current=>{
      const item=current.find(candidate=>candidate.ref.id===id);
      if(item){URL.revokeObjectURL(item.url);attachmentUrls.current.delete(item.url);}
      return current.filter(candidate=>candidate.ref.id!==id);
    });
    if(newMediaIds.current.has(id)){newMediaIds.current.delete(id);void deleteOrdinaryMedia(ownerId,entryId,[id]);}
    else removedMediaIds.current.add(id);
    setMediaMessage('Attachment removed from this entry.');
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
        <button className="icon-btn-round" onClick={requestBack} aria-label="Go back" disabled={busy || deleteBusy}>
          <ArrowLeft size={18} />
        </button>
        <div className="header-brand-title"><LuLuLogo size="sm" /></div>
        <div className="header-avatar-circle">
          <User size={15} />
        </div>
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
                <button type="button" aria-pressed={kind==='Journal'} onClick={()=>{setKind('Journal');setCuratedDeck('');closeOptions();}}>Journal{kind==='Journal'?' · current':''}</button>
                <button type="button" aria-pressed={kind==='Story'} onClick={()=>{setKind('Story');closeOptions();}}>Story{kind==='Story'?' · current':''}</button>
                {kind==='Story' && <label className="story-collection-field">Story collection <span>(optional)</span>
                  <input value={curatedDeck} onChange={event=>setCuratedDeck(event.target.value)} maxLength={80} placeholder="For example, Summer memories" />
                  <small>Use the same name to group saved stories together.</small>
                </label>}
                <label className="ordinary-entry-metadata-field"><input type="checkbox" checked={favorite} onChange={event=>setFavorite(event.target.checked)} /> Save to Favorites</label>
                <label className="story-collection-field">Topics <span>(optional, up to 12)</span>
                  <input value={tagsDraft} onChange={event=>setTagsDraft(event.target.value)} placeholder="For example, family, work" aria-label="Entry topics, separated by commas" />
                  <small>Separate topics with commas. Topics appear in Library filters.</small>
                </label>
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

        <section className="composer-processing-panel ordinary-writing-workspace" aria-label="Privacy-reviewed writing workspace">
          <div className="ordinary-writing-workspace-intro">
            <span className="ordinary-writing-kicker">CLOUD DEMO · WRITING WORKSPACE</span>
            <p>Finish a paragraph with <strong>two line breaks</strong> to move it here. LuLu’s cloud privacy service receives the original to find personal details; only the scrubbed version below is ready to share with Lu. A scan can miss details.</p>
            <label className="ordinary-writing-consent"><input type="checkbox" checked={cloudScrubConsent} onChange={event => setCloudConsent(event.target.checked)} /><span>Allow completed paragraphs to be sent to the cloud privacy service for PII review.</span></label>
          </div>
          {editingSegmentId && <p className="ordinary-writing-edit-status" role="status">Editing the original paragraph below. Complete it with two line breaks to review it again.</p>}
          {writingSegments.length === 0 && <p className="ordinary-writing-empty">Your completed paragraphs will appear here. Nothing is sent until you allow cloud review.</p>}
          {writingSegments.map(segment => <article className={`ordinary-writing-segment is-${segment.status}`} key={segment.id}>
            <header><div><strong>{segment.status === 'ready' ? 'Paragraph reviewed' : segment.status === 'processing' ? 'Reviewing paragraph' : segment.status === 'error' ? 'Review needs attention' : 'Waiting for cloud review'}</strong><small>{segment.status === 'ready' ? `${segment.entities.length} identifying mention${segment.entities.length === 1 ? '' : 's'} replaced` : segment.status === 'processing' ? 'Searching for personal details…' : segment.status === 'error' ? segment.message : 'This paragraph has not left this device.'}</small></div><button type="button" onClick={() => editWritingSegment(segment)} disabled={deleteBusy || Boolean(editingSegmentId)} aria-label="Edit this original paragraph">Edit original</button></header>
            {segment.status === 'waiting' && cloudScrubConsent && <button type="button" className="ordinary-writing-ask-lu" onClick={() => void processWritingSegment(segment)}>Review this paragraph with LuLu</button>}
            {segment.status === 'ready' && segment.scrubbedText !== undefined ? <div className="ordinary-writing-comparison">
              <div className="ordinary-writing-copy"><small>Before · original sent to privacy service</small><p>{renderSourceHighlights(segment.originalText, segment.entities)}</p></div>
              <div className="ordinary-writing-copy is-safe"><small>After · scrubbed text available to Lu</small><p>{renderScrubbedHighlights(segment.originalText, segment.scrubbedText, segment.entities)}</p>{segment.entities.length === 0 && <em>No identifying details were detected. A cloud scan can miss details.</em>}</div>
              {segment.entities.length > 0 && <p className="ordinary-writing-entity-legend">Highlighted labels show what was replaced with generic names such as Person A or Place A.</p>}
              {onAskLu && <button type="button" className="ordinary-writing-ask-lu" onClick={() => onAskLu(segment.scrubbedText!)}>Ask Lu about this scrubbed paragraph</button>}
              <div className="ordinary-writing-pattern-action">
                <label><input type="checkbox" checked={segment.assessmentConsent} disabled={segment.assessmentStatus === 'assessing'} onChange={event => setPatternConsent(segment.id, event.target.checked)} /><span>I reviewed this scrubbed paragraph and allow OpenAI Decisions to assess possible patterns in it. This is not a prediction, diagnosis, or finding about what happened.</span></label>
                <button type="button" className="ordinary-writing-ask-lu" disabled={!segment.assessmentConsent || segment.assessmentStatus === 'assessing'} onClick={() => void assessWritingSegment(segment)}>
                  {segment.assessmentStatus === 'assessing' ? 'Reviewing pattern signals…' : segment.assessmentStatus === 'ready' ? 'Assess this paragraph again' : 'Understand patterns in this paragraph'}
                </button>
                {segment.assessmentMessage && <p className={segment.assessmentStatus === 'error' ? 'ordinary-writing-pattern-error' : 'ordinary-writing-pattern-status'} role={segment.assessmentStatus === 'error' ? 'alert' : 'status'}>{segment.assessmentMessage}</p>}
              </div>
              {segment.assessment && <section className="ordinary-writing-pattern-results" aria-label="Advisory pattern signals">
                <header><strong>Signals in this passage</strong><small>OpenAI Decisions · GPT-6 Luna · advisory only</small></header>
                <p>Scores describe how strongly the scrubbed wording matches a pattern. They do not estimate whether an event happened or predict what someone will do. The model can miss context.</p>
                {segment.assessment.patterns.some(item => item.probability !== null && item.probability >= .4)
                  ? <ul>{segment.assessment.patterns.filter(item => item.probability !== null && item.probability >= .4).sort((a,b)=>(b.probability ?? 0)-(a.probability ?? 0)).map(item => <li key={item.id}><span><strong>{item.title}</strong><small>{item.explanation}</small></span><b>{Math.round((item.probability ?? 0) * 100)}% text signal</b></li>)}</ul>
                  : <p className="ordinary-writing-pattern-status">No pattern reached the display threshold in this paragraph. That does not mean nothing happened.</p>}
                {segment.assessment.immediateSafety.probability !== null && segment.assessment.immediateSafety.probability >= .65 && <aside role="note"><strong>Possible urgent wording cue.</strong> This signal can be wrong and does not contact anyone. If you choose, open support options.</aside>}
                <div className="ordinary-writing-pattern-actions">
                  {onAskLu && <button type="button" onClick={() => onAskLu(`Please explain these advisory pattern signals using only this reviewed pseudonymised passage:\n\n${segment.scrubbedText}`)}>Ask Lu about these signals</button>}
                  {onOpenSupport && <button type="button" onClick={onOpenSupport}>Find support options</button>}
                </div>
              </section>}
            </div> : segment.status === 'error' ? <div className="ordinary-writing-error"><p>{segment.message}</p><button type="button" disabled={!cloudScrubConsent} onClick={() => void processWritingSegment(segment)}>Try cloud review again</button></div> : null}
          </article>)}
        </section>

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
            ref={textarea}
            className="original-natural-textarea"
            aria-label="Write your entry"
            value={naturalText}
            onChange={handleWritingInput}
            disabled={deleteBusy}
            rows={1}
            style={textareaHeight?{height:textareaHeight}:undefined}
            placeholder="Write naturally in your own words..."
          />

          {attachments.length>0 && <div className="ordinary-composer-attachments" aria-label="Entry attachments">
            {attachments.map(({ref,url})=><div className="ordinary-composer-attachment" key={ref.id}>
              {ref.kind==='image'?<img src={url} alt={ref.name||'Attached image'}/>:<div className="ordinary-audio-attachment"><span>Voice note</span><audio controls preload="metadata" src={url}/></div>}
              <button type="button" aria-label="Remove attachment" title="Remove attachment" onClick={()=>removeAttachment(ref.id)}><X size={14}/></button>
            </div>)}
            <p className="ordinary-media-local-note">Attachments stay on this device; journal text syncs with your account.</p>
          </div>}

          <div className="card-bottom-shelf">
            <div className="shelf-tools">
              <button type="button" className="shelf-tool-btn" aria-label="Add image" title="Add image" disabled={captureBusy||audioState==='recording'} onClick={()=>void captureImage()}>
                <Image size={15} />
              </button>
              <input ref={mediaInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" hidden onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)void addAttachment(file,{kind:'image',name:file.name});}} />
              <button type="button" className="shelf-tool-btn" title={audioState==='recording'?'Stop recording':'Record voice note'} aria-label={audioState==='recording'?'Stop recording':'Record voice note'} disabled={captureBusy||audioState==='requesting'||audioState==='stopping'} onClick={()=>{setMediaMessage('');if(audioState==='recording')recorder.current?.stop();else void recorder.current?.start();}}>
                {audioState==='recording'?<Square size={15}/>:<Mic size={15} />}
              </button>
              <button className="shelf-tool-btn" type="button" title="Options" aria-label="Entry options" disabled={deleteBusy} onClick={()=>{if(optionsMenu.current)optionsMenu.current.open=!optionsMenu.current.open;}}>
                <MoreHorizontal size={15} />
              </button>
            </div>
          <button className="save-protected-btn composer-save" onClick={handleSave} disabled={busy || deleteBusy || !transformedText.trim()}><ShieldCheck size={15} /><span>{busy?'Saving…':editingEntry?'Save changes':'Save entry'}</span></button>
          </div>
          {mediaMessage && <p className="ordinary-media-status" role={mediaMessage.includes('denied')||mediaMessage.includes('could not')?'alert':'status'}>{audioState==='recording'?'Recording voice note… ':''}{mediaMessage}</p>}
        </div>
        {downloadNotice && <p className="journal-source-status" role="status">{downloadNotice}</p>}

</div>
      </main>
      <dialog ref={discardDialog} className="composer-discard-dialog" aria-labelledby="discard-title" aria-describedby="discard-copy"
        onCancel={event=>{event.preventDefault();setConfirmDiscard(false);}}
        onClose={()=>setConfirmDiscard(false)}>
        <h2 id="discard-title">Leave without saving?</h2>
        <p id="discard-copy">Your writing has not been saved.</p>
        <div className="composer-discard-actions">
          <button type="button" className="composer-discard-keep" onClick={()=>setConfirmDiscard(false)}>Keep editing</button>
          <button type="button" className="composer-discard-leave" onClick={()=>{setConfirmDiscard(false);onBack();}}>Discard and leave</button>
        </div>
      </dialog>
    </div>
  );
};
