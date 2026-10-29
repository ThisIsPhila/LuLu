import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock3, History, MessageCircle, Mic, Plus, Sparkles, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { LuOrb, type FloatingOrbPosition, type LuQuickAction } from './LuOrb';
import { LuTextChat } from './LuTextChat';
import { LuLiveChat } from './LuLiveChat';
import { LuDock } from './LuDock';
import type { Entry } from '../domain/journal';
import { createLuConversationId, loadLuConversations, type LuSavedConversation } from '../services/luConversationHistory';
import type { LuAgentAction } from '../services/luChatContracts';
import './LooLuGuide.css';

export type LooLuDestination = 'home' | 'journal' | 'stories' | 'library' | 'reader' | 'write' | 'settings' | 'privacy-settings' | 'cloud-demo' | 'private-writing' | 'support';
const floatingOrbPositionKey = 'lulu-guide-orb-position-v1';

function readFloatingOrbPosition(): FloatingOrbPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(floatingOrbPositionKey) ?? 'null') as Partial<FloatingOrbPosition> | null;
    return stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)
      ? { left: stored.left as number, top: stored.top as number }
      : null;
  } catch { return null; }
}

function orbViewportBounds(root: HTMLElement) {
  const style = window.getComputedStyle(root);
  const inset = (side: string) => Number.parseFloat(style.getPropertyValue(`--lu-safe-${side}`)) || 0;
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const rect = root.getBoundingClientRect();
  const readerTools = document.querySelector<HTMLElement>('.circular-reader-dock');
  const readerToolsRect = readerTools?.getBoundingClientRect();
  const edge = 12;
  const minLeft = left + inset('left') + edge;
  const minTop = top + inset('top') + edge;
  const maxViewportTop = Math.max(minTop, top + height - rect.height - edge);
  const defaultMaxTop = Math.max(minTop, top + height - inset('bottom') - rect.height - edge);
  const readerAlignedTop = readerToolsRect
    ? readerToolsRect.top + (readerToolsRect.height - rect.height) / 2
    : defaultMaxTop;
  return {
    minLeft,
    maxLeft: Math.max(minLeft, left + width - inset('right') - rect.width - edge),
    minTop,
    maxTop: Math.min(maxViewportTop, Math.max(defaultMaxTop, readerAlignedTop)),
    width: rect.width,
    height: rect.height,
  };
}

function clampOrbPosition(position: FloatingOrbPosition, root: HTMLElement): FloatingOrbPosition {
  const bounds = orbViewportBounds(root);
  return { left: Math.min(bounds.maxLeft, Math.max(bounds.minLeft, position.left)), top: Math.min(bounds.maxTop, Math.max(bounds.minTop, position.top)) };
}

function findClearOrbPosition(position: FloatingOrbPosition, root: HTMLElement): FloatingOrbPosition {
  const bounds = orbViewportBounds(root);
  const start = clampOrbPosition(position, root);
  const stepX = Math.max(48, bounds.width + 14), stepY = Math.max(48, bounds.height + 14);
  const xs = [start.left], ys = [start.top];
  for (let x = start.left - stepX; x >= bounds.minLeft; x -= stepX) xs.push(x);
  for (let x = start.left + stepX; x <= bounds.maxLeft; x += stepX) xs.push(x);
  for (let y = start.top - stepY; y >= bounds.minTop; y -= stepY) ys.push(y);
  for (let y = start.top + stepY; y <= bounds.maxTop; y += stepY) ys.push(y);
  const blockers = Array.from(document.querySelectorAll<HTMLElement>('body *')).flatMap(element => {
    if (element === root || root.contains(element) || element.contains(root)) return [];
    // The reader controls are the intended alignment row for Lu's saved
    // position. Let the orb sit alongside those icons instead of jumping
    // above the whole dock after a resize or route change.
    if (element.closest('.circular-reader-dock')) return [];
    const computed = window.getComputedStyle(element);
    if (computed.position !== 'fixed' && computed.position !== 'sticky') return [];
    if (computed.display === 'none' || computed.visibility === 'hidden' || Number.parseFloat(computed.opacity) < .05) return [];
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? [rect] : [];
  });
  for (const top of ys) for (const left of xs) {
    const candidate = clampOrbPosition({ left, top }, root);
    const blocked = blockers.some(rect => candidate.left < rect.right + 8 && candidate.left + bounds.width > rect.left - 8 && candidate.top < rect.bottom + 8 && candidate.top + bounds.height > rect.top - 8);
    if (!blocked) return candidate;
  }
  return start;
}

