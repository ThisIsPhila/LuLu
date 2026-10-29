import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Mic, Sparkles, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { LuOrb, type FloatingOrbPosition, type LuQuickAction } from './LuOrb';
import { LuEyes } from './LuEyes';
import { LuTextChat } from './LuTextChat';
import { LuLiveChat } from './LuLiveChat';
import { LuDock } from './LuDock';
import type { Entry } from '../domain/journal';
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
  const edge = 12;
  const minLeft = left + inset('left') + edge;
  const minTop = top + inset('top') + edge;
  return {
    minLeft,
    maxLeft: Math.max(minLeft, left + width - inset('right') - rect.width - edge),
    minTop,
    maxTop: Math.max(minTop, top + height - inset('bottom') - rect.height - edge),
    width: rect.width,
    height: rect.height,
  };
}

function clampOrbPosition(position: FloatingOrbPosition, root: HTMLElement): FloatingOrbPosition {
  const bounds = orbViewportBounds(root);
  return {
    left: Math.min(bounds.maxLeft, Math.max(bounds.minLeft, position.left)),
    top: Math.min(bounds.maxTop, Math.max(bounds.minTop, position.top)),
  };
}

function findClearOrbPosition(position: FloatingOrbPosition, root: HTMLElement): FloatingOrbPosition {
  const bounds = orbViewportBounds(root);
  const start = clampOrbPosition(position, root);
  const stepX = Math.max(48, bounds.width + 14);
  const stepY = Math.max(48, bounds.height + 14);
  const xs = [start.left];
  for (let x = start.left - stepX; x >= bounds.minLeft; x -= stepX) xs.push(x);
  for (let x = start.left + stepX; x <= bounds.maxLeft; x += stepX) xs.push(x);
  const ys = [start.top];
  for (let y = start.top - stepY; y >= bounds.minTop; y -= stepY) ys.push(y);
  for (let y = start.top + stepY; y <= bounds.maxTop; y += stepY) ys.push(y);
  const blockers = Array.from(document.querySelectorAll<HTMLElement>('body *')).flatMap(element => {
    if (element === root || root.contains(element) || element.contains(root)) return [];
    const computed = window.getComputedStyle(element);
    if (computed.position !== 'fixed' && computed.position !== 'sticky') return [];
    if (computed.display === 'none' || computed.visibility === 'hidden' || Number.parseFloat(computed.opacity) < .05) return [];
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? [rect] : [];
  });
  for (const top of ys) {
    for (const left of xs) {
      const candidate = clampOrbPosition({ left, top }, root);
      const blocked = blockers.some(rect => candidate.left < rect.right + 8 && candidate.left + bounds.width > rect.left - 8 && candidate.top < rect.bottom + 8 && candidate.top + bounds.height > rect.top - 8);
      if (!blocked) return candidate;
    }
  }
  return start;
}

