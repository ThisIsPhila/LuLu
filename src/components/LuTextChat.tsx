import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, ExternalLink } from 'lucide-react';
import { sendLuChatMessage, scrubLuMessage } from '../services/luChat';
import { LU_CHAT_MAX_INPUT_CHARACTERS, validateLuChatInput, type LuAgentAction, type LuScrubbedEntity, type LuSurfaceReference } from '../services/luChatContracts';
import { labelLuAction, matchLuTextAction, validateScrubbedLuCommand, type LuTextAction } from '../services/privacy/luTextActions';
import './LuTextChat.css';

type Message = { role: 'you'|'lu'; text: string; originalText?: string; entities?:LuScrubbedEntity[]; references?: LuSurfaceReference[] };

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

export function LuTextChat({ onLocalAction, onAgentAction, initialDraft = '', initialDraftRequestId = 0, onInitialDraftConsumed, onActivityChange }: { onLocalAction?: (action: LuTextAction) => void; onAgentAction?: (action: LuAgentAction) => void; initialDraft?: string; initialDraftRequestId?: number; onInitialDraftConsumed?: (id: number) => void; onActivityChange?: (activity: string | null) => void }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localAction, setLocalAction] = useState<LuTextAction|null>(null);
  const consumedInitialRequest = useRef(0);
  const sending = useRef(false);

  async function sendMessage(input: string) {
    if (!input.trim() || sending.current) return;
    sending.current = true; setBusy(true); setError(''); setLocalAction(null); onActivityChange?.('Checking your message for personal details…');
    try {
      const sourceText = validateLuChatInput(input);
      const scrubbed = await scrubLuMessage(sourceText);
      // Keep the original only in this component's memory so the person can
      // compare both sides of the privacy hand-off. It is never chat history.
      setMessages(current => [...current, { role: 'you', originalText: sourceText, text: scrubbed.scrubbed, entities:scrubbed.entities }]);
      setDraft('');
      const history = messages.slice(-6).map(message => ({
        role: message.role === 'you' ? 'user' as const : 'assistant' as const,
        text: [message.text, ...(message.references ?? []).map(reference => `Retrieved ${reference.kind}: ${reference.title}. ${reference.content}`)].join('\n').slice(0,1200),
      }));
      const safeCommand = validateScrubbedLuCommand(scrubbed.scrubbed);
      const matched = safeCommand ? matchLuTextAction(safeCommand) : null;
      onActivityChange?.('Lu is replying…');
      const result = await sendLuChatMessage({ ticket: scrubbed.ticket, text: scrubbed.scrubbed, sourceText, language: 'auto', history });
      setMessages(current => [...current, { role: 'lu', text: result.reply, references: result.references }]);
      if (result.actions.length) {
        for (const action of result.actions) onAgentAction?.(action);
      } else if (matched?.kind === 'quick') {
        setLocalAction(matched);
      }
    } catch (cause) {
      setDraft(input);
      setError(cause instanceof Error ? cause.message : 'Lu could not reply. Please try again.');
    } finally { sending.current = false; setBusy(false); onActivityChange?.(null); }
  }
  useEffect(() => {
    if (!initialDraftRequestId || consumedInitialRequest.current === initialDraftRequestId || !initialDraft.trim()) return;
    consumedInitialRequest.current = initialDraftRequestId;
    void sendMessage(initialDraft);
    onInitialDraftConsumed?.(initialDraftRequestId);
  }, [initialDraftRequestId]);

  return <section className="lu-text-chat" aria-labelledby="lu-text-chat-title">
    <h3 className="lu-chat-sr-only" id="lu-text-chat-title">Conversation with Lu</h3>
    <aside className="lu-text-chat-cloud-warning" role="note"><strong>Cloud demo · GPT-6 Luna</strong><span>Your original message reaches LuLu’s cloud privacy service first. GPT-6 Luna receives the scrubbed message. If you ask Lu to search, matching ordinary Journal and Story excerpts are scrubbed before they reach the model. Protected private writing is never searched. Scrubbing can miss details.</span></aside>
    {messages.length > 0 && <div className="lu-text-chat-thread" aria-label="Chat messages" aria-live="polite">{messages.map((message, index) => <article className={`lu-text-chat-message is-${message.role}`} key={`${index}-${message.role}`}>
      {message.role === 'you' ? <div className="lu-text-chat-privacy-review">
        {message.originalText !== undefined && <div className="lu-text-chat-privacy-side"><small>Your original message · received by LuLu’s privacy service</small><p>{renderOriginalHighlights(message.originalText,message.entities??[])}</p></div>}
        <div className="lu-text-chat-privacy-side is-scrubbed"><small>After privacy processing · sent to Lu</small><p>{message.originalText!==undefined?renderScrubbedHighlights(message.originalText,message.entities??[]):message.text}</p>{message.entities?.length? <small className="lu-text-chat-entity-count">{message.entities.length} identified mention{message.entities.length===1?'':'s'} replaced</small>:<small className="lu-text-chat-entity-count">No identifying details were detected by the cloud scan.</small>}</div>
      </div> : <><small>Lu</small><p>{message.text}</p></>}
      {message.references?.map(reference => <div className="lu-text-chat-reference" key={reference.reference}><small>{reference.kind} · {reference.reference.replace('_',' ')}</small><strong>{reference.title || 'Untitled entry'}</strong><p>{reference.content}</p><button type="button" className="is-secondary" disabled={busy} onClick={() => onAgentAction?.({kind:'open-entry',entryId:reference.entryId})}><ExternalLink size={15} aria-hidden="true"/>Open entry</button></div>)}
    </article>)}</div>}
    <div className="lu-chat-composer"><label className="lu-chat-sr-only" htmlFor="lu-chat-message">Your message</label>
    <textarea id="lu-chat-message" rows={3} maxLength={LU_CHAT_MAX_INPUT_CHARACTERS} value={draft} disabled={busy} onChange={event => {setDraft(event.target.value);setError('');}} placeholder="Message Lu…" onKeyDown={event => {if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendMessage(draft);}}} />
    <div className="lu-text-chat-compose-footer"><small>{draft.length.toLocaleString()} / {LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()} · Enter to send</small><button type="button" disabled={busy || !draft.trim()} onClick={() => void sendMessage(draft)}><ArrowUp size={18} aria-hidden="true" /><span>Send</span></button></div></div>
    {localAction && onLocalAction && <button type="button" className="is-secondary" onClick={() => onLocalAction(localAction)}>{labelLuAction(localAction)}</button>}
    {error && <p className="lu-text-chat-error" role="alert">{error}</p>}
    <details className="lu-text-chat-footnote"><summary>About this chat</summary><p>Highlighted labels show details the privacy service replaced. Lu can search ordinary Journal and Story entries when you ask, but cannot access protected private writing. App actions happen only for a clear request. Drafts are opened for your review and are not saved until you save them.</p></details>
  </section>;
}
