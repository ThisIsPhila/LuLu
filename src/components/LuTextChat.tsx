import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { sendLuChatMessage, scrubLuMessage } from '../services/luChat';
import { LU_CHAT_MAX_INPUT_CHARACTERS } from '../services/luChatContracts';
import { labelLuAction, matchLuTextAction, validateScrubbedLuCommand, type LuTextAction } from '../services/privacy/luTextActions';
import './LuTextChat.css';
import { LuActivity } from './LuActivity';
import type { Entry } from '../domain/journal';

type Message = { role: 'you' | 'lu'; text: string };
const placeholderPattern = /(\b(?:Person|Place|Organisation|Organization|Date|Time|Contact|Email|Phone|Relationship|Detail) [A-Z]{1,2}\b)/giu;

export function LuTextChat({ onLocalAction, initialDraft = '' }: { onLocalAction?: (action: LuTextAction) => void; initialDraft?: string; entries?: Entry[] }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<'scrubbing' | 'replying' | null>(null);
  const [error, setError] = useState('');
  const [localAction, setLocalAction] = useState<LuTextAction | null>(null);
  const started = useRef(false);
  const sending = useRef(false);

  async function sendMessage(text: string) {
    if (!text.trim() || sending.current) return;
    sending.current = true; setBusy(true); setError(''); setLocalAction(null); setActivity('scrubbing');
    try {
      const result = await scrubLuMessage(text);
      setMessages(current => [...current, { role: 'you', text: result.scrubbed }]);
      setDraft('');
      const safe = validateScrubbedLuCommand(result.scrubbed);
      if (safe) setLocalAction(matchLuTextAction(safe));
      setActivity('replying');
      const reply = await sendLuChatMessage({ ticket: result.ticket, text: result.scrubbed, language: 'English' });
      setMessages(current => [...current, { role: 'lu', text: reply.reply }]);
    } catch (cause) {
      setDraft(text);
      setError(cause instanceof Error ? cause.message : 'Lu could not reply. Please try again.');
    } finally { sending.current = false; setBusy(false); setActivity(null); }
  }
  useEffect(() => { if (initialDraft && !started.current) { started.current = true; void sendMessage(initialDraft); } }, [initialDraft]);

  return <section className="lu-text-chat" aria-labelledby="lu-text-chat-title">
    <header className="lu-text-chat-heading"><span className="lu-text-chat-icon"><MessageCircle size={17} aria-hidden="true" /></span><div><h3 id="lu-text-chat-title">Chat with Lu</h3><p>Ask Lu about your journal or using the app.</p></div></header>
    <aside className="lu-text-chat-cloud-warning" role="note"><strong>Cloud demo</strong><span>Your message is sent to a cloud privacy service first. It replaces possible personal details before sending the result to Lu. Scrubbing can miss details.</span></aside>
    {messages.length > 0 && <div className="lu-text-chat-thread" aria-label="Chat messages" aria-live="polite">{messages.map((message, index) => <article className={`lu-text-chat-message is-${message.role}`} key={`${index}-${message.role}`}><small>{message.role === 'you' ? 'You · privacy processed' : 'Lu'}</small><p>{message.role === 'you' ? message.text.split(placeholderPattern).map((part, i) => i % 2 ? <mark key={i}>{part}</mark> : part) : message.text}</p></article>)}</div>}
    <label className="lu-text-chat-field-label" htmlFor="lu-chat-message">Your message</label>
    <textarea id="lu-chat-message" rows={3} maxLength={LU_CHAT_MAX_INPUT_CHARACTERS} value={draft} disabled={busy} onChange={event => {setDraft(event.target.value);setError('');}} placeholder="Message Lu…" />
    <div className="lu-text-chat-compose-footer"><small>{draft.length.toLocaleString()} / {LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()}</small><button type="button" disabled={busy || !draft.trim()} onClick={() => void sendMessage(draft)}><Send size={15} aria-hidden="true" /> Send</button></div>
    {localAction && onLocalAction && <button type="button" onClick={() => onLocalAction(localAction)}>{labelLuAction(localAction)}</button>}
    {activity && <LuActivity state={activity === 'scrubbing' ? 'working' : 'composing'} label={activity === 'scrubbing' ? 'Protecting your message…' : 'Lu is replying…'} />}
    {error && <p className="lu-text-chat-error" role="alert">{error}</p>}
    <details className="lu-text-chat-footnote"><summary>About this chat</summary><p>Highlighted labels show possible details replaced by the privacy service. Chat history is not saved or added to your journal. Lu may not see earlier turns. Replies can be wrong.</p></details>
  </section>;
}
