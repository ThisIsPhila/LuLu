import { useEffect, useRef, useState } from 'react';
import type { LocalVault, LocalVaultDraft, LocalVaultDraftTarget, LocalVaultRevision } from '../services/vault/localVault';
import { readPrivateTextContent, type PrivateText } from '../services/privateCapture';
import { createPrivateDraftAutosave, type PrivateDraftAutosaveController, type PrivateDraftSaveStatus } from '../services/privateDraftAutosave';
import { PrivateParagraphEditor } from './PrivateParagraphEditor';

type Props = {
  vault: LocalVault;
  draft?: LocalVaultDraft;
  target?: LocalVaultDraftTarget;
  initialTitle?: string;
  initialBody?: string;
  onSaved: (revision: LocalVaultRevision) => void;
  onContentChange?: (content: PrivateText) => void;
};

/** Private-session-only editor. Drafts never enter ordinary entry state or previews. */
export function PrivateDraftFields({vault, draft, target, initialTitle='', initialBody='', onSaved, onContentChange}: Props) {
  const [initial] = useState(() => ({
    id: draft?.draftId ?? crypto.randomUUID(),
    content: draft ? readPrivateTextContent(draft.content) : {
      format:'lulu-private-text-v1' as const, mediaType:'text/plain' as const,
      title:initialTitle, body:initialBody, languages:[],
    },
    draft,
    target: draft?.target ?? target,
  }));
  const [content,setContent] = useState<PrivateText>(initial.content);
  const snapshot = useRef(initial.content);
  const controller = useRef<PrivateDraftAutosaveController | null>(null);
  const [status,setStatus] = useState<PrivateDraftSaveStatus>({state:'idle',draftId:initial.id,version:initial.draft?.version ?? null});
  const [savingRecord,setSavingRecord] = useState(false);
  const savedCallback=useRef(onSaved);
  savedCallback.current=onSaved;

  useEffect(() => {
    let active=true;
    const autosave=createPrivateDraftAutosave({
      vault,draftId:initial.id,expectedVersion:initial.draft?.version ?? null,
      ...(initial.draft ? {ownerId:initial.draft.ownerId,initialContent:initial.content} : {}),
      ...(initial.target ? {target:initial.target} : {}),
      onStatus: next => {if(active) setStatus(next);},
    });
    controller.current=autosave;
    setStatus(autosave.status);
    // StrictMode setup/cleanup must not create an abandoned first writer.
    void Promise.resolve().then(() => {
      if(active && !initial.draft && !initial.target && (snapshot.current.title || snapshot.current.body)) autosave.acceptSnapshot(snapshot.current);
    });
    return () => {active=false;autosave.stop();if(controller.current===autosave) controller.current=null;};
  },[vault,initial]);

  function change(patch: Partial<Pick<PrivateText,'title'|'body'>>) {
    const next={...snapshot.current,...patch};
    snapshot.current=next;setContent(next);onContentChange?.(next);
    controller.current?.acceptSnapshot(next);
  }

  async function saveRecord() {
    const autosave=controller.current;
    if(!autosave) return;
    setSavingRecord(true);
    try {
      const revision=await autosave.finalize();
      if(controller.current===autosave) savedCallback.current(revision);
    } catch { /* The controller reports a content-free, actionable status. */ }
    finally {if(controller.current===autosave) setSavingRecord(false);}
  }

  return <div className="private-draft-fields">
    <p className="private-draft-explainer">Drafts save encrypted in this browser. Reopen them after private verification. A sudden exit may lose changes still saving.</p>
    <fieldset className="private-draft-inputs" disabled={savingRecord}>
      <label className="private-draft-title-label">Title<input className="private-draft-title" aria-label="Private entry title" value={content.title} maxLength={200}
        autoComplete="off" spellCheck={false}
        onChange={event=>change({title:event.target.value})} /></label>
      <PrivateParagraphEditor value={content.body} sessionUnlocked onChange={body=>change({body})} />
    </fieldset>
    <p className={`private-draft-save-status is-${status.state}`} role={status.state==='error'?'alert':'status'} aria-live="polite">
      {status.state==='idle' && (initial.target?'Edit to create a recovery draft for this revision.':'Start writing to create a recovery draft.')}
      {status.state==='saving' && 'Saving encrypted draft… Latest changes are not yet confirmed.'}
      {status.state==='saved' && 'Draft saved in this browser.'}
      {status.state==='finalizing' && 'Saving private record…'}
      {status.state==='finalized' && 'Private record saved.'}
      {status.state==='error' && status.message}
    </p>
    {status.state==='error' && status.retryable && <button className="private-draft-retry" type="button" disabled={savingRecord}
      onClick={()=>{if(status.stage==='record')void saveRecord();else void controller.current?.retry().catch(()=>{});}}>
      {status.stage==='record'?'Retry saving private record':'Retry draft save'}</button>}
    <button type="button" disabled={savingRecord || !content.body.trim() || status.state==='finalized' || Boolean(initial.target && status.state==='idle')}
      className="save-protected-btn composer-save private-draft-save" onClick={()=>void saveRecord()}>
      {savingRecord?'Saving…':initial.target?'Save as a new revision':'Save private record'}
    </button>
  </div>;
}
