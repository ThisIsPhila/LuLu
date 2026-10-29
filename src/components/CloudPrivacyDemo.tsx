import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronDown, CircleAlert, Fingerprint, LoaderCircle, LockKeyhole, MessageCircle, RotateCcw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { Entry } from '../domain/journal';
import { scrubLuMessage } from '../services/luChat';
import type { LuScrubbedEntity } from '../services/luChatContracts';
import { assessReviewedPatterns, getCloudProcessingCapability, type CloudProcessingCapability } from '../services/privacy/cloudProcessingClient';
import type { PatternAssessment, PatternBand } from '../services/privacy/patternIntelligenceContracts';
import { MAX_CLOUD_REVIEW_ENTRIES, prepareCloudEntrySelection } from '../services/privacy/cloudEntrySelection';
import { createSessionEntityLibrary, type EntityLibrary, type EntityIdentity } from '../services/privacy/entityLibrary';
import type { LocalVaultSession } from '../services/vault/localVault';

const EXAMPLE = 'On 14 April 2026, Nomsa Dlamini met Sipho in Cape Town after work. She received an email at nomsa@example.invalid and was worried about what might happen the next morning.';
const TYPE_FOR_LABEL: Record<LuScrubbedEntity['label'], string> = {
  Person: 'Person', Place: 'Location', Organisation: 'Organization', Date: 'Date', Time: 'Time',
  Email: 'Email', Phone: 'Phone Number', Relationship: 'Relationship', Identifier: 'Topic', Detail: 'Topic',
};
const bandLabel: Record<PatternBand, string> = {
  strong_indication: 'Strong text signal', possible_indication: 'Possible text signal', uncertain: 'Unclear signal',
  not_indicated: 'Not indicated in this passage', unknown: 'Could not assess',
};

type Props = {
  onBack: () => void;
  showBackButton?: boolean;
  entries?: Entry[];
  accountActive: () => boolean;
  privateSession?: LocalVaultSession;
  onUnlockPrivate?: () => Promise<void>;
  onOpenSupport: () => void;
  onAskLu: (message: string) => void;
};

function HighlightedSource({ text, entities }: { text: string; entities: LuScrubbedEntity[] }): ReactNode {
  if (!entities.length) return text;
  const pieces: ReactNode[] = [];
  let cursor = 0;
  for (const [index, entity] of [...entities].sort((a, b) => a.start - b.start).entries()) {
    if (entity.start < cursor || entity.end > text.length) continue;
    if (entity.start > cursor) pieces.push(text.slice(cursor, entity.start));
    pieces.push(<mark className={`cloud-pii-mark cloud-pii-${entity.label.toLocaleLowerCase()}`} key={`${entity.start}-${index}`} title={`${entity.label} · replaced with ${entity.replacement}`}>{text.slice(entity.start, entity.end)}<span>{entity.label}</span></mark>);
    cursor = entity.end;
  }
  pieces.push(text.slice(cursor));
  return pieces;
}

function transformedText(text: string, entities: LuScrubbedEntity[]) {
  let cursor = 0;
  let output = '';
  for (const entity of [...entities].sort((a, b) => a.start - b.start)) {
    if (entity.start < cursor || entity.end > text.length) continue;
    output += text.slice(cursor, entity.start) + entity.replacement;
    cursor = entity.end;
  }
  return output + text.slice(cursor);
}