type Props = {
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


export function LooLuGuide({ currentView, canLeaveCurrentView, canStartDraft, hasEntries, onNavigate, onStartDraft, onQuickAction, dockEnabled, entries, onSelectEntry, onDockNavigate, judgeAccess, ownerAiAccess, judgeVoiceSeconds, judgeVoiceDailyLimit, judgeDecisionsPerDay, judgeLuMessagesPerDay, judgeDecisionsUsedToday, judgeLuMessagesUsedToday, judgeVoiceRefillAt, onJudgeUsageRefresh, chatRequest }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<'menu' | 'chat' | 'live'>('menu');
  const [chatInitial, setChatInitial] = useState('');
  const [chatInitialRequestId, setChatInitialRequestId] = useState(0);
  const [chatActivity, setChatActivity] = useState<string | null>(null);
  const [liveMediaStream, setLiveMediaStream] = useState<MediaStream | null>(null);
  const [liveStartError, setLiveStartError] = useState('');
  const chatSequence = useRef(0);
  const liveRequestSequence = useRef(0);
  const [initialOrbPosition] = useState(readFloatingOrbPosition);
  const [floatingOrbPosition, setFloatingOrbPosition] = useState<FloatingOrbPosition | null>(initialOrbPosition);
  const floatingOrbRoot = useRef<HTMLDivElement>(null);
  const floatingOrbPositionRef = useRef<FloatingOrbPosition | null>(floatingOrbPosition);
  const manualOrbPosition = useRef(initialOrbPosition !== null);
  floatingOrbPositionRef.current = floatingOrbPosition;
  const seenChatRequest = useRef(0);
  function queueChatMessage(message: string) {
    setChatInitial(message);
    chatSequence.current += 1;
    setChatInitialRequestId(chatSequence.current);
    setPage('chat');
    setOpen(true);
  }
  useEffect(() => {
    if (!chatRequest || chatRequest.id === seenChatRequest.current) return;
    seenChatRequest.current = chatRequest.id;
    queueChatMessage(chatRequest.message);
  }, [chatRequest?.id]);
  function closeGuide() { liveRequestSequence.current++; liveMediaStream?.getTracks().forEach(track => track.stop()); setLiveMediaStream(null); setLiveStartError(''); setOpen(false); setPage('menu'); setChatInitial(''); setChatActivity(null); }
  function startLiveFromOrb() {
    const requestId = ++liveRequestSequence.current;
    liveMediaStream?.getTracks().forEach(track => track.stop());
    setLiveMediaStream(null);
    setLiveStartError('');
    setPage('live');
    setOpen(true);
    // Ask for microphone permission during the second tap itself. iOS Safari
    // can reject getUserMedia when it is deferred to a React effect.
    if (!navigator.mediaDevices?.getUserMedia) {
      setLiveStartError('This browser cannot access a microphone. Open LuLu in Safari and allow microphone access.');
      return;
    }
    void navigator.mediaDevices.getUserMedia({ audio: true }).then(media => {
      if (liveRequestSequence.current !== requestId) { media.getTracks().forEach(track => track.stop()); return; }
      setLiveMediaStream(media);
    }).catch(error => {
      if (liveRequestSequence.current !== requestId) return;
      setLiveStartError(error instanceof Error ? error.message : 'Microphone access was not granted. Allow it and try again.');
    });
  }
  function quickAction(action: LuQuickAction) { closeGuide(); onQuickAction(action); }
  function runAgentAction(action: LuAgentAction, keepGuideOpen = false) {
    if (!canLeaveCurrentView) return;
    if (action.kind === 'navigate') { if(!keepGuideOpen)closeGuide(); onNavigate(action.destination); return; }
    if (action.kind === 'open-entry') {
      const entry=entries.find(item=>item.id===action.entryId&&!item.protected);
      if (!entry) return;
      if(!keepGuideOpen)closeGuide(); void onSelectEntry(entry); return;
    }
    if (action.kind === 'create-draft') {
      if (!canStartDraft) return;
      if(!keepGuideOpen)closeGuide(); onStartDraft(action.body,action.entryKind,action.title);
    }
  }

  function moveFloatingOrb(position: FloatingOrbPosition) {
    const root = floatingOrbRoot.current;
    const next = root ? clampOrbPosition(position, root) : position;
    manualOrbPosition.current = true;
    floatingOrbPositionRef.current = next;
    setFloatingOrbPosition(next);
  }
  function saveFloatingOrbPosition() {
    const position = floatingOrbPositionRef.current;
    if (!position) return;
    try { window.localStorage.setItem(floatingOrbPositionKey, JSON.stringify(position)); } catch { /* Keep the current in-memory position. */ }
  }
  useLayoutEffect(() => {
    if (dockEnabled) return;
    const place = () => {
      const root = floatingOrbRoot.current;
      if (!root) return;
      const bounds = orbViewportBounds(root);
      const bottomRight = { left: bounds.maxLeft, top: bounds.maxTop };
      const preferred = manualOrbPosition.current && floatingOrbPositionRef.current ? floatingOrbPositionRef.current : bottomRight;
      const next = findClearOrbPosition(preferred, root);
      if (manualOrbPosition.current) {
        if (next.left !== floatingOrbPositionRef.current?.left || next.top !== floatingOrbPositionRef.current?.top) {
          floatingOrbPositionRef.current = next;
          setFloatingOrbPosition(next);
          try { window.localStorage.setItem(floatingOrbPositionKey, JSON.stringify(next)); } catch { /* Keep the current in-memory position. */ }
        }
      } else {
        const isBottomRight = Math.abs(next.left - bottomRight.left) < 1 && Math.abs(next.top - bottomRight.top) < 1;
        floatingOrbPositionRef.current = isBottomRight ? null : next;
        setFloatingOrbPosition(isBottomRight ? null : next);
      }
    };
    place();
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); window.visualViewport?.removeEventListener('resize', place); };
  }, [currentView, dockEnabled]);

  const floatingOrbStyle = !dockEnabled && floatingOrbPosition ? {
    left: `${floatingOrbPosition.left}px`, top: `${floatingOrbPosition.top}px`, right: 'auto', bottom: 'auto',
  } : undefined;
  const orb = <LuOrb open={open} disabled={false} activity={chatActivity} onOpen={() => { if (open) closeGuide(); else { setPage('menu'); setOpen(true); } }} onLive={startLiveFromOrb} onAction={quickAction}
    draggable={!dockEnabled} onDragPosition={moveFloatingOrb} onDragEnd={saveFloatingOrbPosition} />;
  return <div ref={floatingOrbRoot} style={floatingOrbStyle} className={`lulu-guide-root${dockEnabled ? ' has-lu-dock' : ''}`}>
    {dockEnabled ? <LuDock anchor={orb} onDismissGuide={closeGuide} entries={entries} onNavigate={onDockNavigate} onGuideNavigate={onNavigate} hasEntries={hasEntries} onSelect={onSelectEntry} onChat={queueChatMessage} onDraft={onStartDraft} canStartDraft={canStartDraft} onCapture={quickAction} /> : orb}
    {open && (page === 'menu' ? <section className="lulu-guide-panel" role="dialog" aria-modal="false" aria-labelledby="lulu-guide-title">
      <header className="lulu-guide-header">
        <div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">How can I help?</h2></div>
        <button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={18} /></button>
      </header>
      <div className="lulu-guide-content">
      {page==='menu' && ownerAiAccess && <div className="lulu-guide-help"><strong>Owner AI access</strong><small>Decisions and Lu text have no LuLu daily account cap. Each live voice session can run for up to five minutes and pauses after one minute without speech. OpenAI usage is billed to the connected project.</small></div>}
      {page==='menu' && judgeAccess && <div className="lulu-guide-help"><strong>Your AI access</strong><small>Decisions: {judgeDecisionsPerDay===null?`unlimited · ${judgeDecisionsUsedToday ?? 0} used today`:`${judgeDecisionsUsedToday ?? 0} / ${judgeDecisionsPerDay} today`}. Lu text: {judgeLuMessagesPerDay===null?`unlimited · ${judgeLuMessagesUsedToday ?? 0} used today`:`${judgeLuMessagesUsedToday ?? 0} / ${judgeLuMessagesPerDay} today`}. Live voice: {judgeVoiceSeconds===null?'checking allowance…':`${Math.floor(judgeVoiceSeconds/60)}m ${String(judgeVoiceSeconds%60).padStart(2, '0')}s left`}{judgeVoiceDailyLimit!==null?` of ${Math.floor(judgeVoiceDailyLimit/60)}m ${String(judgeVoiceDailyLimit%60).padStart(2, '0')}s per 24 hours`:''}. Voice pauses after one minute without speech.{judgeVoiceRefillAt?` Refill by reopening your invitation after ${new Date(judgeVoiceRefillAt).toLocaleString()}.`:' Refill through your invitation once every 24 hours.'}</small></div>}
      {page==='menu' && <p className="lulu-guide-intro">Lu guides you around LuLu and helps with your writing. Chat messages are privacy processed first — Lu never opens your protected writing. Press and hold Lu anytime for quick capture.</p>}
      </div>
      {page === 'menu' && <section className="lulu-guide-quick-section lulu-guide-pinned-actions" aria-labelledby="lulu-guide-actions"><h3 id="lulu-guide-actions">Actions</h3>
          <div className="lulu-guide-destinations lulu-guide-action-tiles">
            <button type="button" className="lulu-guide-destination" onClick={() => setPage('chat')}><span className="lulu-guide-icon"><MessageCircle size={17} /></span><span className="lulu-guide-destination-copy"><strong>Ask Lu</strong><small>Get help with LuLu</small></span></button>
            <button type="button" className="lulu-guide-destination" disabled={!canLeaveCurrentView} onClick={() => {closeGuide();onNavigate('cloud-demo');}}><span className="lulu-guide-icon"><Sparkles size={17} /></span><span className="lulu-guide-destination-copy"><strong>Cloud demo</strong><small>Review and assess a passage</small></span></button>
            <button type="button" className="lulu-guide-destination" onClick={() => quickAction('dictate')}><span className="lulu-guide-icon"><Mic size={17} /></span><span className="lulu-guide-destination-copy"><strong>Dictate</strong><small>Capture a thought</small></span></button>
          </div>
        </section>}
    </section> : createPortal(<section className="lu-conversation-page" role="dialog" aria-modal="true" aria-labelledby="lu-conversation-title">
      <header className="lu-conversation-header"><button type="button" className="lulu-guide-close" aria-label="Back to Lu menu" onClick={() => {setPage('menu');setChatActivity(null);}}><ArrowLeft size={20}/></button><div className="lu-conversation-brand"><span className="lu-conversation-character-wrap">{page === 'chat' && chatActivity && <span className="lu-conversation-activity" role="status"><span className="lu-orb-status-dot" aria-hidden="true"/>{chatActivity}</span>}<span className="lu-conversation-character"><span className="lu-orb-sphere"/><LuEyes/></span></span><h2 id="lu-conversation-title">{page === 'live' ? 'Talk to Lu' : 'Ask Lu'}</h2></div><button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={20}/></button></header>
      {page === 'live' ? <LuLiveChat autoStart initialMediaStream={liveMediaStream} startError={liveStartError} onAgentAction={action=>runAgentAction(action,true)} onVoiceAccessRefresh={onJudgeUsageRefresh} /> : <LuTextChat initialDraft={chatInitial} initialDraftRequestId={chatInitialRequestId} onInitialDraftConsumed={id => { if (id === chatInitialRequestId) { setChatInitial(''); setChatInitialRequestId(0); } }} onActivityChange={setChatActivity} onAgentAction={runAgentAction} onLocalAction={action => { if (!canLeaveCurrentView) return; if (action.kind === 'navigate') onNavigate(action.destination); else onQuickAction(action.action); closeGuide(); }} />}
    </section>, document.body))}
  </div>;
}