type Props = {
  accountId: string;
  currentView: string;
  privateAvailable: boolean;
  canLeaveCurrentView: boolean;
  canStartDraft: boolean;
  captureBlockReason: string;
  hasEntries: boolean;
  onNavigate: (destination: LooLuDestination) => void;
  onStartDraft: (text: string, kind?: 'Journal' | 'Story', title?: string) => void;
  dockEnabled: boolean;
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  onDockNavigate: (view: 'home' | 'leaves' | 'stories' | 'library' | 'compose') => void;
  onQuickAction: (action: LuQuickAction) => void;
  judgeAccess: boolean;
  ownerAiAccess: boolean;
  judgeVoiceSeconds: number|null;
  judgeVoiceDailyLimit: number|null;
  judgeDecisionsPerDay: number|null;
  judgeLuMessagesPerDay: number|null;
  judgeDecisionsUsedToday: number|null;
  judgeLuMessagesUsedToday: number|null;
  judgeVoiceRefillAt: number|null;
  onJudgeUsageRefresh: () => void;
  chatRequest: { id: number; message: string } | null;
};

type GuidePage = 'menu'|'chat'|'live'|'history'|'saved';

export function LooLuGuide({ accountId, currentView, canLeaveCurrentView, canStartDraft, hasEntries, onNavigate, onStartDraft, onQuickAction, dockEnabled, entries, onSelectEntry, onDockNavigate, judgeAccess, ownerAiAccess, judgeVoiceSeconds, judgeVoiceDailyLimit, judgeDecisionsPerDay, judgeLuMessagesPerDay, judgeDecisionsUsedToday, judgeLuMessagesUsedToday, judgeVoiceRefillAt, onJudgeUsageRefresh, chatRequest }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<GuidePage>('menu');
  const [chatInitial, setChatInitial] = useState('');
  const [chatInitialRequestId, setChatInitialRequestId] = useState(0);
  const [chatActivity, setChatActivity] = useState<string|null>(null);
  const [liveActivity, setLiveActivity] = useState<string|null>(null);
  const [liveMediaStream, setLiveMediaStream] = useState<MediaStream|null>(null);
  const [liveStartError, setLiveStartError] = useState('');
  const [liveStartRequestId, setLiveStartRequestId] = useState(0);
  const [liveStopRequestId, setLiveStopRequestId] = useState(0);
  const [liveConversationId, setLiveConversationId] = useState<string|null>(null);
  const [liveMounted, setLiveMounted] = useState(false);
  const [liveActive, setLiveActive] = useState(false);
  const [liveStarting, setLiveStarting] = useState(false);
  const [textConversationId, setTextConversationId] = useState<string|null>(null);
  const [textOwnerAccountId, setTextOwnerAccountId] = useState<string|null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string|null>(null);
  const [liveOwnerAccountId, setLiveOwnerAccountId] = useState<string|null>(null);
  const [conversationArchive, setConversationArchive] = useState<{accountId:string;items:LuSavedConversation[]}>({accountId,items:[]});
  const savedConversations=conversationArchive.accountId===accountId?conversationArchive.items:[];
  const chatSequence = useRef(0);
  const liveRequestSequence = useRef(0);
  const previousAccountId = useRef(accountId);
  const [initialOrbPosition] = useState(readFloatingOrbPosition);
  const [floatingOrbPosition, setFloatingOrbPosition] = useState<FloatingOrbPosition|null>(initialOrbPosition);
  const floatingOrbRoot = useRef<HTMLDivElement>(null);
  const floatingOrbPositionRef = useRef<FloatingOrbPosition|null>(floatingOrbPosition);
  const manualOrbPosition = useRef(initialOrbPosition !== null);
  floatingOrbPositionRef.current = floatingOrbPosition;
  const seenChatRequest = useRef(0);

  useEffect(()=>{
    let current=true;
    setConversationArchive({accountId,items:[]});
    void loadLuConversations(accountId).then(items=>{if(current)setConversationArchive({accountId,items});});
    return ()=>{current=false;};
  },[accountId]);

  useEffect(()=>{
    if(previousAccountId.current===accountId)return;
    previousAccountId.current=accountId;
    closeGuide();
    setTextConversationId(null);setTextOwnerAccountId(null);setSelectedConversationId(null);
    // Unmount the previous account's live controller so its cleanup ends the
    // microphone session with the account that created it.
    setLiveMounted(false);setLiveOwnerAccountId(null);setLiveConversationId(null);setLiveActive(false);setLiveStarting(false);setLiveActivity(null);
  },[accountId]);

  function onConversationChange(conversation:LuSavedConversation){
    setConversationArchive(current=>current.accountId!==accountId?current:{accountId,items:[conversation,...current.items.filter(item=>item.id!==conversation.id)].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,30)});
  }
  function openTextChat(message=''){
    const id=createLuConversationId();
    setTextConversationId(id);setTextOwnerAccountId(accountId);setChatInitial(message);setChatInitialRequestId(0);
    if(message.trim()){chatSequence.current++;setChatInitialRequestId(chatSequence.current);}
    setPage('chat');setOpen(true);
  }
  function queueChatMessage(message:string){openTextChat(message);}
  useEffect(()=>{
    if(!chatRequest||chatRequest.id===seenChatRequest.current)return;
    seenChatRequest.current=chatRequest.id;queueChatMessage(chatRequest.message);
  },[chatRequest?.id]);

  function closeGuide(){setOpen(false);setPage('menu');setChatInitial('');setChatActivity(null);}
  function startLiveFromOrb(){
    if(liveActive||liveStarting){
      if(liveStarting&&!liveActive){
        liveRequestSequence.current++;
        liveMediaStream?.getTracks().forEach(track=>track.stop());
        setLiveMediaStream(null);setLiveStartError('Voice start cancelled. Double-tap Lu to try again.');setLiveStarting(false);
        if(liveMounted)setLiveStopRequestId(value=>value+1);else setLiveMounted(true);
      }else{
        setLiveActivity('Ending conversation…');setLiveStopRequestId(value=>value+1);
      }
      return;
    }
    const requestId=++liveRequestSequence.current;
    setLiveOwnerAccountId(accountId);
    setLiveConversationId(createLuConversationId());
    setLiveStartError('');setLiveStarting(true);setLiveMediaStream(null);
    setLiveStartRequestId(requestId);setPage('live');setOpen(true);
    if(!navigator.mediaDevices?.getUserMedia){setLiveStartError('This browser cannot access a microphone. Open LuLu in Safari and allow microphone access.');setLiveMounted(true);return;}
    void navigator.mediaDevices.getUserMedia({audio:true}).then(media=>{
      if(liveRequestSequence.current!==requestId){media.getTracks().forEach(track=>track.stop());return;}
      setLiveMediaStream(media);setLiveMounted(true);
    }).catch(error=>{
      if(liveRequestSequence.current!==requestId)return;
      setLiveStartError(error instanceof Error?error.message:'Microphone access was not granted. Allow it and try again.');setLiveMounted(true);setLiveStarting(false);
    });
  }
  function quickAction(action:LuQuickAction){closeGuide();onQuickAction(action);}
  function runAgentAction(action:LuAgentAction,keepGuideOpen=true):boolean{
    if(!canLeaveCurrentView)return false;
    if(action.kind==='navigate'){if(!keepGuideOpen)closeGuide();onNavigate(action.destination);return true;}
    if(action.kind==='open-entry'){
      const entry=entries.find(item=>item.id===action.entryId&&!item.protected);
      if(!entry)return false;if(!keepGuideOpen)closeGuide();void onSelectEntry(entry);return true;
    }
    if(action.kind==='create-draft'){
      if(!canStartDraft)return false;if(!keepGuideOpen)closeGuide();onStartDraft(action.body,action.entryKind,action.title);return true;
    }
    return false;
  }
  function moveFloatingOrb(position:FloatingOrbPosition){
    const root=floatingOrbRoot.current;const next=root?clampOrbPosition(position,root):position;
    manualOrbPosition.current=true;floatingOrbPositionRef.current=next;setFloatingOrbPosition(next);
  }
  function saveFloatingOrbPosition(){
    const position=floatingOrbPositionRef.current;if(!position)return;
    try{window.localStorage.setItem(floatingOrbPositionKey,JSON.stringify(position));}catch{/* Keep the current in-memory position. */}
  }
  useLayoutEffect(()=>{
    if(dockEnabled)return;
    const place=()=>{
      const root=floatingOrbRoot.current;if(!root)return;
      const bounds=orbViewportBounds(root),bottomRight={left:bounds.maxLeft,top:bounds.maxTop};
      const preferred=manualOrbPosition.current&&floatingOrbPositionRef.current?floatingOrbPositionRef.current:bottomRight;
      const next=findClearOrbPosition(preferred,root);
      if(manualOrbPosition.current){
        if(next.left!==floatingOrbPositionRef.current?.left||next.top!==floatingOrbPositionRef.current?.top){floatingOrbPositionRef.current=next;setFloatingOrbPosition(next);try{window.localStorage.setItem(floatingOrbPositionKey,JSON.stringify(next));}catch{/* Keep the current in-memory position. */}}
      }else{
        const isBottomRight=Math.abs(next.left-bottomRight.left)<1&&Math.abs(next.top-bottomRight.top)<1;
        floatingOrbPositionRef.current=isBottomRight?null:next;setFloatingOrbPosition(isBottomRight?null:next);
      }
    };
    place();window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);
    return()=>{window.removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);};
  },[currentView,dockEnabled]);

  const floatingOrbStyle=!dockEnabled&&floatingOrbPosition?{left:`${floatingOrbPosition.left}px`,top:`${floatingOrbPosition.top}px`,right:'auto',bottom:'auto'}:undefined;
  const orb=<LuOrb open={open} disabled={false} activity={liveActivity||chatActivity} onOpen={()=>{
    if(open)closeGuide();else if(liveActive){setPage('live');setOpen(true);}else{setPage('menu');setOpen(true);}
  }} onLive={startLiveFromOrb} onAction={quickAction} draggable={!dockEnabled} onDragPosition={moveFloatingOrb} onDragEnd={saveFloatingOrbPosition}/>;
  const selectedConversation=savedConversations.find(item=>item.id===selectedConversationId);
  const textConversation=savedConversations.find(item=>item.id===textConversationId);
  const conversationVisible=open&&page!=='menu';
  const shouldMountPortal=conversationVisible||liveMounted||Boolean(textConversationId);

  return <div ref={floatingOrbRoot} style={floatingOrbStyle} className={`lulu-guide-root${dockEnabled?' has-lu-dock':''}`}>
    {dockEnabled?<LuDock anchor={orb} onDismissGuide={closeGuide} entries={entries} onNavigate={onDockNavigate} onGuideNavigate={onNavigate} hasEntries={hasEntries} onSelect={onSelectEntry} onChat={queueChatMessage} onDraft={onStartDraft} canStartDraft={canStartDraft} onCapture={quickAction}/>:orb}
    {open&&page==='menu'&&<section className="lulu-guide-panel" role="dialog" aria-modal="false" aria-labelledby="lulu-guide-title">
      <header className="lulu-guide-header"><div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">How can I help?</h2></div><button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={18}/></button></header>
      <div className="lulu-guide-content">
        {ownerAiAccess&&<div className="lulu-guide-help"><strong>Owner AI access</strong><small>Decisions and Lu text have no LuLu daily account cap. Each live voice session can run for up to five minutes and pauses after one minute without speech. OpenAI usage is billed to the connected project.</small></div>}
        {judgeAccess&&<div className="lulu-guide-help"><strong>Your AI access</strong><small>Decisions: {judgeDecisionsPerDay===null?`unlimited · ${judgeDecisionsUsedToday??0} used today`:`${judgeDecisionsUsedToday??0} / ${judgeDecisionsPerDay} today`}. Lu text: {judgeLuMessagesPerDay===null?`unlimited · ${judgeLuMessagesUsedToday??0} used today`:`${judgeLuMessagesUsedToday??0} / ${judgeLuMessagesPerDay} today`}. Live voice: {judgeVoiceSeconds===null?'checking allowance…':`${Math.floor(judgeVoiceSeconds/60)}m ${String(judgeVoiceSeconds%60).padStart(2,'0')}s left`}{judgeVoiceDailyLimit!==null?` of ${Math.floor(judgeVoiceDailyLimit/60)}m ${String(judgeVoiceDailyLimit%60).padStart(2,'0')}s per 24 hours`:''}. Voice pauses after one minute without speech.{judgeVoiceRefillAt?` Refill by reopening your invitation after ${new Date(judgeVoiceRefillAt).toLocaleString()}.`:' Refill through your invitation once every 24 hours.'}</small></div>}
        <p className="lulu-guide-intro">Lu guides you around LuLu and helps with your writing. Text is privacy processed before Lu replies. Protected private writing is never searched.</p>
      </div>
      <section className="lulu-guide-quick-section lulu-guide-pinned-actions" aria-labelledby="lulu-guide-actions"><h3 id="lulu-guide-actions">Actions</h3><div className="lulu-guide-destinations lulu-guide-action-tiles">
        <button type="button" className="lulu-guide-destination" onClick={()=>openTextChat()}><span className="lulu-guide-icon"><MessageCircle size={17}/></span><span className="lulu-guide-destination-copy"><strong>Ask Lu</strong><small>Start a private text chat</small></span></button>
        <button type="button" className="lulu-guide-destination" disabled={!canLeaveCurrentView} onClick={()=>{closeGuide();onNavigate('cloud-demo');}}><span className="lulu-guide-icon"><Sparkles size={17}/></span><span className="lulu-guide-destination-copy"><strong>Cloud demo</strong><small>Review and assess a passage</small></span></button>
        <button type="button" className="lulu-guide-destination" onClick={()=>quickAction('dictate')}><span className="lulu-guide-icon"><Mic size={17}/></span><span className="lulu-guide-destination-copy"><strong>Dictate</strong><small>Capture a thought</small></span></button>
        <button type="button" className="lulu-guide-destination" onClick={()=>{setPage('history');setOpen(true);}}><span className="lulu-guide-icon"><History size={17}/></span><span className="lulu-guide-destination-copy"><strong>Conversation history</strong><small>Open saved text and voice chats</small></span></button>
      </div></section>
    </section>}
    {shouldMountPortal&&createPortal(<section className={`lu-conversation-page${conversationVisible?'':' is-hidden'}`} role="dialog" aria-modal={conversationVisible} aria-labelledby="lu-conversation-title" aria-hidden={!conversationVisible}>
      {conversationVisible&&<header className="lu-conversation-header">
        <button type="button" className="lulu-guide-close" aria-label={page==='saved'?'Back to conversation history':'Back to Lu menu'} onClick={()=>setPage(page==='saved'?'history':'menu')}><ArrowLeft size={20}/></button>
        <div className="lu-conversation-brand"><h2 id="lu-conversation-title">{page==='live'?'Talk to Lu':page==='history'?'Conversation history':page==='saved'?(selectedConversation?.title||'Saved conversation'):'Ask Lu'}</h2>{page==='live'&&liveActive&&<span className="lu-conversation-live-label"><i/>Live</span>}</div>
        {(page==='chat'||page==='live')&&<button type="button" className="lu-conversation-history-button" onClick={()=>setPage('history')} aria-label="Open conversation history"><History size={18}/><span>History</span></button>}
        {page==='history'&&<button type="button" className="lu-conversation-history-button" onClick={()=>openTextChat()} aria-label="Start a new text chat"><Plus size={18}/><span>New chat</span></button>}
        <button type="button" className="lulu-guide-close" aria-label="Close conversation window" onClick={closeGuide}><X size={20}/></button>
      </header>}
      {conversationVisible&&page==='history'&&<main className="lu-conversation-history-list" aria-label="Saved conversations">
        <p className="lu-history-intro">Saved on this device. Conversation text is encrypted with LuLu’s device key.</p>
        {!savedConversations.length?<div className="lu-history-empty"><History size={28}/><strong>Your conversations will appear here</strong><span>Text and voice chats are saved as you use them.</span></div>:savedConversations.map(item=><button type="button" className="lu-history-row" key={item.id} onClick={()=>{setSelectedConversationId(item.id);setPage('saved');}}><span className="lu-history-row-icon">{item.mode==='voice'?<Mic size={18}/>:<MessageCircle size={18}/>}</span><span className="lu-history-row-copy"><strong>{item.title||'Conversation with Lu'}</strong><small>{item.mode==='voice'?'Voice chat':'Text chat'} · {item.messages.length} messages</small></span><time><Clock3 size={13}/>{new Date(item.updatedAt).toLocaleString()}</time></button>)}
      </main>}
      {conversationVisible&&page==='saved'&&<main className="lu-history-transcript" aria-label="Saved conversation transcript">
        {!selectedConversation?<p>This conversation is no longer available on this device.</p>:<>
          <p className="lu-history-intro">{selectedConversation.mode==='voice'?'Voice conversation transcript':'Text conversation'} · saved on this device</p>
          {selectedConversation.messages.map((message,index)=><article className={`lu-history-message is-${message.speaker==='You'?'you':'lu'}`} key={`${message.speaker}-${index}`}>
            <small>{message.speaker}</small>
            {message.speaker==='You'&&message.originalText!==undefined?<div className="lu-history-privacy"><div><small>Your original message</small><p>{message.originalText}</p></div><div><small>Sent to Lu after privacy processing</small><p>{message.text}</p></div></div>:<p>{message.text}</p>}
            {message.imageCount? <small>{message.imageCount} image{message.imageCount===1?'':'s'} shared (image files are not saved)</small>:null}
            {message.tools?.map(event=><div className={`lu-chat-tool-event is-${event.state}`} key={event.id}><span className="lu-chat-tool-indicator" aria-hidden="true">{event.state==='failed'?'!':'✓'}</span><span><strong>{event.label}</strong>{event.detail&&<small>{event.detail}</small>}</span></div>)}
            {message.references?.map(reference=><div className="lu-text-chat-reference" key={reference.reference}><small>{reference.kind} · scrubbed excerpt</small><strong>{reference.title||'Untitled entry'}</strong><p>{reference.content}</p></div>)}
          </article>)}
        </>}
      </main>}
      {conversationVisible&&page==='live'&&!liveMounted&&<div className="lu-live-bootstrap" role="status"><span className="lu-orb-status-dot"/><span>{liveStarting?'Waiting for microphone access…':'Preparing Lu’s voice session…'}</span></div>}
      {textConversationId&&textOwnerAccountId===accountId&&<div className={`lu-conversation-child${conversationVisible&&page==='chat'?'':' lu-live-hidden-controller'}`}><LuTextChat key={`${accountId}:${textConversationId}`} accountId={accountId} conversationId={textConversationId} savedConversation={textConversation} onSessionChange={onConversationChange} initialDraft={chatInitial} initialDraftRequestId={chatInitialRequestId} onInitialDraftConsumed={id=>{if(id===chatInitialRequestId){setChatInitial('');setChatInitialRequestId(0);}}} onActivityChange={setChatActivity} onAgentAction={action=>runAgentAction(action,false)} onLocalAction={action=>{if(!canLeaveCurrentView)return;if(action.kind==='navigate')onNavigate(action.destination);else onQuickAction(action.action);closeGuide();}}/></div>}
      {liveMounted&&liveOwnerAccountId===accountId&&liveConversationId&&<div className={conversationVisible&&page==='live'?'lu-live-controller':'lu-live-hidden-controller'}><LuLiveChat key={`${accountId}:${liveConversationId}`} accountId={accountId} conversationId={liveConversationId} savedConversation={savedConversations.find(item=>item.id===liveConversationId)} onConversationChange={onConversationChange} onSessionStateChange={active=>{setLiveActive(active);if(active)setLiveStarting(false);}} onActivityChange={activity=>{setLiveActivity(activity);if(activity&&/could not|couldn't|denied|cannot access|error/iu.test(activity))setLiveStarting(false);}} autoStart initialMediaStream={liveMediaStream} startRequestId={liveStartRequestId} stopRequestId={liveStopRequestId} startError={liveStartError} onAgentAction={action=>runAgentAction(action,false)} onVoiceAccessRefresh={onJudgeUsageRefresh}/></div>}
    </section>,document.body)}
  </div>;
}
