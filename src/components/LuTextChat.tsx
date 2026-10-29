import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, ExternalLink, ImagePlus, LoaderCircle, Paperclip, X } from 'lucide-react';
import { sendLuChatMessage, scrubLuMessage } from '../services/luChat';
import { LU_CHAT_MAX_INPUT_CHARACTERS, validateLuChatInput, type LuAgentAction, type LuScrubbedEntity, type LuSurfaceReference } from '../services/luChatContracts';
import { createLuConversationId, saveLuConversation, type LuSavedConversation, type LuSavedMessage, type LuToolEvent } from '../services/luConversationHistory';
import { labelLuAction, matchLuTextAction, validateScrubbedLuCommand, type LuTextAction } from '../services/privacy/luTextActions';
import './LuTextChat.css';

type ChatMessage = LuSavedMessage & { role: 'you' | 'lu'; attachments?: ImageAttachment[] };
type ImageAttachment = { name: string; dataUrl: string };

function renderOriginalHighlights(text:string,entities:LuScrubbedEntity[]):ReactNode[]{
  const chunks:ReactNode[]=[];let cursor=0;
  for(const [index,entity] of entities.entries()){
    if(entity.start<cursor||entity.end>text.length)continue;
    if(entity.start>cursor)chunks.push(text.slice(cursor,entity.start));
    chunks.push(<mark className="lu-chat-pii-highlight" title={`Identified as ${entity.label}`} key={`pii-source-${index}`}>{text.slice(entity.start,entity.end)}<small>{entity.label}</small></mark>);
    cursor=entity.end;
  }
  chunks.push(text.slice(cursor));return chunks;
}

function renderScrubbedHighlights(original:string,entities:LuScrubbedEntity[]):ReactNode[]{
  const chunks:ReactNode[]=[];let sourceCursor=0;
  for(const [index,entity] of entities.entries()){
    if(entity.start<sourceCursor||entity.end>original.length)continue;
    chunks.push(original.slice(sourceCursor,entity.start));
    chunks.push(<mark className="lu-chat-pii-highlight is-replacement" title={`${entity.label} replaced`} key={`pii-replacement-${index}`}>{entity.replacement}<small>{entity.label}</small></mark>);
    sourceCursor=entity.end;
  }
  chunks.push(original.slice(sourceCursor));return chunks;
}

async function prepareImage(file: File): Promise<ImageAttachment> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('This image could not be opened.'));image.src=url;});
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height = Math.max(1,Math.round(image.naturalHeight*scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the image.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg',.76);
    if (Math.ceil(dataUrl.length*.75) > 1_000_000) throw new Error('This image is still too large after resizing. Choose a smaller image.');
    return {name:file.name.slice(0,100)||'Image',dataUrl};
  } finally { URL.revokeObjectURL(url); }
}

