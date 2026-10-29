import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Mic, Sparkles, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { LuOrb, type LuQuickAction } from './LuOrb';
import { LuTextChat } from './LuTextChat';
import { LuLiveChat } from './LuLiveChat';
import { LuDock } from './LuDock';
import type { Entry } from '../domain/journal';
import type { LuAgentAction } from '../services/luChatContracts';
import './LooLuGuide.css';

export type LooLuDestination = 'home' | 'journal' | 'stories' | 'library' | 'reader' | 'write' | 'settings' | 'privacy-settings' | 'cloud-demo' | 'private-writing' | 'support';
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


export function LooLuGuide({ canLeaveCurrentView, canStartDraft, hasEntries, onNavigate, onStartDraft, onQuickAction, dockEnabled, entries, onSelectEntry, onDockNavigate, judgeAccess, ownerAiAccess, judgeVoiceSeconds, judgeVoiceDailyLimit, judgeDecisionsPerDay, judgeLuMessagesPerDay, judgeDecisionsUsedToday, judgeLuMessagesUsedToday, judgeVoiceRefillAt, onJudgeUsageRefresh, chatRequest }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<'menu' | 'chat' | 'live'>('menu');
  const [chatInitial, setChatInitial] = useState('');
  const seenChatRequest = useRef(0);
  useEffect(() => {
    if (!chatRequest || chatRequest.id === seenChatRequest.current) return;
    seenChatRequest.current = chatRequest.id;
    setChatInitial(chatRequest.message);
    setPage('chat');
    setOpen(true);
  }, [chatRequest?.id]);
  function closeGuide() { setOpen(false); setPage('menu'); setChatInitial(''); }
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

  const orb = <LuOrb open={open} disabled={false} onOpen={() => { if (open) closeGuide(); else { setPage('menu'); setOpen(true); } }} onLive={() => {setPage('live');setOpen(true);}} onAction={quickAction} />;
  return <div className={`lulu-guide-root${dockEnabled ? ' has-lu-dock' : ''}`}>
    {dockEnabled ? <LuDock anchor={orb} onDismissGuide={closeGuide} entries={entries} onNavigate={onDockNavigate} onGuideNavigate={onNavigate} hasEntries={hasEntries} onSelect={onSelectEntry} onChat={text => {setChatInitial(text);setPage('chat');setOpen(true);}} onDraft={onStartDraft} canStartDraft={canStartDraft} onCapture={quickAction} /> : orb}
    {open && (page === 'menu' ? <section className="lulu-guide-panel" role="dialog" aria-modal="false" aria-labelledby="lulu-guide-title">
      <header className="lulu-guide-header">
        {page !== 'menu' ? <div className="lulu-guide-chat-heading"><button type="button" className="lulu-guide-close" aria-label="Back to Lu menu" onClick={() => setPage('menu')}><ArrowLeft size={18} /></button><div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">{page === 'live' ? 'Talk to Lu' : 'Ask Lu'}</h2></div></div>
          : <div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">How can I help?</h2></div>}
        <button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={18} /></button>
      </header>
      <div className="lulu-guide-content">
      {page==='menu' && ownerAiAccess && <div className="lulu-guide-help"><strong>Owner AI access</strong><small>Decisions and Lu text have no LuLu daily account cap. Each live voice session can run for up to five minutes and pauses after one minute without speech. OpenAI usage is billed to the connected project.</small></div>}
      {page==='menu' && judgeAccess && <div className="lulu-guide-help"><strong>Your AI access</strong><small>Decisions: {judgeDecisionsPerDay===null?`unlimited · ${judgeDecisionsUsedToday ?? 0} used today`:`${judgeDecisionsUsedToday ?? 0} / ${judgeDecisionsPerDay} today`}. Lu text: {judgeLuMessagesPerDay===null?`unlimited · ${judgeLuMessagesUsedToday ?? 0} used today`:`${judgeLuMessagesUsedToday ?? 0} / ${judgeLuMessagesPerDay} today`}. Live voice: {judgeVoiceSeconds===null?'checking allowance…':`${Math.floor(judgeVoiceSeconds/60)}m ${String(judgeVoiceSeconds%60).padStart(2,'0')}s left`}{judgeVoiceDailyLimit!==null?` of ${Math.floor(judgeVoiceDailyLimit/60)}m ${String(judgeVoiceDailyLimit%60).padStart(2,'0')}s per 24 hours`:''}. Voice pauses after one minute without speech.{judgeVoiceRefillAt?` Refill by reopening your invitation after ${new Date(judgeVoiceRefillAt).toLocaleString()}.`:' Refill through your invitation once every 24 hours.'}</small></div>}
      <div className="lulu-guide-info-list" aria-label="How Lu can help">
          <div className="lulu-guide-help"><strong>Ask Lu</strong><small>Ask a question about using LuLu. Your message is privacy processed before Lu receives it.</small></div>
          <div className="lulu-guide-help"><strong>Capture a thought</strong><small>Dictate a thought and save it to your private space on this device.</small></div>
          <div className="lulu-guide-help"><strong>Quick actions</strong><small>Press and hold Lu to open the capture wheel.</small></div>
        </div>
      </div>
      {page === 'menu' && <section className="lulu-guide-quick-section lulu-guide-pinned-actions" aria-labelledby="lulu-guide-actions"><h3 id="lulu-guide-actions">Actions</h3>
          <div className="lulu-guide-destinations lulu-guide-action-tiles">
            <button type="button" className="lulu-guide-destination" onClick={() => setPage('chat')}><span className="lulu-guide-icon"><MessageCircle size={17} /></span><span className="lulu-guide-destination-copy"><strong>Ask Lu</strong><small>Get help with LuLu</small></span></button>
            <button type="button" className="lulu-guide-destination" disabled={!canLeaveCurrentView} onClick={() => {closeGuide();onNavigate('cloud-demo');}}><span className="lulu-guide-icon"><Sparkles size={17} /></span><span className="lulu-guide-destination-copy"><strong>Cloud demo</strong><small>Review and assess a passage</small></span></button>
            <button type="button" className="lulu-guide-destination" onClick={() => quickAction('dictate')}><span className="lulu-guide-icon"><Mic size={17} /></span><span className="lulu-guide-destination-copy"><strong>Dictate</strong><small>Capture a thought</small></span></button>
          </div>
        </section>}
    </section> : createPortal(<section className="lu-conversation-page" role="dialog" aria-modal="true" aria-labelledby="lu-conversation-title">
      <header className="lu-conversation-header"><button type="button" className="lulu-guide-close" aria-label="Back to Lu menu" onClick={() => setPage('menu')}><ArrowLeft size={20}/></button><h2 id="lu-conversation-title">{page === 'live' ? 'Talk to Lu' : 'Ask Lu'}</h2><button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={20}/></button></header>
      {page === 'live' ? <LuLiveChat onAgentAction={action=>runAgentAction(action,true)} onVoiceAccessRefresh={onJudgeUsageRefresh} /> : <LuTextChat initialDraft={chatInitial} onAgentAction={runAgentAction} onLocalAction={action => { if (!canLeaveCurrentView) return; if (action.kind === 'navigate') onNavigate(action.destination); else onQuickAction(action.action); closeGuide(); }} />}
    </section>, document.body))}
  </div>;
}
