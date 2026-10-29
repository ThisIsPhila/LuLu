import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, ChevronDown, CircleAlert, Cpu, Eye, Fingerprint, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import type { DetectedEntity } from '../services/privacy/contracts';
import { detectFormattedPii, mergeDetectedEntities } from '../services/privacy/formattedIdentifiers';
import type { Entry } from '../domain/journal';
import { getBrowserModelRuntimeState, getSharedGlinerBrowserDetector, prepareGlinerBrowserModel, unloadGlinerBrowserModel } from '../services/privacy/glinerBrowserDetector';
import { PRIVACY_MODEL, privacyModelManager } from '../services/privacy/modelPackage';
import { getCloudProcessingCapability, understandReviewedText, type CloudProcessingCapability, type CloudUnderstandingResult } from '../services/privacy/cloudProcessingClient';
import type { LocalVaultSession } from '../services/vault/localVault';
import { createMemoryEntityLibrary, createSessionEntityLibrary, entityIdentityType, type EntityLibrary } from '../services/privacy/entityLibrary';

const SAMPLE = 'Nomsa Dlamini met Sipho at Acme Clinic in Midrand. Email nomsa@example.invalid.';
const entityKey = (entity: DetectedEntity) => `${entity.start}:${entity.end}:${entity.label}`;
const identityKey = (entity: DetectedEntity, text: string) => `${entity.label}:${text.slice(entity.start, entity.end).trim().toLocaleLowerCase()}`;
const labelName = (label: string) => label.replace(/\b\w/g, char => char.toUpperCase());

type Props = { onBack: () => void; showBackButton?: boolean; entries?: Entry[]; privateSession?: LocalVaultSession; onUnlockPrivate?: () => Promise<void>; initialText?: string; initialRevision?: string };

function HighlightedText({ text, entities, onSelect }: { text: string; entities: DetectedEntity[]; onSelect?: (entity: DetectedEntity) => void }) {
  const ordered = [...entities].sort((a, b) => a.start - b.start);
  const chunks: React.ReactNode[] = [];
  let cursor = 0;
  for (const entity of ordered) {
    if (entity.start < cursor || entity.end > text.length) continue;
    if (entity.start > cursor) chunks.push(text.slice(cursor, entity.start));
    chunks.push(<mark key={entityKey(entity)} className={`pii-mark pii-${entity.label.replaceAll(' ', '-')}`} title={`${labelName(entity.label)} · ${Math.round(entity.confidence * 100)}% · ${entity.detector}`} onClick={() => onSelect?.(entity)}>{text.slice(entity.start, entity.end)}<span>{labelName(entity.label)}</span></mark>);
    cursor = entity.end;
  }
  chunks.push(text.slice(cursor));
  if (!text) return <span className="privacy-empty-copy">Your text will appear here.</span>;
  return <>{chunks}</>;
}