export function LuTextChat({ accountId, conversationId, savedConversation, onSessionChange, onLocalAction, onAgentAction, initialDraft = '', initialDraftRequestId = 0, onInitialDraftConsumed, onActivityChange }: {
  accountId: string;
  conversationId: string;
  savedConversation?: LuSavedConversation;
  onSessionChange: (conversation: LuSavedConversation) => void;
  onLocalAction?: (action: LuTextAction) => void;
  onAgentAction?: (action: LuAgentAction) => boolean|void;
  initialDraft?: string;
  initialDraftRequestId?: number;
  onInitialDraftConsumed?: (id: number) => void;
  onActivityChange?: (activity: string | null) => void;
}) {
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(()=>savedConversation?.messages.map(message=>({...message,role:message.speaker==='You'?'you':'lu'}))??[]);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState('');
  const [error, setError] = useState('');
  const [localAction, setLocalAction] = useState<LuTextAction|null>(null);
  const consumedInitialRequest = useRef(0);
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current=onSessionChange;

  useEffect(()=>{
    if(!messages.length)return;
    const firstUser=messages.find(message=>message.role==='you');
    const conversation:LuSavedConversation={
      id:conversationId,mode:'text',title:(firstUser?.originalText??firstUser?.text??'New conversation').replace(/\s+/gu,' ').slice(0,72),
      updatedAt:Date.now(),messages:messages.map(message=>({...message,speaker:message.role==='you'?'You':'Lu',role:undefined,attachments:undefined} as LuSavedMessage)),
    };
    void saveLuConversation(accountId,conversation).then(()=>onSessionChangeRef.current(conversation)).catch(()=>setError('This conversation could not be saved on this device.'));
  },[accountId,conversationId,messages]);

  useEffect(()=>{
    const container=thread.current;
    if(container)container.scrollTop=container.scrollHeight;
  },[messages,busy]);

  async function addFiles(files: FileList|null) {
    if(!files?.length)return;
    setError('');
    try {
      const next=await Promise.all(Array.from(files).slice(0,2-attachments.length).map(prepareImage));
      setAttachments(current=>[...current,...next].slice(0,2));
    } catch(cause) { setError(cause instanceof Error?cause.message:'This image could not be attached.'); }
    if(fileInput.current)fileInput.current.value='';
  }

  async function sendMessage(input: string) {
    if ((!input.trim()&&!attachments.length) || sending.current) return;
    if(!input.trim()){setError('Add a short LuLu question so Lu knows what to do with the image.');return;}
    sending.current = true; setBusy(true); setError(''); setLocalAction(null); setActivity('Checking your message for personal details…'); onActivityChange?.('Checking message…');
    try {
      const sourceText = validateLuChatInput(input);
      const imageSnapshot=attachments;
      const scrubbed = await scrubLuMessage(sourceText);
      const privacyEvent:LuToolEvent={id:createLuConversationId(),label:'Privacy check',state:'done',detail:scrubbed.entities.length?`${scrubbed.entities.length} identifying mention${scrubbed.entities.length===1?'':'s'} replaced.`:'No identifying details were detected.'};
      setMessages(current => [...current, { speaker:'You', role:'you', originalText:sourceText, text:scrubbed.scrubbed, entities:scrubbed.entities, tools:[privacyEvent], imageCount:imageSnapshot.length, attachments:imageSnapshot }]);
      const history = messages.slice(-6).map(message => ({
        role: message.role === 'you' ? 'user' as const : 'assistant' as const,
        text: [message.text, ...(message.references ?? []).map(reference => `Retrieved ${reference.kind}: ${reference.title}. ${reference.content}`)].join('\n').slice(0,1200),
      }));
      const safeCommand = validateScrubbedLuCommand(scrubbed.scrubbed);
      const matched = safeCommand ? matchLuTextAction(safeCommand) : null;
      setActivity('Lu is replying…'); onActivityChange?.('Lu is replying…');
      const result = await sendLuChatMessage({ ticket:scrubbed.ticket, text:scrubbed.scrubbed, sourceText, language:'auto', history, images:imageSnapshot.map(image=>image.dataUrl) });
      const events:LuToolEvent[]=[];
      if(result.references.length)events.push({id:createLuConversationId(),label:'Search Journal and Stories',state:'done',detail:`Found ${result.references.length} scrubbed excerpt${result.references.length===1?'':'s'}.`});
      for(const action of result.actions){
        const accepted=onAgentAction?.(action)!==false;
        const detail=!accepted?'Lu could not open this while the current screen has unfinished work.':action.kind==='create-draft'?`“${action.title}” is ready for your review; it is not saved yet.`:action.kind==='open-entry'?'Opened the entry you requested.':`Opened ${action.destination} in LuLu.`;
        events.push({id:createLuConversationId(),label:action.kind==='create-draft'?'Prepare a draft':action.kind==='open-entry'?'Open entry':'Navigate in LuLu',state:accepted?'done':'failed',detail,action});
      }
      setMessages(current => [...current, { speaker:'Lu', role:'lu', text:result.reply, references:result.references, tools:events }]);
      if (!result.actions.length && matched?.kind === 'quick') setLocalAction(matched);
      setDraft('');setAttachments([]);
    } catch (cause) {
      setDraft(input);
      setError(cause instanceof Error ? cause.message : 'Lu could not reply. Please try again.');
    } finally { sending.current = false; setBusy(false); setActivity(''); onActivityChange?.(null); }
  }
  useEffect(() => {
    if (!initialDraftRequestId || consumedInitialRequest.current === initialDraftRequestId || !initialDraft.trim()) return;
    consumedInitialRequest.current = initialDraftRequestId;
    void sendMessage(initialDraft);
    onInitialDraftConsumed?.(initialDraftRequestId);
  }, [initialDraftRequestId]);

  return <section className="lu-text-chat" aria-labelledby="lu-text-chat-title">
    <h3 className="lu-chat-sr-only" id="lu-text-chat-title">Conversation with Lu</h3>
    <aside className="lu-text-chat-cloud-warning" role="note"><strong>Cloud demo</strong><span>Text is checked by LuLu’s privacy service before GPT‑6 Luna replies. Images are sent to OpenAI without PII scrubbing. Don’t attach sensitive photos. Lu can search scrubbed excerpts from ordinary Journal and Story entries when you ask; protected private writing is never searched.</span></aside>
    {messages.length > 0 && <div ref={thread} className="lu-text-chat-thread" aria-label="Chat messages" aria-live="polite">{messages.map((message, index) => <article className={`lu-text-chat-message is-${message.role}`} key={`${index}-${message.role}`}>
      {message.role === 'you' ? <div className="lu-text-chat-privacy-review">
        {message.originalText !== undefined && <div className="lu-text-chat-privacy-side"><small>Your original message · received by LuLu’s privacy service</small><p>{renderOriginalHighlights(message.originalText,message.entities??[])}</p></div>}
        <div className="lu-text-chat-privacy-side is-scrubbed"><small>After privacy processing · sent to Lu</small><p>{message.originalText!==undefined?renderScrubbedHighlights(message.originalText,message.entities??[]):message.text}</p>{message.entities?.length? <small className="lu-text-chat-entity-count">{message.entities.length} identified mention{message.entities.length===1?'':'s'} replaced</small>:<small className="lu-text-chat-entity-count">No identifying details were detected by the cloud scan.</small>}</div>
        {message.attachments?.map((image,imageIndex)=><figure className="lu-chat-image" key={`${image.name}-${imageIndex}`}><img src={image.dataUrl} alt={image.name}/><figcaption>{image.name} · sent directly to the cloud model</figcaption></figure>)}
        {!message.attachments&&!!message.imageCount&&<p className="lu-chat-image-omitted">{message.imageCount} image{message.imageCount===1?'':'s'} attached · image files are not retained in saved history.</p>}
      </div> : <><small>Lu</small><p>{message.text}</p></>}
      {message.tools?.map(event=><div className={`lu-chat-tool-event is-${event.state}`} key={event.id}><span className="lu-chat-tool-indicator" aria-hidden="true">{event.state==='running'?<LoaderCircle size={16}/>:event.state==='failed'?'!':'✓'}</span><span><strong>{event.label}</strong>{event.detail&&<small>{event.detail}</small>}</span>{event.action&&event.state==='failed'&&<button type="button" onClick={()=>onAgentAction?.(event.action!)}>Try again</button>}</div>)}
      {message.references?.map(reference => <div className="lu-text-chat-reference" key={reference.reference}><small>{reference.kind} · {reference.reference.replace('_',' ')}</small><strong>{reference.title || 'Untitled entry'}</strong><p>{reference.content}</p><button type="button" className="is-secondary" disabled={busy} onClick={() => onAgentAction?.({kind:'open-entry',entryId:reference.entryId})}><ExternalLink size={15} aria-hidden="true"/>Open entry</button></div>)}
    </article>)}</div>}
    {busy&&<div className="lu-chat-processing" role="status" aria-live="polite"><LoaderCircle size={18}/>{activity||'Lu is working…'}</div>}
    <div className="lu-chat-composer"><label className="lu-chat-sr-only" htmlFor="lu-chat-message">Your message</label>
    {attachments.length>0&&<div className="lu-chat-attachments">{attachments.map((image,index)=><figure key={`${image.name}-${index}`}><img src={image.dataUrl} alt={image.name}/><button type="button" disabled={busy} aria-label={`Remove ${image.name}`} onClick={()=>setAttachments(current=>current.filter((_,item)=>item!==index))}><X size={15}/></button><figcaption>{image.name}</figcaption></figure>)}</div>}
    <textarea id="lu-chat-message" rows={2} maxLength={LU_CHAT_MAX_INPUT_CHARACTERS} value={draft} disabled={busy} onChange={event => {setDraft(event.target.value);setError('');}} placeholder="Message Lu…" onKeyDown={event => {if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendMessage(draft);}}} />
    <div className="lu-text-chat-compose-footer"><input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event=>void addFiles(event.target.files)}/><button type="button" className="lu-chat-attach" disabled={busy||attachments.length>=2} aria-label="Attach image" onClick={()=>fileInput.current?.click()}><Paperclip size={18}/><ImagePlus size={16}/></button><small>{draft.length.toLocaleString()} / {LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()} · Shift+Enter for a new line</small><button type="button" disabled={busy || !draft.trim()} onClick={() => void sendMessage(draft)}>{busy?<LoaderCircle className="lu-chat-spin" size={18} aria-hidden="true"/>:<ArrowUp size={18} aria-hidden="true" />}<span>{busy?'Sending…':'Send'}</span></button></div></div>
    {localAction && onLocalAction && <button type="button" className="is-secondary" onClick={() => onLocalAction(localAction)}>{labelLuAction(localAction)}</button>}
    {error && <p className="lu-text-chat-error" role="alert">{error}</p>}
    <details className="lu-text-chat-footnote"><summary>About this chat</summary><p>Saved conversations are encrypted on this device and stay with this browser or phone. Original text is encrypted locally for the comparison view; only its scrubbed version reaches Lu’s reply model. Attached images go directly to OpenAI and are not scrubbed or retained in chat history. Lu’s app tools can search ordinary writing, navigate, open entries and prepare unsaved drafts. Lu cannot open protected private writing.</p></details>
  </section>;
}
