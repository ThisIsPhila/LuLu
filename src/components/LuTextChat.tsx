import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ExternalLink } from 'lucide-react';
import { sendLuChatMessage, scrubLuMessage } from '../services/luChat';
import { LU_CHAT_LANGUAGES, LU_CHAT_MAX_INPUT_CHARACTERS, validateLuChatInput, type LuAgentAction, type LuChatLanguage, type LuSurfaceReference } from '../services/luChatContracts';
import { labelLuAction, matchLuTextAction, validateScrubbedLuCommand, type LuTextAction } from '../services/privacy/luTextActions';
import './LuTextChat.css';
import { LuActivity } from './LuActivity';

type Message = { role: 'you'|'lu'; text: string; references?: LuSurfaceReference[] };
const placeholderPattern = /(\b(?:Person|Place|Organisation|Organization|Date|Time|Contact|Email|Phone|Relationship|Detail) [A-Z]{1,2}\b)/giu;

export function LuTextChat({ onLocalAction, onAgentAction, initialDraft = '' }: { onLocalAction?: (action: LuTextAction) => void; onAgentAction?: (action: LuAgentAction) => void; initialDraft?: string }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<LuChatLanguage>('English');
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<'scrubbing'|'replying'|null>(null);
  const [error, setError] = useState('');
  const [localAction, setLocalAction] = useState<LuTextAction|null>(null);
  const started = useRef(false);
  const sending = useRef(false);

  async function sendMessage(input: string) {
    if (!input.trim() || sending.current) return;
    sending.current = true; setBusy(true); setError(''); setLocalAction(null); setActivity('scrubbing');
    try {
      const sourceText = validateLuChatInput(input);
      const scrubbed = await scrubLuMessage(sourceText);
      setMessages(current => [...current, { role: 'you', text: scrubbed.scrubbed }]);
      setDraft('');
      const history = messages.slice(-6).map(message => ({
        role: message.role === 'you' ? 'user' as const : 'assistant' as const,
        text: [message.text, ...(message.references ?? []).map(reference => `Retrieved ${reference.kind}: ${reference.title}. ${reference.content}`)].join('\n').slice(0,1200),
      }));
      const safeCommand = validateScrubbedLuCommand(scrubbed.scrubbed);
      const matched = safeCommand ? matchLuTextAction(safeCommand) : null;
      setActivity('replying');
      const result = await sendLuChatMessage({ ticket: scrubbed.ticket, text: scrubbed.scrubbed, sourceText, language, history });
      setMessages(current => [...current, { role: 'lu', text: result.reply, references: result.references }]);
      if (result.actions.length) {
        for (const action of result.actions) onAgentAction?.(action);
      } else if (matched?.kind === 'quick') {
        setLocalAction(matched);
      }
    } catch (cause) {
      setDraft(input);
      setError(cause instanceof Error ? cause.message : 'Lu could not reply. Please try again.');
    } finally { sending.current = false; setBusy(false); setActivity(null); }
  }
  useEffect(() => { if (initialDraft && !started.current) { started.current = true; void sendMessage(initialDraft); } }, [initialDraft]);

  return <section className="lu-text-chat" aria-labelledby="lu-text-chat-title">
    <h3 className="lu-chat-sr-only" id="lu-text-chat-title">Conversation with Lu</h3>
    <aside className="lu-text-chat-cloud-warning" role="note"><strong>Cloud demo · GPT-6 Luna</strong><span>Your original message reaches LuLu’s cloud privacy service first. GPT-6 Luna receives the scrubbed message. If you ask Lu to search, matching ordinary Journal and Story excerpts are scrubbed before they reach the model. Protected private writing is never searched. Scrubbing can miss details.</span></aside>
    <label className="lu-text-chat-field-label" htmlFor="lu-chat-language">Reply language</label>
    <select id="lu-chat-language" value={language} disabled={busy} onChange={event => setLanguage(event.target.value as LuChatLanguage)}>{LU_CHAT_LANGUAGES.map(item => <option key={item} value={item}>{item === 'isiZulu' ? 'isiZulu' : item}</option>)}</select>
    {messages.length > 0 && <div className="lu-text-chat-thread" aria-label="Chat messages" aria-live="polite">{messages.map((message, index) => <article className={`lu-text-chat-message is-${message.role}`} key={`${index}-${message.role}`}><small>{message.role === 'you' ? 'You · privacy processed' : 'Lu'}</small><p>{message.role === 'you' ? message.text.split(placeholderPattern).map((part, i) => i % 2 ? <mark key={i}>{part}</mark> : part) : message.text}</p>
      {message.references?.map(reference => <div className="lu-text-chat-reference" key={reference.reference}><small>{reference.kind} · {reference.reference.replace('_',' ')}</small><strong>{reference.title || 'Untitled entry'}</strong><p>{reference.content}</p><button type="button" className="is-secondary" disabled={busy} onClick={() => onAgentAction?.({kind:'open-entry',entryId:reference.entryId})}><ExternalLink size={15} aria-hidden="true"/>Open entry</button></div>)}
    </article>)}</div>}
    <div className="lu-chat-composer"><label className="lu-chat-sr-only" htmlFor="lu-chat-message">Your message</label>
    <textarea id="lu-chat-message" rows={3} maxLength={LU_CHAT_MAX_INPUT_CHARACTERS} value={draft} disabled={busy} onChange={event => {setDraft(event.target.value);setError('');}} placeholder="Message Lu…" onKeyDown={event => {if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendMessage(draft);}}} />
    <div className="lu-text-chat-compose-footer"><small>{draft.length.toLocaleString()} / {LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()} · Enter to send</small><button type="button" disabled={busy || !draft.trim()} onClick={() => void sendMessage(draft)}><ArrowUp size={18} aria-hidden="true" /><span>Send</span></button></div></div>
    {localAction && onLocalAction && <button type="button" className="is-secondary" onClick={() => onLocalAction(localAction)}>{labelLuAction(localAction)}</button>}
    {activity && <LuActivity state={activity === 'scrubbing' ? 'working' : 'composing'} label={activity === 'scrubbing' ? 'Protecting your message…' : 'Lu is replying…'} />}
    {error && <p className="lu-text-chat-error" role="alert">{error}</p>}
    <details className="lu-text-chat-footnote"><summary>About this chat</summary><p>Highlighted labels show details the privacy service replaced. Lu can search ordinary Journal and Story entries when you ask, but cannot access protected private writing. App actions happen only for a clear request. Drafts are opened for your review and are not saved until you save them.</p></details>
  </section>;
}
