import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, CheckCircle2, Cpu, ExternalLink, HardDrive, Trash2 } from 'lucide-react';
import { detectLocalPreviewModelCache, privacyModelManager, PRIVACY_MODEL } from '../services/privacy/modelPackage';
import type { ModelState } from '../services/privacy/contracts';
import { getBrowserModelRuntimeState, prepareGlinerBrowserModel, unloadGlinerBrowserModel } from '../services/privacy/glinerBrowserDetector';
import { getCloudProcessingCapability, type CloudProcessingCapability } from '../services/privacy/cloudProcessingClient';

const totalBytes = PRIVACY_MODEL.artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0);
const formatBytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(0)} MB`;

type Props = { onBack: () => void; onOpenDemo: () => void };

export function PrivacyModelSettings({ onBack, onOpenDemo }: Props) {
  const [modelState, setModelState] = useState<ModelState>({ status: 'not_installed' });
  const [storage, setStorage] = useState<{ usage?: number; quota?: number; persistent?: boolean }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [localCacheAvailable, setLocalCacheAvailable] = useState(false);
  const [runtimeState, setRuntimeState] = useState(getBrowserModelRuntimeState);
  const [cloudCapability, setCloudCapability] = useState<CloudProcessingCapability | null>(null);
  const [cloudMessage, setCloudMessage] = useState('Checking this LuLu service…');

  async function refresh() {
    const installed = await privacyModelManager.isInstalled();
    setModelState(privacyModelManager.state());
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const persistent = navigator.storage.persisted ? await navigator.storage.persisted() : undefined;
      setStorage({ usage: estimate.usage, quota: estimate.quota, persistent });
    }
    return installed;
  }

  useEffect(() => {
    void refresh().catch(() => setMessage('Could not check this browser’s local storage.'));
    void detectLocalPreviewModelCache().then(setLocalCacheAvailable);
    const controller = new AbortController();
    void getCloudProcessingCapability(controller.signal).then(capability => {
      if (controller.signal.aborted) return;
      setCloudCapability(capability);
      setCloudMessage(capability.enabled ? 'Available for an explicit reviewed-text request.' : 'Not configured on this LuLu service.');
    }).catch(error => {
      if (!controller.signal.aborted) setCloudMessage(error instanceof Error ? error.message : 'Could not check cloud capability.');
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (modelState.status !== 'downloading') return;
    const timer = window.setInterval(() => setModelState(privacyModelManager.state()), 250);
    return () => window.clearInterval(timer);
  }, [modelState.status]);

  async function install() {
    setBusy(true); setMessage('');
    try {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
        if (estimate.quota && available < totalBytes * 1.1) {
          throw new Error(`This browser reports only ${formatBytes(Math.max(0, available))} available; the model package needs about ${formatBytes(totalBytes)}.`);
        }
      }
      if (navigator.storage?.persist) {
        try { if (!(await navigator.storage.persisted?.())) await navigator.storage.persist(); }
        catch { /* Best-effort browser persistence must not block the optional download. */ }
      }
      const installation = privacyModelManager.install();
      setModelState(privacyModelManager.state());
      await installation;
      await refresh();
      setMessage(localCacheAvailable
        ? 'Existing local model files copied into this browser’s storage. No internet model download was needed.'
        : 'Model downloaded and saved in this browser on this device.');
    } catch (error) {
      setModelState(privacyModelManager.state());
      setMessage(error instanceof Error ? error.message : 'The model could not be downloaded. Check your connection and available storage.');
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setMessage('');
    try {
      await unloadGlinerBrowserModel();
      setRuntimeState('not_loaded');
      await privacyModelManager.remove();
      await refresh();
      setMessage('Model files removed from this browser.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The model could not be removed.'); }
    finally { setBusy(false); }
  }

  async function prepareRuntime() {
    setBusy(true); setRuntimeState('loading'); setMessage('Loading the model into this browser tab. No text is being processed.');
    try {
      await prepareGlinerBrowserModel();
      setRuntimeState('ready');
      setMessage('Model ready in this tab. It will stay loaded while you open the demo.');
    } catch (error) {
      setRuntimeState(getBrowserModelRuntimeState());
      setMessage(error instanceof Error ? error.message : 'The model could not be prepared in this browser.');
    } finally { setBusy(false); }
  }

  async function unloadRuntime() {
    setBusy(true); setMessage('');
    try {
      await unloadGlinerBrowserModel();
      setRuntimeState('not_loaded');
      setMessage('Model unloaded from this tab’s memory. Its downloaded files remain in browser storage.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The model could not be unloaded.'); }
    finally { setBusy(false); }
  }

  const installed = modelState.status === 'ready';
  const downloading = modelState.status === 'downloading';
  const progress = downloading && modelState.totalBytes > 0 ? Math.min(100, modelState.receivedBytes / modelState.totalBytes * 100) : 0;

  return <main className="privacy-settings-page">
    <header className="privacy-settings-header">
      <button type="button" className="privacy-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
      <span className="privacy-settings-kicker">SETTINGS · ON-DEVICE AI</span>
      <h1>Privacy model</h1>
      <p>This privacy demo uses a downloaded model on this device to highlight possible personal details. A separate cloud assessment is available after you review the transformed text. Lu chat uses a cloud privacy scrubber; it does not use this downloaded model.</p>
    </header>

    <section className="privacy-model-card" aria-label="GLiNER model download">
      <div className="privacy-model-card-title"><span className="privacy-model-icon"><Cpu size={21} /></span><div><h2>GLiNER Small v2.1</h2><p>Quantized ONNX · English entity detection</p></div></div>
      <div className="privacy-model-facts"><span><HardDrive size={15} /> About {formatBytes(totalBytes)}</span><span><CheckCircle2 size={15} /> Files are checksum-checked</span></div>
      {installed ? <div className="privacy-installed-state" role="status"><CheckCircle2 size={18} /> Downloaded in this browser on this device</div> : downloading ? <div className="privacy-download-progress" role="status"><div className="privacy-progress-copy"><span>{localCacheAvailable ? 'Copying existing model files into this browser…' : 'Downloading model files…'}</span><span>{formatBytes(modelState.receivedBytes)} / {formatBytes(modelState.totalBytes)}</span></div><progress max={100} value={progress} aria-label="Model download progress" /></div> : modelState.status === 'unsupported' ? <p className="privacy-inline-error">This browser does not support the storage needed for the model.</p> : <p className="privacy-storage-note">{localCacheAvailable ? 'Verified model files are already present on this computer. Use them to fill this browser’s private site storage without downloading them from the internet.' : 'Stored in this site’s private browser storage, not as a file in Downloads. Browser settings can clear this storage.'}</p>}
      {installed && <div className={`privacy-runtime-state ${runtimeState === 'ready' ? 'is-ready' : ''}`} role="status"><span className="live-dot" />{runtimeState === 'ready' ? 'Model loaded in this tab and ready. Text has not been processed.' : runtimeState === 'loading' ? 'Loading model into this tab’s memory…' : 'Model files are here; the model is not loaded in memory yet.'}</div>}
      {storage.usage !== undefined && storage.quota !== undefined && <p className="privacy-storage-footnote">This site is using {formatBytes(storage.usage)} of about {formatBytes(storage.quota)} browser storage{storage.persistent ? ' · browser storage persistence enabled' : ''}.</p>}
      {message && <p className={modelState.status === 'failed' || /could not|only |unavailable|not support|failed/i.test(message) ? 'privacy-inline-error' : 'privacy-inline-success'} role="status">{message}</p>}
      <div className="privacy-model-actions">
        {installed ? <button className="privacy-button secondary" type="button" disabled={busy} onClick={() => void remove()}><Trash2 size={17} /> Remove model</button> : <button className="privacy-button primary" type="button" disabled={busy || downloading || modelState.status === 'unsupported'} onClick={() => void install()}><ArrowDownToLine size={17} /> {busy ? 'Preparing…' : localCacheAvailable ? 'Use model files already on this computer' : 'Download model to this browser'}</button>}
        {installed && runtimeState !== 'ready' && <button className="privacy-button secondary" type="button" disabled={busy || runtimeState === 'loading'} onClick={() => void prepareRuntime()}><Cpu size={17} /> {runtimeState === 'loading' ? 'Preparing model…' : 'Prepare model for this session'}</button>}
        {installed && runtimeState === 'ready' && <button className="privacy-button secondary" type="button" disabled={busy} onClick={() => void unloadRuntime()}>Unload from memory</button>}
        {installed && <button className="privacy-button primary" type="button" disabled={busy || runtimeState === 'loading'} onClick={onOpenDemo}>{runtimeState === 'ready' ? 'Open demo — model ready' : 'Open live text demo'} <ExternalLink size={16} /></button>}
      </div>
      <p className="privacy-model-origin">{localCacheAvailable && !installed ? 'This local preview found the existing model files on this computer. The files are checksum-checked before being copied into browser storage.' : 'Model files come from Hugging Face:'} <a href="https://huggingface.co/onnx-community/gliner_small-v2.1/tree/8142fb00740ccea973e64b1272949ff48653df5e" target="_blank" rel="noreferrer">onnx-community / gliner_small-v2.1 <ExternalLink size={12} /></a>. No text is sent to that source.</p>
    </section>
    <section className="privacy-cloud-card" aria-labelledby="privacy-cloud-heading">
      <div className="privacy-cloud-heading"><div><span className="privacy-settings-kicker">SEPARATE CLOUD STEP</span><h2 id="privacy-cloud-heading">Cloud contextual assessment</h2></div><span className={`privacy-cloud-badge ${cloudCapability?.enabled ? 'available' : ''}`}>{cloudCapability?.enabled ? 'Available' : 'Unavailable'}</span></div>
      <p>This is a separate, on-demand step. It receives the exact transformed text you review and approve in the demo. Review it carefully: the local detector may miss identifying details.</p>
      <p className={cloudCapability?.enabled ? 'privacy-cloud-status available' : 'privacy-cloud-status'} role="status">{cloudMessage}</p>
      {cloudCapability && <small>Accepted input: reviewed pseudonymised text · limit {cloudCapability.maxCharacters.toLocaleString()} characters · service: {cloudCapability.provider === 'openai_decisions' ? 'OpenAI Decisions · gpt-6-luna' : cloudCapability.provider === 'openai_responses' ? 'OpenAI Responses · server-selected model (advisory)' : 'not configured'}</small>}
      <div className="privacy-model-inventory" aria-label="Processing tools in this app">
        <h3>What this app can run</h3>
        <ul>
          <li><strong>GLiNER Small v2.1 INT8</strong><span>AI model on this device. Finds candidate names, places, organisations, dates and times. The text stays in this browser during detection.</span></li>
          <li><strong>Format checks</strong><span>Local rules for items such as email addresses, phone numbers and times. These are checks, not another AI model.</span></li>
          <li><strong>OpenAI Decisions · gpt-6-luna</strong><span>Separate cloud model, used only for reviewed pseudonymised text after an explicit action. Availability above reflects this app's connected service.</span></li>
          <li><strong>OpenAI Responses</strong><span>A code adapter exists for a server-selected model. {cloudCapability ? (cloudCapability.provider === 'openai_responses' ? 'This service currently reports it as selected.' : 'It is not currently selected on this service.') : 'Its availability can be checked after signing in.'}</span></li>
        </ul>
        <p>To try local detection, download and prepare GLiNER here, then choose <strong>Open live text demo</strong>. That page shows the input, highlighted candidates and replacement preview side by side.</p>
      </div>
    </section>
  </main>;
}
