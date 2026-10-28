import { useState } from 'react';
import { MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { sendLuChatMessage, scrubLuMessage } from '../services/luChat';
import { LU_CHAT_MAX_INPUT_CHARACTERS, type LuScrubResult } from '../services/luChatContracts';
import { labelLuAction, matchLuTextAction, validateScrubbedLuCommand, type LuTextAction } from '../services/privacy/luTextActions';
import './LuTextChat.css';
import type { Entry } from '../domain/journal';

type Message = { role: 'you' | 'lu'; text: string };
type Stage = 'compose' | 'review';

export function LuTextChat({ onLocalAction, initialDraft = '', entries = [] }: { onLocalAction?: (action: LuTextAction) => void; initialDraft?: string; entries?: Entry[] }) {
  const [localAction, setLocalAction] = useState<LuTextAction | null>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [entryId, setEntryId] = useState('');
  const ordinaryEntries = entries.filter(entry => !entry.protected);
  const selectedEntry = ordinaryEntries.find(entry => entry.id === entryId);
  const textForScrubbing = selectedEntry ? `User message:\n${draft}\n\nSelected journal entry:\n${selectedEntry.title}\n${selectedEntry.body}` : draft;
  const [scrubConsent, setScrubConsent] = useState(false);
  const [scrubbed, setScrubbed] = useState<LuScrubResult | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [stage, setStage] = useState<Stage>('compose');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function clearReview() {
    setScrubbed(null);
    setReviewed(false);
    setStage('compose');
    setError('');
    setStatus('');
  }

  async function prepareMessage() {
    if (!draft.trim() || !scrubConsent || busy) return;
    clearReview();
    setBusy(true); setError(''); setStatus('Sending original text to LuLu’s cloud privacy scrubber…');
    try {
      const result = await scrubLuMessage(textForScrubbing);
      setScrubbed(result);
      setStage('review');
      setStatus('Review the scrubbed version. It has not been sent to Lu’s chat model.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The text could not be scrubbed. It was not sent to chat.');
      setStatus('');
    } finally { setBusy(false); }
  }

  async function sendReviewedMessage() {
    if (!scrubbed || !reviewed || busy) return;
    setBusy(true); setError(''); setStatus('Sending the reviewed scrubbed text to Lu…');
    const submitted = scrubbed.scrubbed;
    try {
      const result = await sendLuChatMessage({ ticket: scrubbed.ticket, text: submitted, language: 'English' });
      setMessages(current => [...current, { role: 'you', text: submitted }, { role: 'lu', text: result.reply }]);
      setScrubbed(null); setReviewed(false); setStage('compose'); setDraft(''); setEntryId(''); setScrubConsent(false);
      setStatus('Reply received. Follow-up messages are scrubbed and reviewed separately; Lu may not see earlier turns.');
    } catch (cause) {
      setScrubbed(null); setReviewed(false); setStage('compose'); setScrubConsent(false);
      setError(`${cause instanceof Error ? cause.message : 'Lu could not return a reply.'} Please scrub and review the message again before retrying.`);
      setStatus('');
    } finally { setBusy(false); }
  }

  return <section className="lu-text-chat" aria-labelledby="lu-text-chat-title">
    <header className="lu-text-chat-heading">
      <span className="lu-text-chat-icon"><MessageCircle size={17} aria-hidden="true" /></span>
      <div><h3 id="lu-text-chat-title">Chat with Lu</h3><p>Ask a question about using LuLu.</p></div>
    </header>

    <aside className="lu-text-chat-cloud-warning" role="note">
      <strong>Original text goes to the cloud scrubber.</strong>
      <span>Your original message goes to the cloud scrubber. Review its result before sending it to Lu; scrubbing can miss details.</span>
    </aside>


    {messages.length > 0 && <div className="lu-text-chat-thread" aria-label="Chat messages" aria-live="polite">
      {messages.map((message, index) => <article className={`lu-text-chat-message is-${message.role}`} key={`${index}-${message.role}`}>
        <small>{message.role === 'you' ? 'You · scrubbed text' : 'Lu'}</small><p>{message.text}</p>
      </article>)}
    </div>}

    {stage === 'compose' ? <>
      <label className="lu-text-chat-field-label" htmlFor="lu-chat-message">Your message</label>
      <textarea id="lu-chat-message" rows={4} maxLength={LU_CHAT_MAX_INPUT_CHARACTERS} value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); setLocalAction(null); setScrubConsent(false); setError(''); setStatus(''); }} placeholder="How do I find my saved stories?" />
      {ordinaryEntries.length > 0 && <label className="lu-text-chat-field-label">Include an ordinary entry (optional)<select value={entryId} disabled={busy} onChange={event => {setEntryId(event.target.value);setScrubConsent(false);}}><option value="">No entry</option>{ordinaryEntries.map(entry => <option key={entry.id} value={entry.id}>{entry.title || 'Untitled entry'}</option>)}</select></label>}
      {selectedEntry && <small>The selected ordinary entry and your message will go to the cloud privacy scrubber. Private entries are not available here.</small>}
      {textForScrubbing.length > LU_CHAT_MAX_INPUT_CHARACTERS && <p className="lu-text-chat-error">Your message and selected entry exceed the 4,000 character limit. Choose a shorter entry or send only your message.</p>}
      <label className="lu-text-chat-confirm"><input type="checkbox" checked={scrubConsent} disabled={busy} onChange={event => setScrubConsent(event.target.checked)} /> I understand my message and any selected entry will be sent to LuLu’s cloud privacy-scrubbing service.</label>
      <div className="lu-text-chat-compose-footer">{onLocalAction && <button type="button" className="is-secondary" disabled={busy || !draft.trim()} onClick={() => { const safe = validateScrubbedLuCommand(draft); const action = safe ? matchLuTextAction(safe) : null; setLocalAction(action); setStatus(action ? 'Found an action on this device.' : 'No matching app action found. Use a short command without personal details.'); }}>Find app action</button>}<small>{draft.length.toLocaleString()} / {LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()}</small><button type="button" disabled={busy || !draft.trim() || !scrubConsent || textForScrubbing.length > LU_CHAT_MAX_INPUT_CHARACTERS} onClick={() => void prepareMessage()}><ShieldCheck size={15} aria-hidden="true" /> Scrub and review</button></div>
    </> : scrubbed && <div className="lu-text-chat-review">
      <span className="lu-text-chat-field-label">Review text before it goes to the chat model</span>
      <div className="lu-text-chat-scrubbed" aria-label="Scrubbed message from the privacy service">{scrubbed.scrubbed}</div>
      <label className="lu-text-chat-confirm"><input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} /> I reviewed this exact scrubbed text and want Lu’s chat model to receive it.</label>
      <div className="lu-text-chat-compose-footer"><button type="button" className="is-secondary" disabled={busy} onClick={() => { setScrubbed(null); setReviewed(false); setStage('compose'); setStatus('Edit the original message, then scrub it again.'); }}>Edit original</button><button type="button" disabled={busy || !reviewed} onClick={() => void sendReviewedMessage()}><Send size={15} aria-hidden="true" /> Send reviewed text</button></div>
    </div>}

    {localAction && onLocalAction && <button type="button" onClick={() => onLocalAction(localAction)}>{labelLuAction(localAction)}</button>}
    {status && <p className="lu-text-chat-status" role="status">{status}</p>}
    {error && <p className="lu-text-chat-error" role="alert">{error}</p>}
    <details className="lu-text-chat-footnote"><summary>About this chat</summary><p>Chat history is not saved or added to your journal. Each message is reviewed separately and Lu may not see earlier turns. Replies can be wrong; this is not counselling, diagnosis, or an emergency service. Language quality may vary.</p></details>
  </section>;
}
