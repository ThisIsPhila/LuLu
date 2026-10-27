import { useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Compass, FileText, LibraryBig, PenLine, X } from 'lucide-react';
import { LuOrb, type LuQuickAction } from './LuOrb';
import { LuTextChat } from './LuTextChat';
import { labelLuAction, matchLuTextAction, validateScrubbedLuCommand, type LuTextAction } from '../services/privacy/luTextActions';
import './LooLuGuide.css';

export type LooLuDestination = 'home' | 'journal' | 'stories' | 'library' | 'reader' | 'write' | 'settings' | 'privacy-settings' | 'private-writing' | 'support';
type GuidePage = LooLuDestination | LuQuickAction | 'private-capture';

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

const destinations: { id: GuidePage; title: string; description: string; icon: typeof BookOpen }[] = [
  { id: 'home', title: 'Home', description: 'Return to recent entries and quick actions for notes and tasks.', icon: BookOpen },
  { id: 'journal', title: 'Journal', description: 'Browse your ordinary journal entries.', icon: FileText },
  { id: 'stories', title: 'Stories', description: 'Browse saved stories and their collections.', icon: BookOpen },
  { id: 'library', title: 'Library', description: 'Find entries, notes and tasks in one place.', icon: LibraryBig },
  { id: 'reader', title: 'Reader', description: 'Open the latest ordinary entry.', icon: BookOpen },
  { id: 'write', title: 'Write', description: 'Start a new journal entry or story. It stays unsaved until you choose Save.', icon: PenLine },
  { id: 'settings', title: 'Settings', description: 'Review account, accessibility and storage settings.', icon: Compass },
];