function newRevision() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CloudPrivacyDemo({ onBack, showBackButton = true, entries = [], accountActive, privateSession, onUnlockPrivate, onOpenSupport, onAskLu }: Props) {
  const [sourceText, setSourceText] = useState(EXAMPLE);
  const [sourceEntryCount, setSourceEntryCount] = useState(0);
  const [entryQuery, setEntryQuery] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [entities, setEntities] = useState<LuScrubbedEntity[]>([]);
  const [scrubbedText, setScrubbedText] = useState('');
  const [manualReview, setManualReview] = useState<string | null>(null);
  const [scrubConsent, setScrubConsent] = useState(false);
  const [reviewConsent, setReviewConsent] = useState(false);
  const [purpose, setPurpose] = useState('Understand patterns described in this passage');
  const [capability, setCapability] = useState<CloudProcessingCapability | null>(null);
  const [capabilityMessage, setCapabilityMessage] = useState('Checking signed-in account and cloud service…');
  const [status, setStatus] = useState<'idle' | 'scrubbing' | 'assessing' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [assessment, setAssessment] = useState<PatternAssessment | null>(null);
  const [libraryEntities, setLibraryEntities] = useState<EntityIdentity[]>([]);
  const [libraryMessage, setLibraryMessage] = useState('');
  const [libraryReady, setLibraryReady] = useState(false);
  const library = useRef<EntityLibrary | null>(null);
  const requestGeneration = useRef(0);
  const abort = useRef<AbortController | null>(null);

  const hasAccount = accountActive();
  const ordinaryEntries = useMemo(() => entries.filter(entry => !entry.protected), [entries]);
  const matchingEntries = useMemo(() => {
    const query = entryQuery.trim().toLocaleLowerCase();
    return ordinaryEntries.filter(entry => !query || `${entry.title} ${entry.kind}`.toLocaleLowerCase().includes(query));
  }, [ordinaryEntries, entryQuery]);
  const privateUnlocked = privateSession?.isUnlocked() === true;
  const outputText = useMemo(() => manualReview ?? (scrubbedText ? transformedText(sourceText, entities) : ''), [sourceText, scrubbedText, entities, manualReview]);
  const highlighted = useMemo(() => <HighlightedSource text={sourceText} entities={entities} />, [sourceText, entities]);

  useEffect(() => {
    const controller = new AbortController();
    setCapabilityMessage('Checking signed-in account and cloud service…');
    void getCloudProcessingCapability(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setCapability(value);
      setCapabilityMessage(value.enabled
        ? value.provider === 'openai_decisions' ? 'Connected · PII scrub and Decisions are available.' : 'Connected · PII scrub is available; Decisions is not selected.'
        : 'Cloud AI is not configured for this account or service.');
    }).catch(error => {
      if (!controller.signal.aborted) setCapabilityMessage(error instanceof Error ? error.message : 'Could not check cloud access.');
    });
    return () => controller.abort();
  }, [hasAccount]);

  useEffect(() => {
    if (!privateUnlocked || !privateSession) {
      library.current?.dispose();
      library.current = null;
      setLibraryReady(false);
      setLibraryEntities([]);
      setLibraryMessage('Unlock to use or save aliases in your encrypted identity library on this device.');
      return;
    }
    const current = createSessionEntityLibrary(privateSession);
    library.current = current;
    let active = true;
    setLibraryReady(false);
    setLibraryMessage('Opening your encrypted identity library on this device…');
    void current.load().then(snapshot => {
      if (!active) return;
      setLibraryEntities(snapshot.entities);
      setLibraryReady(true);
      setLibraryMessage(snapshot.entities.length
        ? `${snapshot.entities.length} saved alias${snapshot.entities.length === 1 ? '' : 'es'} available on this device.`
        : 'Your private identity library is empty. You can save aliases as you review detections.');
      const matches = entities.map(entity => {
        const source = sourceText.slice(entity.start, entity.end);
        const type = TYPE_FOR_LABEL[entity.label];
        return { entity, source, type };
      });
      void Promise.all(matches.map(async match => ({...match, saved: await current.match(match.source, match.type)}))).then(found => {
        if (!active) return;
        setEntities(existing => existing.map(entity => {
          const match = found.find(item => item.entity.start === entity.start && item.entity.end === entity.end);
          return match?.saved ? {...entity, replacement: match.saved.alias} : entity;
        }));
      }).catch(() => {});
    }).catch(error => {
      if (!active) return;
      setLibraryMessage(error instanceof Error ? error.message : 'Could not open the encrypted identity library.');
    });
    return () => { active = false; current.dispose(); if (library.current === current) library.current = null; };
  }, [privateSession?.ownerId, privateSession?.generation(), privateUnlocked]);

  function resetResults() {
    requestGeneration.current++;
    abort.current?.abort(); abort.current = null;
    setEntities([]); setScrubbedText(''); setAssessment(null); setMessage('');
    setManualReview(null); setScrubConsent(false);
    setReviewConsent(false); setStatus('idle');
  }

  function updateSource(value: string) {
    setSourceText(value);
    setSourceEntryCount(0);
    setSelectedEntryIds([]);
    resetResults();
  }

  function toggleEntry(entryId: string, checked: boolean) {
    setSelectedEntryIds(current => {
      if (!checked) return current.filter(id => id !== entryId);
      if (current.includes(entryId) || current.length >= MAX_CLOUD_REVIEW_ENTRIES) return current;
      return [...current, entryId];
    });
  }

  function loadSelectedEntries() {
    const selected = ordinaryEntries.filter(entry => selectedEntryIds.includes(entry.id));
    const prepared = prepareCloudEntrySelection(selected);
    if (!prepared.ok) { setStatus('error'); setMessage(prepared.message); return; }
    setSourceText(prepared.text);
    setSourceEntryCount(prepared.entryCount);
    setSelectedEntryIds([]);
    resetResults();
    setMessage(`${prepared.entryCount} ordinary ${prepared.entryCount === 1 ? 'entry is' : 'entries are'} loaded on this device. Nothing is sent until you run detection and confirm the cloud disclosure.`);
  }

  async function runScrub() {
    if (!scrubConsent) { setMessage('Confirm the cloud disclosure before sending text to the privacy service.'); return; }
    if (!capability?.enabled) { setMessage('Cloud privacy processing is unavailable for this account.'); return; }
    const id = ++requestGeneration.current;
    setStatus('scrubbing'); setMessage('Sending the original to LuLu’s cloud privacy step for detection…');
    setAssessment(null); setReviewConsent(false);
    try {
      const result = await scrubLuMessage(sourceText);
      if (id !== requestGeneration.current) return;
      setEntities(result.entities);
      setScrubbedText(result.scrubbed);
      setManualReview(null);
      setReviewConsent(false);
      setStatus('idle');
      setMessage(result.entities.length
        ? `${result.entities.length} identifying mention${result.entities.length === 1 ? '' : 's'} detected. Review each highlight and replacement before continuing.`
        : 'No identifying detail was detected. Review the full passage yourself; detection can miss details.');
    } catch (error) {
      if (id !== requestGeneration.current) return;
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Cloud privacy processing failed.');
    }
  }

  function updateAlias(target: LuScrubbedEntity, replacement: string) {
    setEntities(current => current.map(entity => {
      const sameMention = entity.label === target.label && sourceText.slice(entity.start, entity.end).normalize('NFKC').toLocaleLowerCase('und')
        === sourceText.slice(target.start, target.end).normalize('NFKC').toLocaleLowerCase('und');
      return sameMention ? {...entity, replacement} : entity;
    }));
    setManualReview(null);
    setAssessment(null); setReviewConsent(false); setMessage('Replacement changed. Review and approve the updated text before assessing it.');
  }

  async function saveAlias(entity: LuScrubbedEntity) {
    const activeLibrary = library.current;
    if (!activeLibrary || !privateSession?.isUnlocked()) { setLibraryMessage('Unlock private access before saving an alias.'); return; }
    try {
      await activeLibrary.setAlias({text: sourceText.slice(entity.start, entity.end), type: TYPE_FOR_LABEL[entity.label], alias: entity.replacement});
      const snapshot = await activeLibrary.load();
      setLibraryEntities(snapshot.entities);
      setLibraryMessage('Alias saved in your encrypted identity library on this device.');
    } catch (error) { setLibraryMessage(error instanceof Error ? error.message : 'Alias could not be saved.'); }
  }

  async function runAssessment() {
    if (!accountActive()) { setMessage('Your sign-in session ended. Sign in again before assessing this text.'); return; }
    if (!scrubbedText || !reviewConsent) { setMessage('Review the transformed text and confirm before requesting an assessment.'); return; }
    if (!purpose.trim()) { setMessage('Add a short purpose for this assessment.'); return; }
    if (!capability?.enabled || capability.provider !== 'openai_decisions') { setMessage('OpenAI Decisions is not available for this account or service.'); return; }
    const id = ++requestGeneration.current;
    const controller = new AbortController(); abort.current = controller;
    setStatus('assessing'); setMessage('Sending only the exact reviewed transformed text to Decisions…'); setAssessment(null);
    try {
      const result = await assessReviewedPatterns({
        text: outputText,
        revision: newRevision(),
        purpose: purpose.trim(),
        isAccountSessionActive: accountActive,
        signal: controller.signal,
      });
      if (id !== requestGeneration.current) return;
      setAssessment(result); setStatus('idle'); setMessage('Assessment complete. These are signals in the wording, not findings about whether an event happened.');
    } catch (error) {
      if (id !== requestGeneration.current) return;
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Pattern assessment failed.');
    } finally { if (abort.current === controller) abort.current = null; }
  }

  const sortedAssessment = assessment?.patterns.filter(item => item.probability !== null && item.probability >= 0.4)
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0)) ?? [];
  const urgent = assessment?.immediateSafety.probability !== null && assessment?.immediateSafety.probability !== undefined && assessment.immediateSafety.probability >= .65;

  return <main className="cloud-privacy-page">
    <header className="cloud-privacy-header">
      {showBackButton && <button type="button" className="privacy-back" onClick={onBack}><ArrowLeft size={18}/> Back</button>}
      <span className="privacy-settings-kicker">CLOUD DEMO · LIVE SERVICES</span>
      <h1>See what the models do</h1>
      <p>Follow your own writing through LuLu’s privacy step, review the exact replacements, then send only that reviewed version to look for described patterns across up to three entries.</p>
      <div className={`cloud-connection ${capability?.enabled ? 'is-ready' : ''}`} role="status"><span className="live-dot"/>{capabilityMessage}</div>
    </header>

    <section className="cloud-pipeline" aria-label="Cloud processing steps">
      <div><span className="cloud-pipeline-number">1</span><strong>LuLu privacy service</strong><small>Original text → PII candidates and highlighted replacements</small></div>
      <span className="cloud-pipeline-arrow" aria-hidden="true">→</span>
      <div><span className="cloud-pipeline-number">2</span><strong>Your review</strong><small>Choose the exact pseudonymised text to continue</small></div>
      <span className="cloud-pipeline-arrow" aria-hidden="true">→</span>
      <div><span className="cloud-pipeline-number">3</span><strong>OpenAI Decisions · gpt-6-luna</strong><small>Scores observable text patterns; does not determine truth</small></div>
    </section>

    <div className="cloud-privacy-disclosure"><ShieldCheck size={18}/><p><strong>Cloud demo.</strong> The original is sent over the internet to LuLu’s cloud privacy service, which uses OpenAI Responses · gpt-6-luna to find candidate details. LuLu stores review hashes, not the original passage. Only the text you review and approve is sent to OpenAI Decisions. Your API key stays on the LuLu server.</p></div>

    <section className="cloud-privacy-workspace" aria-label="Review and assess text">
      <article className="cloud-privacy-pane">
        <div className="cloud-privacy-pane-heading"><div><span className="privacy-pane-eyebrow">STEP 1 · INPUT</span><h2>Your original text</h2></div><span className="privacy-word-count">{sourceText.length.toLocaleString()} / 4,000</span></div>
        {ordinaryEntries.length > 0 && <fieldset className="cloud-entry-picker">
          <legend><BookOpen size={15} aria-hidden="true"/> Use your Journal or Stories</legend>
          <p>Choose up to {MAX_CLOUD_REVIEW_ENTRIES} ordinary entries to review together. They are ordered from older to newer; exact saved dates stay on this device.</p>
          <label className="cloud-entry-search"><Search size={15} aria-hidden="true"/><span className="cloud-sr-only">Search ordinary entries</span><input type="search" value={entryQuery} onChange={event => setEntryQuery(event.target.value)} placeholder="Find an entry by title" /></label>
          <div className="cloud-entry-options" aria-label="Ordinary entries">
            {matchingEntries.length ? matchingEntries.map(entry => <label className="cloud-entry-option" key={entry.id}>
              <input type="checkbox" checked={selectedEntryIds.includes(entry.id)} disabled={!selectedEntryIds.includes(entry.id) && selectedEntryIds.length >= MAX_CLOUD_REVIEW_ENTRIES} onChange={event => toggleEntry(entry.id, event.target.checked)} />
              <span><strong>{entry.title || 'Untitled entry'}</strong><small>{entry.kind} · {new Date(entry.date).toLocaleDateString()}</small></span>
            </label>) : <p className="cloud-entry-empty">No ordinary entry matches that title.</p>}
          </div>
          <button type="button" className="privacy-button secondary cloud-entry-load" disabled={!selectedEntryIds.length} onClick={loadSelectedEntries}>Use {selectedEntryIds.length || ''} selected {selectedEntryIds.length === 1 ? 'entry' : 'entries'}</button>
          <small className="cloud-entry-note">Selecting entries only fills the editor. Protected private writing is excluded; the original is sent only after you check the cloud disclosure and run detection.</small>
        </fieldset>}
        {sourceEntryCount > 0 && <p className="cloud-entry-load-status" role="status">{sourceEntryCount} ordinary {sourceEntryCount === 1 ? 'entry is' : 'entries are'} loaded in older-to-newer order. Exact saved dates were not added to the text.</p>}
        <textarea aria-label="Original text" value={sourceText} maxLength={4000} onChange={event => updateSource(event.target.value)} placeholder="Paste a passage or use the synthetic example…" />
        <label className="cloud-consent"><input type="checkbox" checked={scrubConsent} onChange={event => setScrubConsent(event.target.checked)}/><span>I understand this original text will be sent to LuLu’s cloud privacy service for PII detection. It may contain personal details.</span></label>
        <button type="button" className="privacy-button primary cloud-run" disabled={!capability?.enabled || status === 'scrubbing' || !sourceText.trim()} onClick={() => void runScrub()}>
          {status === 'scrubbing' ? <LoaderCircle size={17} className="privacy-spin"/> : <Fingerprint size={17}/>} {status === 'scrubbing' ? 'Finding details…' : entities.length ? 'Run detection again' : 'Find and highlight details'}
        </button>
      </article>

      <article className="cloud-privacy-pane">
        <div className="cloud-privacy-pane-heading"><div><span className="privacy-pane-eyebrow">STEP 2 · SIDE BY SIDE</span><h2>What changed</h2></div><span className="cloud-entity-count">{entities.length} found</span></div>
        <div className="cloud-before-after">
          <section><h3>Before <small>identified spans highlighted</small></h3><p className="cloud-text-preview">{highlighted}</p></section>
          <section><h3>After <small>this is what the next model can receive</small></h3><textarea aria-label="Review and edit transformed text" disabled={!scrubbedText} value={outputText} onChange={event => {
            setManualReview(event.target.value); setAssessment(null); setReviewConsent(false);
          }} placeholder="Run detection to create a transformed version." /></section>
        </div>
        {entities.length > 0 && <div className="cloud-entity-review"><h3>Detected details and replacements</h3><p>Choose a saved alias or edit the replacement. Alias choices are stored only in this device’s encrypted identity library.</p>
          {entities.map((entity, index) => {
            const source = sourceText.slice(entity.start, entity.end);
            const type = TYPE_FOR_LABEL[entity.label];
            const candidates = libraryEntities.filter(item => item.type === type && item.alias !== entity.replacement);
            return <div className="cloud-entity-editor" key={`${entity.start}-${entity.end}-${index}`}>
              <span className={`cloud-entity-dot cloud-pii-${entity.label.toLocaleLowerCase()}`}/><span className="cloud-entity-source"><strong>{source}</strong><small>{entity.label}</small></span>
              <span aria-hidden="true">→</span>
              <div className="cloud-entity-replacement"><input aria-label={`Replacement for ${source}`} value={entity.replacement} onChange={event => updateAlias(entity,event.target.value)} maxLength={200}/>
                {libraryReady && candidates.length > 0 && <label className="cloud-library-picker"><ChevronDown size={13}/><select aria-label={`Choose a saved ${entity.label} alias`} value="" onChange={event => {if(event.target.value)updateAlias(entity,event.target.value);}}><option value="">Use saved alias…</option>{candidates.map((item,index)=><option key={item.id} value={item.alias}>{item.alias} {index ? '' : '· library'}</option>)}</select></label>}
                {privateUnlocked && <button type="button" className="cloud-save-alias" onClick={() => void saveAlias(entity)}><Check size={13}/> Save alias</button>}
              </div>
            </div>;
          })}
          <div className="cloud-library-status"><LockKeyhole size={15}/><span>{libraryMessage}</span>{!privateUnlocked && onUnlockPrivate && <button type="button" onClick={() => void onUnlockPrivate().catch(error => setLibraryMessage(error instanceof Error ? error.message : 'Private access could not be unlocked.'))}>Unlock identity library</button>}</div>
        </div>}
        <label className="cloud-purpose">Why are you asking Decisions to review this passage?
          <input value={purpose} maxLength={200} onChange={event => {setPurpose(event.target.value);setAssessment(null);setReviewConsent(false);}} />
        </label>
        <label className="cloud-consent"><input type="checkbox" checked={reviewConsent} disabled={!scrubbedText} onChange={event => setReviewConsent(event.target.checked)}/><span>I reviewed the exact transformed text shown above and approve sending only this version to OpenAI Decisions for an advisory pattern assessment.</span></label>
        <button type="button" className="privacy-button primary cloud-run" disabled={!capability?.enabled || capability.provider !== 'openai_decisions' || !scrubbedText || !reviewConsent || status === 'assessing'} onClick={() => void runAssessment()}>
          {status === 'assessing' ? <LoaderCircle size={17} className="privacy-spin"/> : <Sparkles size={17}/>} {status === 'assessing' ? 'Assessing reviewed text…' : 'Assess reviewed text'}
        </button>
        {!capability?.enabled && <p className="cloud-disabled-note"><CircleAlert size={14}/>{capabilityMessage}</p>}
        {capability?.enabled && capability.provider !== 'openai_decisions' && <p className="cloud-disabled-note"><CircleAlert size={14}/>This deployment does not currently have Decisions selected.</p>}
      </article>
    </section>

    {message && <p className={`cloud-process-status ${status === 'error' ? 'is-error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'error' && <CircleAlert size={16}/>} {message}</p>}

    {assessment && <section className="cloud-pattern-results" aria-labelledby="cloud-results-title">
      <header><div><span className="privacy-pane-eyebrow">STEP 3 · OPENAI DECISIONS · GPT-6-LUNA</span><h2 id="cloud-results-title">Signals in this passage</h2></div><span className="cloud-result-badge">Advisory · {assessment.patterns.length} categories</span></header>
      <p className="cloud-result-disclaimer">A model score describes how strongly the selected wording matches a pattern. It is not proof that an event happened, a diagnosis, or a forecast of what someone will do. Read the writing and make your own judgement.</p>
      {urgent && <aside className="cloud-urgent-signal"><CircleAlert size={18}/><div><strong>The wording may describe immediate danger.</strong><span>This signal can be wrong. If you want to, review the South African support directory.</span></div><button type="button" onClick={onOpenSupport}>Review support options</button></aside>}
      {sortedAssessment.length > 0 ? <div className="cloud-pattern-list">{sortedAssessment.map(item => <article className={`cloud-pattern-card is-${item.band}`} key={item.id}>
        <div><strong>{item.title}</strong><p>{item.explanation}</p></div><div className="cloud-pattern-score"><span className={`cloud-pattern-band band-${item.band}`}>{bandLabel[item.band]}</span><strong>{Math.round((item.probability ?? 0) * 100)}%</strong><small>model signal</small></div>
        <div className="cloud-score-track"><span style={{width:`${Math.round((item.probability ?? 0)*100)}%`}}/></div>
      </article>)}</div> : <div className="cloud-no-patterns"><Check size={18}/><p>No pattern reached the display threshold in this passage. This does not mean that nothing happened; models can miss context.</p></div>}
      <details className="cloud-all-patterns"><summary>Review all {assessment.patterns.length} category scores</summary><ul>{assessment.patterns.map(item=><li key={item.id}><span>{item.title}</span><strong>{item.probability===null ? 'Unavailable' : `${Math.round(item.probability*100)}% · ${bandLabel[item.band]}`}</strong></li>)}</ul></details>
      <div className="cloud-next-actions"><button type="button" className="privacy-button secondary" onClick={() => onAskLu(`Please explain these advisory pattern signals using only this reviewed pseudonymised passage:\n\n${outputText}`)}><MessageCircle size={16}/> Ask Lu about this passage</button><button type="button" className="privacy-button secondary" onClick={onOpenSupport}>Open support directory</button></div>
      <p className="cloud-safety-score"><strong>Immediate safety cue:</strong> {assessment.immediateSafety.probability===null ? 'Unknown' : `${bandLabel[assessment.immediateSafety.band]} · ${Math.round(assessment.immediateSafety.probability*100)}% model signal`}. This does not contact anyone or trigger an alert.</p>
    </section>}

    <footer className="cloud-privacy-footer"><p><strong>What this proves:</strong> the account is connected to LuLu’s server; the server calls OpenAI for each selected model step; the browser displays the actual server-returned result. This page does not use the downloaded GLiNER model.</p><button type="button" className="cloud-reset-button" onClick={() => {setScrubConsent(false);setReviewConsent(false);updateSource(EXAMPLE);}}><RotateCcw size={14}/> Reset synthetic example</button></footer>
  </main>;

}
