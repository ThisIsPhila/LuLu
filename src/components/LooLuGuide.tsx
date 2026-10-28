import { useState } from 'react';
import { ArrowLeft, MessageCircle, Mic, Radio, X } from 'lucide-react';
import { LuOrb, type LuQuickAction } from './LuOrb';
import { LuTextChat } from './LuTextChat';
import { LuLiveChat } from './LuLiveChat';
import { LuDock } from './LuDock';
import type { Entry } from '../domain/journal';
import './LooLuGuide.css';

export type LooLuDestination = 'home' | 'journal' | 'stories' | 'library' | 'reader' | 'write' | 'settings' | 'privacy-settings' | 'private-writing' | 'support';
type Props = {
  currentView: string;
  privateAvailable: boolean;
  canLeaveCurrentView: boolean;
  canStartDraft: boolean;
  captureBlockReason: string;
  hasEntries: boolean;
  onNavigate: (destination: LooLuDestination) => void;
  onStartDraft: (text: string, kind?: 'Journal' | 'Story') => void;
  dockEnabled: boolean;
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  onDockNavigate: (view: 'home' | 'leaves' | 'stories' | 'library' | 'compose') => void;
  onQuickAction: (action: LuQuickAction) => void;
};


export function LooLuGuide({ canLeaveCurrentView, canStartDraft, hasEntries, onNavigate, onStartDraft, onQuickAction, dockEnabled, entries, onSelectEntry, onDockNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<'menu' | 'chat' | 'live'>('menu');
  const [chatInitial, setChatInitial] = useState('');
  function closeGuide() { setOpen(false); setPage('menu'); setChatInitial(''); }
  function quickAction(action: LuQuickAction) { closeGuide(); onQuickAction(action); }

  const orb = <LuOrb open={open} disabled={false} onOpen={() => { if (open) closeGuide(); else { setPage('menu'); setOpen(true); } }} onLive={() => {setPage('live');setOpen(true);}} onAction={quickAction} />;
  return <div className={`lulu-guide-root${dockEnabled ? ' has-lu-dock' : ''}`}>
    {dockEnabled ? <LuDock anchor={orb} onDismissGuide={closeGuide} entries={entries} onNavigate={onDockNavigate} onGuideNavigate={onNavigate} hasEntries={hasEntries} onSelect={onSelectEntry} onChat={text => {setChatInitial(text);setPage('chat');setOpen(true);}} onDraft={onStartDraft} canStartDraft={canStartDraft} onCapture={quickAction} /> : orb}
    {open && <section className={`lulu-guide-panel${page !== 'menu' ? ' is-chat' : ''}`} role="dialog" aria-modal="false" aria-labelledby="lulu-guide-title">
      <header className="lulu-guide-header">
        {page !== 'menu' ? <div className="lulu-guide-chat-heading"><button type="button" className="lulu-guide-close" aria-label="Back to Lu menu" onClick={() => setPage('menu')}><ArrowLeft size={18} /></button><div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">{page === 'live' ? 'Talk to Lu' : 'Ask Lu'}</h2></div></div>
          : <div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">How can I help?</h2></div>}
        <button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={18} /></button>
      </header>
      <div className="lulu-guide-content">
      {page === 'live' ? <LuLiveChat /> : page === 'chat' ? <>
        <div className="lulu-guide-chat-modes" aria-label="Chat modes">
          <span className="is-active"><MessageCircle size={15} /> Text</span>
          <button type="button" onClick={() => setPage('live')}><Radio size={15} /> Live</button>
          <span aria-disabled="true"><Mic size={15} /> Voice note <small>Soon</small></span>
        </div>
        <LuTextChat entries={entries} initialDraft={chatInitial} onLocalAction={action => { if (!canLeaveCurrentView) return; if (action.kind === 'navigate') onNavigate(action.destination); else onQuickAction(action.action); closeGuide(); }} />
      </> : <>
        <div className="lulu-guide-info-list" aria-label="How Lu can help">
          <div className="lulu-guide-help"><strong>Ask Lu</strong><small>Ask a question about using LuLu. Your message is privacy processed before Lu receives it.</small></div>
          <div className="lulu-guide-help"><strong>Capture a thought</strong><small>Dictate a thought and save it to your private space on this device.</small></div>
          <div className="lulu-guide-help"><strong>Quick actions</strong><small>Press and hold Lu to open the capture wheel.</small></div>
        </div>
      </>}
      </div>
      {page === 'menu' && <section className="lulu-guide-quick-section lulu-guide-pinned-actions" aria-labelledby="lulu-guide-actions"><h3 id="lulu-guide-actions">Actions</h3>
          <div className="lulu-guide-destinations lulu-guide-action-tiles">
            <button type="button" className="lulu-guide-destination" onClick={() => setPage('chat')}><span className="lulu-guide-icon"><MessageCircle size={17} /></span><span className="lulu-guide-destination-copy"><strong>Ask Lu</strong><small>Get help with LuLu</small></span></button>
            <button type="button" className="lulu-guide-destination" onClick={() => quickAction('dictate')}><span className="lulu-guide-icon"><Mic size={17} /></span><span className="lulu-guide-destination-copy"><strong>Dictate</strong><small>Capture a thought</small></span></button>
          </div>
        </section>}
    </section>}
  </div>;
}