export function PrivacyModelDemo({ onBack, showBackButton = true, entries = [], privateSession, onUnlockPrivate, initialText, initialRevision }: Props) {
  const inferenceSurface = Capacitor.isNativePlatform() ? 'on-device WebAssembly' : 'browser WebAssembly';
  const [text, setText] = useState(initialText === undefined ? SAMPLE : initialText);
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'running' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [modelInstalled, setModelInstalled] = useState<boolean | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(() => getBrowserModelRuntimeState() === 'ready');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [modelVersion, setModelVersion] = useState('Not run in this tab');
  const [inferenceDurationMs, setInferenceDurationMs] = useState<number | null>(null);
  const [cloudCapability, setCloudCapability] = useState<CloudProcessingCapability | null>(null);
  const [cloudCapabilityMessage, setCloudCapabilityMessage] = useState('Checking this LuLu service…');
  const [reviewText, setReviewText] = useState('');
  const [reviewPurpose, setReviewPurpose] = useState('Understand this pseudonymised passage');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [cloudResult, setCloudResult] = useState<CloudUnderstandingResult | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'running' | 'error' | 'ready'>('idle');
  const [cloudMessage, setCloudMessage] = useState('');
  const localRunId = useRef(0);
  const cloudController = useRef<AbortController | null>(null);
  const cloudGeneration = useRef(0);
  const reviewRevision = useRef('');
  const sourceRevision = useRef(initialRevision ?? 'demo-source');
  const identityLibrary = useRef<EntityLibrary | null>(null);
  const identityLibraryReady = useRef<Promise<void>>(Promise.resolve());
  const identityLibraryError = useRef<unknown>(null);

  useEffect(() => {
    const library = privateSession?.isUnlocked() ? createSessionEntityLibrary(privateSession) : createMemoryEntityLibrary();
    identityLibrary.current = library;
    identityLibraryError.current = null;
    identityLibraryReady.current = library.load().then(() => undefined).catch(error => { identityLibraryError.current = error; });
    void privacyModelManager.isInstalled().then(setModelInstalled).catch(() => setModelInstalled(false));
    const controller = new AbortController();
    void getCloudProcessingCapability(controller.signal).then(capability => {
      if (controller.signal.aborted) return;
      setCloudCapability(capability);
      setCloudCapabilityMessage(capability.enabled ? 'Available for an explicit reviewed-text request.' : 'Not configured on this LuLu service.');
    }).catch(error => {
      if (!controller.signal.aborted) setCloudCapabilityMessage(error instanceof Error ? error.message : 'Could not check cloud capability.');
    });
    return () => {
      controller.abort();
      localRunId.current++;
      cloudController.current?.abort();
      cloudGeneration.current++;
      library.dispose();
      if (identityLibrary.current === library) identityLibrary.current = null;
    };
  }, [privateSession?.ownerId, privateSession?.generation()]);

  useEffect(() => {
    if (initialText === undefined) return;
    setText(initialText);
    sourceRevision.current = initialRevision ?? 'private-source';
    setEntities([]); setReplacements({}); setReviewText(''); setStatus('idle'); setModelVersion('Not run in this tab'); setInferenceDurationMs(null);
    invalidateCloudReview();
  }, [initialText, initialRevision]);

  useEffect(() => {
    if (initialText === undefined) return;
    const timer = window.setInterval(() => {
      if (privateSession?.isUnlocked()) return;
      localRunId.current++;
      cloudController.current?.abort();
      cloudGeneration.current++;
      setText(''); setEntities([]); setReplacements({}); setReviewText(''); setCloudResult(null);
      onBack();
    }, 500);
    return () => window.clearInterval(timer);
  }, [initialText !== undefined, privateSession?.ownerId, privateSession?.generation(), onBack]);

  const output = useMemo(() => {
    let result = '';
    let cursor = 0;
    const outputEntities: DetectedEntity[] = [];
    for (const entity of [...entities].sort((a, b) => a.start - b.start)) {
      if (entity.start < cursor) continue;
      result += text.slice(cursor, entity.start);
      const replacement = replacements[identityKey(entity, text)] ?? `[${entity.label.toUpperCase().replaceAll(' ', '_')}]`;
      const start = result.length;
      result += replacement;
      outputEntities.push({ ...entity, start, end: result.length });
      cursor = entity.end;
    }
    return { text: result + text.slice(cursor), entities: outputEntities };
  }, [text, entities, replacements]);

  async function run() {
    const runId = ++localRunId.current;
    const sourceText = text;
    cloudController.current?.abort();
    setInferenceDurationMs(null);
    setCloudResult(null); setCloudStatus('idle'); setCloudMessage(''); setReviewConfirmed(false); setReviewText(''); reviewRevision.current = '';
    setStatus('running'); setMessage('Loading the downloaded model into this browser…'); setEntities([]); setReplacements({});
    try {
      if (!(await privacyModelManager.isInstalled())) throw new Error('Download the model in Settings before running the demo.');
      await prepareGlinerBrowserModel();
      setRuntimeReady(true);
      const detector = getSharedGlinerBrowserDetector();
      const actualModelVersion = detector.modelVersion;
      setMessage('Running GLiNER locally in this browser…');
      const inferenceStarted = performance.now();
      const modelEntities = await detector.detect(sourceText);
      const elapsedMs = Math.max(0, Math.round(performance.now() - inferenceStarted));
      if (runId !== localRunId.current) return;
      const detections = mergeDetectedEntities(modelEntities, detectFormattedPii(sourceText));
      await identityLibraryReady.current;
      if (identityLibraryError.current) throw identityLibraryError.current;
      const activeLibrary = identityLibrary.current;
      const mapped = activeLibrary ? await activeLibrary.apply(sourceText, detections) : null;
      if (runId !== localRunId.current) return;
      setEntities(detections); setModelInstalled(true);
      setModelVersion(actualModelVersion);
      setInferenceDurationMs(elapsedMs);
      const next: Record<string, string> = {};
      for (const entity of detections) {
        const type = entityIdentityType(entity.label);
        const identity = type && activeLibrary ? await activeLibrary.match(sourceText.slice(entity.start, entity.end), type) : null;
        next[identityKey(entity, sourceText)] = identity?.alias ?? `[${entity.label.toUpperCase().replaceAll(' ', '_')}]`;
      }
      if (runId !== localRunId.current) return;
      setReplacements(next);
      setStatus('ready');
      setMessage(detections.length ? `Found ${detections.length} candidate mention${detections.length === 1 ? '' : 's'} to review. ${mapped ? 'Aliases came from the current session’s identity library.' : 'This text was processed in this browser.'}` : 'No candidate mention was detected. Review the text yourself; the model can miss details.');
    } catch (error) {
      if (runId !== localRunId.current) return;
      setStatus('error');
      setRuntimeReady(false);
      setMessage(error instanceof Error ? error.message : 'The model could not process this text.');
      await unloadGlinerBrowserModel().catch(() => {});
    }
  }

  function updateReplacement(entity: DetectedEntity, replacement: string) {
    setReplacements(current => ({ ...current, [identityKey(entity, text)]: replacement }));
    invalidateCloudReview();
    setReviewText('');
  }

  function saveAlias(entity: DetectedEntity, alias: string) {
    const type = entityIdentityType(entity.label);
    const library = identityLibrary.current;
    if (type && alias.trim() && library) void library.setAlias({ text: text.slice(entity.start, entity.end), type, alias }).catch(error => {
      setMessage(error instanceof Error ? `Alias was not saved: ${error.message}` : 'Alias was not saved.');
    });
  }

  function invalidateCloudReview() {
    cloudController.current?.abort(); cloudController.current = null;
    cloudGeneration.current++;
    reviewRevision.current = '';
    setReviewConfirmed(false); setCloudResult(null); setCloudStatus('idle'); setCloudMessage('');
  }

  function prepareReviewedText() {
    invalidateCloudReview();
    setReviewText(output.text);
    const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    reviewRevision.current = `${sourceRevision.current.slice(0, 70)}:${nonce}`.slice(0, 128);
    setCloudMessage('Review the exact pseudonymised text below. Nothing is sent until you approve and choose Interpret.');
  }

  function containsDetectedOriginal(value: string) {
    const lower = value.toLocaleLowerCase();
    return entities.some(entity => {
      const original = text.slice(entity.start, entity.end).trim().toLocaleLowerCase();
      return original.length > 0 && lower.includes(original);
    });
  }

  const hasPseudonymisedReview = entities.length > 0 && reviewText.trim().length > 0 && reviewText !== text && !containsDetectedOriginal(reviewText) && reviewText.length <= (cloudCapability?.maxCharacters ?? 0);
  async function interpretReviewedText() {
    if (!privateSession?.isUnlocked()) {
      setCloudStatus('error'); setCloudMessage('Unlock private processing with your passkey before using cloud interpretation.'); return;
    }
    if (!cloudCapability?.enabled || !reviewConfirmed || !hasPseudonymisedReview || !reviewPurpose.trim()) return;
    cloudController.current?.abort();
    const controller = new AbortController();
    cloudController.current = controller;
    const requestGeneration = ++cloudGeneration.current;
    const exactReviewedText = reviewText;
    const exactPurpose = reviewPurpose.trim();
    const revision = reviewRevision.current || `review-${Date.now()}`;
    reviewRevision.current = revision;
    setCloudStatus('running'); setCloudMessage('Sending only the approved pseudonymised text to the configured LuLu service…'); setCloudResult(null);
    try {
      const result = await understandReviewedText({
        text: exactReviewedText,
        revision,
        purpose: exactPurpose,
        isPrivateSessionActive: privateSession.isUnlocked,
        signal: controller.signal,
      });
      if (controller.signal.aborted || requestGeneration !== cloudGeneration.current || exactPurpose !== reviewPurpose.trim() || !privateSession.isUnlocked()) return;
      setCloudResult(result); setCloudStatus('ready'); setCloudMessage('Advisory interpretation received. Review it; it does not make decisions or change your journal.');
    } catch (error) {
      if (controller.signal.aborted) return;
      setCloudStatus('error'); setCloudMessage(error instanceof Error ? error.message : 'Cloud interpretation could not be completed.');
    }
  }

  const highlightEntities = (entity: DetectedEntity) => setSelected(entityKey(entity));
  function loadSelectedEntry() {
    const entry = entries.find(item => item.id === selectedEntryId);
    if (!entry) return;
    localRunId.current++;
    invalidateCloudReview();
    sourceRevision.current = `ordinary-entry:${entry.id}`;
    setText(entry.body);
    setStatus('idle'); setMessage('Entry loaded for an on-device preview. The saved journal entry is unchanged.');
    setEntities([]); setReplacements({}); setSelected(null); setReviewText(''); setInferenceDurationMs(null);
  }

  return <main className="privacy-demo-page">
    <header className="privacy-demo-header">
      {showBackButton && <button type="button" className="privacy-back" onClick={() => { if (initialText !== undefined) { localRunId.current++; cloudGeneration.current++; setText(''); setEntities([]); setReplacements({}); setReviewText(''); setCloudResult(null); cloudController.current?.abort(); } onBack(); }}><ArrowLeft size={18} /> {initialText !== undefined ? 'Private writing' : 'Settings'}</button>}
      <div className="privacy-demo-title"><span className="privacy-demo-emblem"><Fingerprint size={22} /></span><div><span className="privacy-settings-kicker">LOCAL MODEL DEMO</span><h1>Find and replace private details</h1></div></div>
      <div className="privacy-demo-proof"><span className={`live-dot ${runtimeReady ? '' : 'is-off'}`} /><span>{!modelInstalled ? 'Model not downloaded yet' : runtimeReady ? `Loaded model: ${modelVersion === 'Not run in this tab' ? `GLiNER Small v2.1 · ${PRIVACY_MODEL.version.slice(0, 12)} · ONNX WASM` : modelVersion}` : 'Model installed; load it to this session'}</span><span className="privacy-proof-separator">•</span><span>Inference: {inferenceDurationMs === null ? `${inferenceSurface} · not run` : `${inferenceSurface} · ${inferenceDurationMs} ms`}</span><ShieldCheck size={17} /><span>Local scan sends no text</span></div>
    </header>

    <section className="privacy-demo-explainer"><Sparkles size={18} /><p>Choose a journal entry or paste text, run the downloaded model on this device, then review each highlighted candidate. This local scan stays on this device and is separate from Lu chat and the cloud Decisions demo. Detection can miss details; this is not a guarantee of complete anonymisation. The local preview never changes the saved entry.</p></section>

    <div className="privacy-demo-columns">
      <section className="privacy-demo-pane source-pane">
        <div className="privacy-pane-heading"><div><span className="privacy-pane-eyebrow">BEFORE</span><h2>Your original text</h2></div><span className="privacy-word-count">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span></div>
        {entries.length > 0 && <div className="privacy-entry-picker">
          <label htmlFor="privacy-journal-entry">Use an existing journal entry</label>
          <div className="privacy-entry-picker-controls">
            <select id="privacy-journal-entry" value={selectedEntryId} onChange={event => setSelectedEntryId(event.target.value)}>
              <option value="">Choose an entry…</option>
              {entries.map(entry => <option key={entry.id} value={entry.id}>{entry.title || 'Untitled'} · {entry.kind}</option>)}
            </select>
            <button type="button" className="privacy-button secondary" onClick={loadSelectedEntry} disabled={!selectedEntryId}>Load preview</button>
          </div>
          <small>Only ordinary entries are listed. Loading one here does not edit or save it.</small>
        </div>}
        <textarea aria-label="Text to scan for private details" value={text} onChange={event => { localRunId.current++; sourceRevision.current = `edited:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`; invalidateCloudReview(); setReviewText(''); setText(event.target.value); setStatus('idle'); setMessage(''); setEntities([]); setReplacements({}); setModelVersion('Not run in this tab'); setInferenceDurationMs(null); }} maxLength={12000} placeholder="Write or paste a short passage…" />
        <div className="privacy-pane-heading detected-heading"><div><span className="privacy-pane-eyebrow">MODEL HIGHLIGHTS</span><h3>Detected mentions in your text</h3></div><span className="privacy-count-badge">{entities.length}</span></div>
        <div className="privacy-highlight-preview" aria-label="Original text with detected private details highlighted"><HighlightedText text={text} entities={entities} onSelect={highlightEntities} /></div>
        {entities.length > 0 && <div className="privacy-entity-list" aria-label="Detected entities">{entities.map(entity => <button type="button" key={entityKey(entity)} onClick={() => setSelected(entityKey(entity))} className={`privacy-entity-row ${selected === entityKey(entity) ? 'selected' : ''}`}><span className={`privacy-entity-swatch pii-${entity.label.replaceAll(' ', '-')}`} /><span className="privacy-entity-value">{text.slice(entity.start, entity.end)}</span><span className="privacy-entity-type">{labelName(entity.label)}</span><span className="privacy-entity-source">{entity.detector === 'format check' ? 'format check' : `${Math.round(entity.confidence * 100)}% model`}</span><ChevronDown size={15} /></button>)}</div>}
        <button type="button" className="privacy-button primary privacy-run-button" disabled={status === 'running' || !text.trim()} onClick={() => void run()}>{status === 'running' ? <><LoaderCircle className="privacy-spin" size={17} /> Processing in browser…</> : <><Cpu size={17} /> Run local model</>}</button>
        {message && <p className={`privacy-run-message ${status === 'error' ? 'error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'error' && <CircleAlert size={16} />}{message}</p>}
      </section>

      <section className="privacy-demo-pane result-pane">
        <div className="privacy-pane-heading"><div><span className="privacy-pane-eyebrow">AFTER · REVIEW BEFORE USE</span><h2>Replacement preview</h2></div><span className="privacy-output-mode"><Eye size={15} />{status !== 'ready' ? 'Not processed' : entities.length ? 'Replacements' : 'No replacements'}</span></div>
        <div className="privacy-output-preview" aria-live="polite">{status === 'ready' ? <HighlightedText text={output.text} entities={output.entities} /> : <span className="privacy-empty-copy">Run the local model to create a replacement preview.</span>}</div>
        {status === 'ready' && entities.length === 0 && <p className="privacy-review-note"><ShieldCheck size={16} /> No replacements were made. Review the original carefully; this model can miss details.</p>}
        <div className="privacy-library-heading"><div><span className="privacy-pane-eyebrow">YOUR REPLACEMENT LIBRARY</span><h3>Choose what each mention becomes</h3></div></div>
        {entities.length ? <div className="privacy-library-list">{entities.map(entity => {
          const current = replacements[identityKey(entity, text)] ?? '';
          return <label className={`privacy-library-row ${selected === entityKey(entity) ? 'selected' : ''}`} key={entityKey(entity)} onClick={() => setSelected(entityKey(entity))}><span className={`privacy-entity-swatch pii-${entity.label.replaceAll(' ', '-')}`} /><span className="privacy-library-original">{text.slice(entity.start, entity.end)}<small>{labelName(entity.label)}</small></span><span className="privacy-library-arrow">→</span><input aria-label={`Replacement for ${text.slice(entity.start, entity.end)}`} value={current} onChange={event => updateReplacement(entity, event.target.value)} onBlur={event => saveAlias(entity, event.currentTarget.value)} /></label>;
        })}</div> : <div className="privacy-library-empty"><Fingerprint size={22} /><p>Run the model to see mentions and choose replacements from your library.</p></div>}
        {entities.length > 0 && <p className="privacy-review-note"><ShieldCheck size={16} /> This is a preview. It does not save or send your text.</p>}
        <section className="privacy-cloud-review" aria-labelledby="privacy-cloud-review-title">
          <div className="privacy-pane-heading"><div><span className="privacy-pane-eyebrow">OPTIONAL CLOUD STEP</span><h3 id="privacy-cloud-review-title">Assess contextual identification risk</h3></div></div>
          <p className="privacy-cloud-copy">Local detection and your replacement choices stay in this browser. This optional cloud step sends the exact transformed text shown here after your review, purpose and passkey-protected session are confirmed. The detector may miss identifying details, so check the text carefully before sending it. The replacement library is not sent.</p>
          <p className={`privacy-cloud-capability ${cloudCapability?.enabled ? 'available' : ''}`} role="status">{cloudCapability?.enabled ? `Available: ${cloudCapability.provider === 'openai_decisions' ? 'OpenAI Decisions · bounded risk choice' : 'OpenAI Responses · advisory assessment'} · up to ${cloudCapability.maxCharacters.toLocaleString()} characters.` : cloudCapabilityMessage}</p>
          {cloudCapability?.enabled && <>
            {!privateSession?.isUnlocked() && <button type="button" className="privacy-button secondary" disabled={!onUnlockPrivate} onClick={() => void onUnlockPrivate?.().catch(error => setCloudMessage(error instanceof Error ? error.message : 'Private session unlock failed.'))}>Unlock private processing with passkey</button>}
            <button type="button" className="privacy-button secondary" disabled={!entities.length || output.text === text} onClick={prepareReviewedText}>Use current replacement preview</button>
            {reviewText && <>
              <label className="privacy-cloud-field">Exact text for cloud review
                <textarea value={reviewText} maxLength={cloudCapability.maxCharacters} readOnly aria-describedby="privacy-cloud-review-help" />
              </label>
              <small id="privacy-cloud-review-help" className="privacy-cloud-review-help">This field is the exact transformed preview above; the original and identity mappings are not included in the request.</small>
              <label className="privacy-cloud-field">Purpose
                <input value={reviewPurpose} maxLength={200} onChange={event => { setReviewPurpose(event.target.value); invalidateCloudReview(); }} />
              </label>
              <label className="privacy-cloud-consent"><input type="checkbox" checked={reviewConfirmed} disabled={!hasPseudonymisedReview || !reviewPurpose.trim()} onChange={event => { if (!event.target.checked) invalidateCloudReview(); setReviewConfirmed(event.target.checked); setCloudResult(null); setCloudStatus('idle'); }} /> I reviewed this exact text and confirm it is pseudonymised, contains no original detected names/details, and may be sent for this purpose.</label>
              {!hasPseudonymisedReview && <p className="privacy-cloud-warning">A reviewed copy must differ from the original, replace the detected details, and contain no detected original names/details.</p>}
              {reviewText.length > (cloudCapability.maxCharacters) && <p className="privacy-cloud-warning">This transformed text exceeds the service limit of {cloudCapability.maxCharacters.toLocaleString()} characters.</p>}
              <button type="button" className="privacy-button primary" disabled={!privateSession?.isUnlocked() || !reviewConfirmed || !hasPseudonymisedReview || !reviewPurpose.trim() || cloudStatus === 'running'} onClick={() => void interpretReviewedText()}>{cloudStatus === 'running' ? 'Assessing reviewed text…' : 'Assess reviewed text'}</button>
            </>}
          </>}
          {cloudMessage && <p className={`privacy-cloud-result-message ${cloudStatus === 'error' ? 'error' : ''}`} role={cloudStatus === 'error' ? 'alert' : 'status'}>{cloudMessage}</p>}
          {cloudResult && <div className="privacy-cloud-result" aria-live="polite"><p><strong>{cloudResult.decision.toUpperCase()} RISK</strong> · {cloudResult.model} · {cloudResult.provider === 'openai_decisions' ? 'bounded choice' : 'advisory assessment'}</p><p>{cloudResult.explanation ?? cloudResult.rationale}</p>{cloudResult.provider === 'openai_decisions' && <small>Category explanation: fixed LuLu copy, not model rationale.</small>}{typeof cloudResult.confidence === 'number' && <small>Confidence: {Math.round(cloudResult.confidence * 100)}%</small>}<small>Reviewed revision {cloudResult.review.revision} · purpose: {cloudResult.review.purpose} · exact text digest: {cloudResult.review.sha256.slice(0, 16)}…</small></div>}
        </section>
      </section>
    </div>
    <footer className="privacy-demo-footer">Model files: Hugging Face · <a href={`https://huggingface.co/onnx-community/gliner_small-v2.1/tree/${PRIVACY_MODEL.version}`} target="_blank" rel="noreferrer">pinned model revision</a> · GLiNER Small v2.1 · ONNX Runtime Web WASM · English model; detections need human review.</footer>
  </main>;
}
