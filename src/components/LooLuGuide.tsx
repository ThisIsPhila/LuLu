import { useState } from 'react';
import { ArrowLeft, BookOpen, Compass, FileText, LibraryBig, MessageCircle, Mic, PenLine, Radio, X } from 'lucide-react';
import { LuOrb, type LuQuickAction } from './LuOrb';
import { LuTextChat } from './LuTextChat';
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
  onStartDraft: (text: string) => void;
  onQuickAction: (action: LuQuickAction) => void;
};

const destinations: { id: LooLuDestination; title: string; icon: typeof BookOpen }[] = [
  { id: 'home', title: 'Home', icon: BookOpen },
  { id: 'journal', title: 'Journal', icon: FileText },
  { id: 'stories', title: 'Stories', icon: BookOpen },
  { id: 'library', title: 'Library', icon: LibraryBig },
  { id: 'reader', title: 'Reader', icon: BookOpen },
  { id: 'write', title: 'Write', icon: PenLine },
  { id: 'settings', title: 'Settings', icon: Compass },
];

export function LooLuGuide({ currentView, canLeaveCurrentView, hasEntries, onNavigate, onQuickAction }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<'menu' | 'chat'>('menu');
  function closeGuide() { setOpen(false); setPage('menu'); }
  function quickAction(action: LuQuickAction) { closeGuide(); onQuickAction(action); }

  return <div className="lulu-guide-root">
    <LuOrb open={open} disabled={false} onOpen={() => { if (open) closeGuide(); else { setPage('menu'); setOpen(true); } }} onAction={quickAction} />
    {open && <section className={`lulu-guide-panel${page === 'chat' ? ' is-chat' : ''}`} role="dialog" aria-modal="false" aria-labelledby="lulu-guide-title">
      <header className="lulu-guide-header">
        {page === 'chat' ? <div className="lulu-guide-chat-heading"><button type="button" className="lulu-guide-close" aria-label="Back to Lu menu" onClick={() => setPage('menu')}><ArrowLeft size={18} /></button><div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">Ask Lu</h2></div></div>
          : <div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">Where would you like to go?</h2></div>}
        <button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={18} /></button>
      </header>
      {page === 'chat' ? <>
        <div className="lulu-guide-chat-modes" aria-label="Chat modes">
          <span className="is-active"><MessageCircle size={15} /> Text</span>
          <span aria-disabled="true"><Radio size={15} /> Live <small>Soon</small></span>
          <span aria-disabled="true"><Mic size={15} /> Voice note <small>Soon</small></span>
        </div>
        <LuTextChat onLocalAction={action => { if (!canLeaveCurrentView) return; if (action.kind === 'navigate') onNavigate(action.destination); else onQuickAction(action.action); closeGuide(); }} />
      </> : <>
        {!canLeaveCurrentView && <p className="lulu-guide-notice" role="status">Finish or leave this screen before navigating with Lu, so your work is not interrupted.</p>}
        <section className="lulu-guide-quick-section" aria-labelledby="lulu-guide-navigation"><h3 id="lulu-guide-navigation">Navigation</h3>
          <nav className="lulu-guide-destinations" aria-label="LuLu screens">{destinations.map(({ id, title, icon: Icon }) =>
            <button key={id} type="button" className="lulu-guide-destination" aria-current={currentView === id ? 'page' : undefined} disabled={!canLeaveCurrentView || (id === 'reader' && !hasEntries)} onClick={() => { onNavigate(id); closeGuide(); }}>
              <span className="lulu-guide-icon"><Icon size={17} aria-hidden="true" /></span><span className="lulu-guide-destination-copy"><strong>{title}</strong></span>
            </button>)}</nav>
        </section>
        <section className="lulu-guide-quick-section" aria-labelledby="lulu-guide-actions"><h3 id="lulu-guide-actions">Actions</h3>
          <div className="lulu-guide-destinations lulu-guide-action-tiles">
            <button type="button" className="lulu-guide-destination" onClick={() => setPage('chat')}><span className="lulu-guide-icon"><MessageCircle size={17} /></span><span className="lulu-guide-destination-copy"><strong>Ask Lu</strong></span></button>
            <button type="button" className="lulu-guide-destination" disabled={!canLeaveCurrentView} onClick={() => { onNavigate('write'); closeGuide(); }}><span className="lulu-guide-icon"><PenLine size={17} /></span><span className="lulu-guide-destination-copy"><strong>Start a draft</strong></span></button>
          </div>
        </section>
        <details className="lulu-guide-group"><summary>Info <span>About Lu</span></summary><p className="lulu-guide-footer">Press and hold Lu for quick actions.</p><p className="lulu-guide-footer">Live voice and voice messages are coming later.</p></details>
      </>}
    </section>}
  </div>;
}