export function LooLuGuide({ currentView, privateAvailable, canLeaveCurrentView, canStartDraft, captureBlockReason, hasEntries, onNavigate, onStartDraft, onQuickAction }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<GuidePage | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [text, setText] = useState('');
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [askText, setAskText] = useState('');
  const [askStatus, setAskStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [askMessage, setAskMessage] = useState('');
  const [scrubbedAsk, setScrubbedAsk] = useState('');
  const [suggestedAction, setSuggestedAction] = useState<LuTextAction | null>(null);

  function closeGuide() {
    setAskText(''); setAskStatus('idle'); setAskMessage(''); setScrubbedAsk(''); setSuggestedAction(null);
    setOpen(false);
  }

  function resetAskResult(nextText: string) {
    setAskText(nextText);
    setAskStatus('idle'); setAskMessage(''); setScrubbedAsk(''); setSuggestedAction(null);
  }

  function reviewAskText() {
    if (!canLeaveCurrentView || !askText.trim()) return;
    setScrubbedAsk(''); setSuggestedAction(null);
    const safeCommand = validateScrubbedLuCommand(askText);
    if (!safeCommand) {
      setAskStatus('error');
      setAskMessage('Lu accepts only a short app command using screen/action names and optional generic placeholders such as Person A. Remove names and writing details first.');
      return;
    }
    setScrubbedAsk(safeCommand);
    setSuggestedAction(matchLuTextAction(safeCommand));
    setAskStatus('ready');
    setAskMessage('This restricted command stays on this device. Lu does not receive journal writing or send text to a service.');
  }

  function useSuggestedAction() {
    if (!canLeaveCurrentView || !suggestedAction || askStatus !== 'ready') return;
    if (suggestedAction.kind === 'navigate') onNavigate(suggestedAction.destination);
    else onQuickAction(suggestedAction.action);
    closeGuide();
  }

  function goToSelectedPage() {
    if (!selectedPage || pageIsUnavailable(selectedPage)) return;
    if (selectedPage === 'private-capture') onQuickAction('dictate');
    else if (['dictate', 'record', 'camera', 'upload', 'private-content'].includes(selectedPage)) onQuickAction(selectedPage as LuQuickAction);
    else onNavigate(selectedPage as LooLuDestination);
    setOpen(false);
    setSelectedPage(null);
    setCaptureOpen(false);
    setReview(false);
    setConfirmed(false);
  }

  function pageIsUnavailable(page: GuidePage): boolean {
    return !canLeaveCurrentView || (page === 'private-writing' && !privateAvailable) || (page === 'reader' && !hasEntries);
  }

  function startDraft() {
    if (!canStartDraft || !confirmed || !text.trim()) return;
    onStartDraft(text);
    closeGuide();
    setCaptureOpen(false);
    setReview(false);
    setConfirmed(false);
    setText('');
  }

  function quickAction(action: LuQuickAction) {
    closeGuide();
    setSelectedPage(null);
    onQuickAction(action);
  }

  const selected = destinations.find(page => page.id === selectedPage);
  const selectedTitle = selected?.title ?? (selectedPage === 'private-capture' ? 'Private capture' : '');
  const selectedDescription = selectedPage === 'private-capture'
    ? 'Capture a private thought on this device. You can open it later after unlocking your private space.'
    : selectedPage === 'support'
      ? 'Open the protected support hub. It contains safety notes, local helpline information and saved contact notes; Lu does not call or message anyone.'
      : selected?.id === 'private-writing' && !privateAvailable
        ? 'Private writing is available after you unlock the protected session from Lu’s private action.'
        : selected?.id === 'reader' && !hasEntries
          ? 'Save an ordinary entry first. You can then open it from Journal or Stories.'
          : selected?.id === 'write' && privateAvailable
            ? 'Open private writing. Its draft saves encrypted on this device as you type.'
            : selected?.description ?? '';

  return <div className="lulu-guide-root">
    <LuOrb open={open} disabled={false} onOpen={() => { if (open) closeGuide(); else setOpen(true); }} onAction={quickAction} />
    {open && <section className="lulu-guide-panel" role="dialog" aria-modal="false" aria-labelledby="lulu-guide-title">
      <header className="lulu-guide-header">
        <div><span className="lulu-guide-kicker">YOUR LU GUIDE</span><h2 id="lulu-guide-title">Where would you like to go?</h2></div>
        <button type="button" className="lulu-guide-close" aria-label="Close Lu" onClick={closeGuide}><X size={18} /></button>
      </header>
      {selectedPage ? <section className="lulu-guide-page-detail" aria-labelledby="lulu-guide-page-title">
        <span className="lulu-guide-kicker">SCREEN GUIDE</span>
        <h3 id="lulu-guide-page-title">{selectedTitle}</h3>
        <p>{selectedDescription}</p>
        {!canLeaveCurrentView && <p className="lulu-guide-notice" role="status">Finish or leave this screen before navigating with Lu, so your work is not interrupted.</p>}
        {pageIsUnavailable(selectedPage) && canLeaveCurrentView && <p className="lulu-guide-notice" role="status">{selectedPage === 'reader' ? 'There are no ordinary entries to open yet.' : 'Unlock the protected session first.'}</p>}
        <div className="lulu-guide-page-actions">
          <button type="button" className="lulu-guide-secondary" onClick={() => setSelectedPage(null)}><ArrowLeft size={15} aria-hidden="true" /> Choose another screen</button>
          <button type="button" className="lulu-guide-capture-button" disabled={pageIsUnavailable(selectedPage)} onClick={goToSelectedPage}>{selectedPage === 'private-capture' ? 'Start private capture' : `Go to ${selectedTitle}`}</button>
        </div>
      </section> : <>
      {!canLeaveCurrentView && <p className="lulu-guide-notice" role="status">Finish or leave this screen before navigating with Lu, so your work is not interrupted.</p>}
      <section className="lulu-guide-quick-section" aria-labelledby="lulu-guide-navigation"><h3 id="lulu-guide-navigation">Navigation</h3><nav className="lulu-guide-destinations" aria-label="LuLu screens">
        {destinations.map(({ id, title, icon: Icon }) => {
          return <button key={id} type="button" className="lulu-guide-destination" aria-current={currentView === id ? 'page' : undefined} disabled={pageIsUnavailable(id)} onClick={() => { onNavigate(id as LooLuDestination); closeGuide(); }}>
            <span className="lulu-guide-icon"><Icon size={17} aria-hidden="true" /></span>
            <span className="lulu-guide-destination-copy"><strong>{title}</strong></span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>;
        })}
      </nav></section>
      <section className="lulu-guide-quick-section" aria-labelledby="lulu-guide-actions"><h3 id="lulu-guide-actions">Actions</h3><div className="lulu-guide-action-grid"><details className="lulu-guide-subgroup"><summary>Chat with Lu</summary><LuTextChat /></details><details className="lulu-guide-subgroup"><summary>Ask Lu</summary><section className="lulu-guide-capture lulu-guide-ask" aria-labelledby="lulu-guide-ask-title">
        <div className="lulu-guide-capture-heading"><div><span className="lulu-guide-kicker">LOCAL TEXT ACTION</span><h3 id="lulu-guide-ask-title">Ask Lu to find an app action</h3></div></div>
        <p>Text-based actions are limited to short commands. Do not paste journal writing: first remove names and details yourself, using generic labels such as Person A. Lu rejects anything outside its small command vocabulary. The command stays on this device and is not sent or saved. Automatic text scrubbing is unavailable while local model processing is on hold.</p>
        <label className="lulu-guide-text-label" htmlFor="lulu-guide-ask-text">Text for Lu</label>
        <textarea id="lulu-guide-ask-text" value={askText} maxLength={240} rows={2} onChange={event => resetAskResult(event.target.value)} placeholder="Open Settings for Person A" />
        <div className="lulu-guide-actions"><button type="button" className="lulu-guide-capture-button" disabled={!canLeaveCurrentView || !askText.trim()} onClick={reviewAskText}>Review safe command</button></div>
        {askMessage && <p className={`lulu-guide-ask-status ${askStatus === 'error' ? 'is-error' : ''}`} role={askStatus === 'error' ? 'alert' : 'status'}>{askMessage}</p>}
        {askStatus === 'ready' && <>
          <span className="lulu-guide-text-label">Scrubbed text Lu used</span>
          <div className="lulu-guide-review" aria-label="Scrubbed text used by Lu">{scrubbedAsk}</div>
          {suggestedAction ? <div className="lulu-guide-actions lulu-guide-suggested-action"><span>{labelLuAction(suggestedAction)}</span><button type="button" className="lulu-guide-capture-button" onClick={useSuggestedAction}>Use this action</button></div> : <p className="lulu-guide-ask-status">No matching app action found. You can choose a screen above.</p>}
        </>}
      </section></details>
      <details className="lulu-guide-subgroup"><summary>Start a text draft</summary><section className="lulu-guide-capture" aria-labelledby="lulu-guide-capture-title">
        <div className="lulu-guide-capture-heading"><div><span className="lulu-guide-kicker">A THOUGHT TO START WITH</span><h3 id="lulu-guide-capture-title">Bring text into a new draft</h3></div></div>
        {!captureOpen ? <>
          <p>Type or paste a thought here. Lu will only place it in a new, unsaved ordinary writing draft after you review and confirm.</p>
          {captureBlockReason && <p className="lulu-guide-notice" role="status">{captureBlockReason}</p>}
          <button type="button" className="lulu-guide-capture-button" disabled={!canStartDraft} onClick={() => { setCaptureOpen(true); setReview(false); setConfirmed(false); }}>Capture text</button>
        </> : <>
          {!review ? <>
            <label className="lulu-guide-text-label" htmlFor="lulu-guide-text">Your text</label>
            <textarea id="lulu-guide-text" value={text} maxLength={12000} rows={4} onChange={event => setText(event.target.value)} placeholder="Write or paste a thought…" />
            <div className="lulu-guide-actions"><button type="button" className="lulu-guide-secondary" onClick={() => { setCaptureOpen(false); setText(''); }}>Cancel</button><button type="button" className="lulu-guide-capture-button" disabled={!canStartDraft || !text.trim()} onClick={() => setReview(true)}>Review text</button></div>
          </> : <>
            <div className="lulu-guide-review" aria-label="Text that will be added to a new unsaved draft">{text}</div>
            <p className="lulu-guide-unsaved-note">This text stays in this open app only. It is not saved by Lu. You can save or discard it in Write.</p>
            {!canStartDraft && <p className="lulu-guide-notice" role="status">{captureBlockReason || 'Finish your current draft before starting another one.'}</p>}
            <label className="lulu-guide-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I reviewed this text and want it in a new, unsaved draft.</label>
            <div className="lulu-guide-actions"><button type="button" className="lulu-guide-secondary" onClick={() => setReview(false)}>Edit text</button><button type="button" className="lulu-guide-capture-button" disabled={!canStartDraft || !confirmed} onClick={startDraft}>Continue to Write</button></div>
          </>}
        </>}
      </section></details></div></section>
      </>}
      <details className="lulu-guide-group"><summary>Info <span>About Lu</span></summary><p className="lulu-guide-footer">Press and hold Lu for quick actions.</p><p className="lulu-guide-footer">Voice AI is not connected.</p></details>
    </section>}
  </div>;
}
