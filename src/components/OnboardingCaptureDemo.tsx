import { useEffect, useRef, useState } from 'react';
import {
  AudioLines, FileText, Image as ImageIcon, Mic, Paperclip,
  Pencil, Play, ShieldCheck, Square, Trash2, Upload, X,
} from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createPlatformAudioCapture } from '../platform/nativeAudio';
import type { AudioCaptureController, AudioCaptureState } from '../services/mediaCapture';
import { isNativePlatform } from '../platform/runtime';
import './OnboardingCaptureDemo.css';

export type OnboardingCaptureDemoProps = {
  onBack?: () => void;
  onContinue?: () => void;
};

type CaptureKind = 'photo' | 'voice' | 'file';
type CapturedItem = {
  id: number;
  kind: CaptureKind;
  name: string;
  blob: Blob;
  url: string;
  durationMs?: number;
};
const MAX_DEMO_CAPTURE_BYTES = 25 * 1024 * 1024;

const SAMPLE_NOTE = 'Today was hard, but I’m writing this down so I don’t forget how it felt.';
/** Screen 11 capture tutorial. User media lives only in component memory for this visit. */
export function OnboardingCaptureDemo(_props: OnboardingCaptureDemoProps) {
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const audio = useRef<AudioCaptureController | null>(null);
  const mounted = useRef(false);
  const nextId = useRef(0);
  const urls = useRef(new Set<string>());
  const [step, setStep] = useState<CaptureKind | null>(null);
  const [items, setItems] = useState<CapturedItem[]>([]);
  const [recordState, setRecordState] = useState<AudioCaptureState>('idle');
  const [recordingMs, setRecordingMs] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    mounted.current = true;
    const controller = createPlatformAudioCapture({
      onState: update => { if (mounted.current) { setRecordState(update.state); if (update.message) setNotice(update.message); } },
      onCaptured: (blob, metadata) => {
        if (!mounted.current) return;
        addItem('voice', blob, 'Voice note', metadata.durationMs);
        setNotice('Voice note saved for this demo session. It stays in memory until you leave this screen.');
        setStep(null);
      },
    });
    audio.current = controller;
    return () => {
      mounted.current = false;
      controller.cancel();
      audio.current = null;
      urls.current.forEach(url => URL.revokeObjectURL(url));
      urls.current.clear();
    };
    // The controller is created once per mount; its callbacks read current state through setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recordState !== 'recording') return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setRecordingMs(Date.now() - startedAt), 200);
    return () => window.clearInterval(timer);
  }, [recordState]);

  function addItem(kind: CaptureKind, blob: Blob, name: string, durationMs?: number) {
    if (!mounted.current || blob.size === 0) return;
    if (blob.size > MAX_DEMO_CAPTURE_BYTES) {
      setNotice('Choose a capture smaller than 25 MB for this demo.');
      return;
    }
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    setItems(current => [...current, { id: ++nextId.current, kind, name, blob, url, durationMs }]);
  }

  async function choosePhoto() {
    setNotice('');
    if (isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({ source: CameraSource.Photos, resultType: CameraResultType.Uri, quality: 100, allowEditing: false });
        if (!photo.webPath || !mounted.current) return;
        const response = await fetch(photo.webPath);
        if (!response.ok) throw new Error('Could not read selected photo.');
        const blob = await response.blob();
        addItem('photo', blob, `Photo ${items.length + 1}`);
        setNotice('Photo added to this demo session. It stays in memory until you leave this screen.');
        setStep(null);
      } catch (error) {
        if ((error as { message?: string })?.message?.toLowerCase().includes('cancel')) return;
        if (mounted.current) setNotice('Photo selection did not finish. You can try again or continue without adding one.');
      }
    } else {
      photoInput.current?.click();
    }
  }

  function addSelectedFile(file: File | undefined, kind: CaptureKind) {
    if (!file) return;
    if (file.size > MAX_DEMO_CAPTURE_BYTES) {
      setNotice('Choose a file smaller than 25 MB for this demo.');
      return;
    }
    addItem(kind, file, file.name || (kind === 'photo' ? 'Photo' : 'File'));
    setNotice(`${kind === 'photo' ? 'Photo' : 'File'} added to this demo session. It stays in memory until you leave this screen.`);
    setStep(null);
  }

  function removeItem(item: CapturedItem) {
    URL.revokeObjectURL(item.url);
    urls.current.delete(item.url);
    setItems(current => current.filter(entry => entry.id !== item.id));
    setNotice('Capture removed from this demo session.');
  }

  function openStep(kind: CaptureKind) {
    setNotice('');
    setStep(kind);
  }

  const recording = recordState === 'recording';
  const requesting = recordState === 'requesting';
  const busy = recording || requesting || recordState === 'stopping';
  const photoCount = items.filter(item => item.kind === 'photo').length;
  const voiceCount = items.filter(item => item.kind === 'voice').length;
  const fileCount = items.filter(item => item.kind === 'file').length;

  return <div className="ocd-root">
    <div className="ocd-copy">
      <p className="oj-kicker">Ways to capture</p>
      <h1>Some moments need more than words.</h1>
      <p className="oj-lead">Write it, record it, photograph it or keep the files that matter.</p>
    </div>

    <div className="ocd-actions" aria-label="Choose a way to capture">
      <div className="ocd-text-tile" aria-label="Text, already shown in your first entry">
        <span className="oj-icon-well sage"><Pencil size={19} /></span><b>Text</b><small>Your first entry</small>
      </div>
      <button className={`ocd-tile ${recording ? 'is-recording' : ''}`} type="button" onClick={() => openStep('voice')} disabled={busy}>
        <span className="oj-icon-well sage"><Mic size={19} /></span><b>Voice</b><small>{voiceCount ? `${voiceCount} added` : 'Record a voice note'}</small>
      </button>
      <button className="ocd-tile" type="button" onClick={() => openStep('photo')} disabled={busy}>
        <span className="oj-icon-well sage"><ImageIcon size={19} /></span><b>Photo</b><small>{photoCount ? `${photoCount} added` : 'Choose a photo'}</small>
      </button>
      <button className="ocd-tile" type="button" onClick={() => openStep('file')} disabled={busy}>
        <span className="oj-icon-well sage"><FileText size={19} /></span><b>Files</b><small>{fileCount ? `${fileCount} added` : 'Choose a file'}</small>
      </button>
    </div>

    {busy && <div className={`ocd-recording ${recording ? 'is-active' : ''}`} role="status" aria-live="polite">
      {recording ? <><span className="ocd-live-dot" /><AudioLines size={18} /><span className="ocd-pulse-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span><b>Recording · {formatDuration(recordingMs)}</b><button type="button" onClick={() => audio.current?.stop()}><Square size={14} fill="currentColor" /> Stop and save</button></> : <><span className="ocd-spinner" />{requesting ? 'Waiting for microphone permission…' : 'Finishing your voice note…'}{requesting && <button type="button" onClick={() => audio.current?.cancel()}>Cancel</button>}</>}
    </div>}

    <article className="oj-evidence-card ocd-note-card">
      <span className="oj-card-top">Today <small><span className="ocd-tag">SAMPLE</span> Example record</small></span>
      <div className="ocd-sample-row" aria-label="Sample photo, audio note, and PDF">
        <div className="ocd-sample-photo"><ImageIcon size={16} /><span>Sample<br />photo</span></div>
        <div className="ocd-sample-audio"><span className="ocd-play-mark"><Play size={12} fill="currentColor" /></span><span className="oj-wave">▂▅▃▇▅▂▆</span><small>0:38 · sample</small></div>
        <div className="ocd-sample-file"><FileText size={17} /><b>Letter.pdf</b><small>320 KB · sample</small></div>
      </div>
      <p>{SAMPLE_NOTE}</p>
      <span className="ocd-divider" />
      <div className="ocd-capture-heading"><span><Paperclip size={14} /> Your captures</span><small>Only on this screen</small></div>
      {items.length === 0 ? <p className="ocd-empty">Choose a photo, record a voice note or add a file to see it here.</p> : <ul className="ocd-capture-list">
        {items.map(item => <li key={item.id}>
          {item.kind === 'photo' ? <img src={item.url} alt="Your captured photo" /> : item.kind === 'voice' ? <span className="ocd-capture-kind"><AudioLines size={16} /></span> : <span className="ocd-capture-kind"><FileText size={16} /></span>}
          <span className="ocd-capture-info"><b>{item.name}</b><small><span className="ocd-tag ocd-tag-user">YOUR CAPTURE</span>{item.kind === 'voice' ? ` ${formatDuration(item.durationMs ?? 0)} voice note` : ` ${formatBytes(item.blob.size)}`}</small></span>
          {item.kind === 'voice' && <audio controls preload="none" src={item.url} aria-label={`${item.name} playback`} />}
          <button className="ocd-remove" type="button" onClick={() => removeItem(item)} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button>
        </li>)}
      </ul>}
    </article>

    <p className="oj-note ocd-boundary"><ShieldCheck size={17} /><span>Samples are fictional examples. Your captures stay in memory for this visit; leaving this screen clears them. Nothing is uploaded or saved to your journal.</span></p>
    {notice && <p className="ocd-notice" role="status" aria-live="polite">{notice}</p>}

    {step && <div className="ocd-step-scrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !requesting) setStep(null); }}>
      <section className="ocd-step" role="dialog" aria-modal="true" aria-labelledby="ocd-step-title">
        <button type="button" className="ocd-step-close" onClick={() => { if (requesting) audio.current?.cancel(); setStep(null); }} aria-label="Close capture explanation"><X size={18} /></button>
        <span className="oj-icon-well sage">{step === 'photo' ? <ImageIcon size={20} /> : step === 'voice' ? <Mic size={20} /> : <FileText size={20} />}</span>
        <p className="oj-kicker">Before you {step === 'voice' ? 'record' : 'choose'}</p>
        <h2 id="ocd-step-title">{step === 'photo' ? 'Choose a photo' : step === 'voice' ? 'Record a voice note' : 'Choose a file'}</h2>
        <p>{step === 'photo' ? 'LuLu will open your photo picker only after you choose to continue. Select one photo to add to this sample note.' : step === 'voice' ? 'Your device may ask for microphone access when recording starts. Nothing is recorded until you choose the button below.' : 'Choose a document from your device. The file picker opens only after you continue.'}</p>
        {step === 'voice' && recording && <p className="ocd-dialog-status"><span className="ocd-live-dot" />Recording · {formatDuration(recordingMs)}</p>}
        <button className="oj-primary ocd-step-primary" type="button" disabled={busy} onClick={() => {
          if (step === 'photo') void choosePhoto();
          else if (step === 'file') fileInput.current?.click();
          else { setStep(null); setRecordingMs(0); setNotice(''); void audio.current?.start(); }
        }}>
          {step === 'photo' ? <><Upload size={17} />Choose photo</> : step === 'voice' ? <><Mic size={17} />Request microphone &amp; record</> : <><Upload size={17} />Choose file</>}
        </button>
        <button className="ocd-step-cancel" type="button" onClick={() => { if (requesting) audio.current?.cancel(); setStep(null); }}>Not now</button>
      </section>
    </div>}

    <input ref={photoInput} className="ocd-hidden-input" type="file" accept="image/*" aria-label="Choose a photo" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; addSelectedFile(file, 'photo'); }} />
    <input ref={fileInput} className="ocd-hidden-input" type="file" aria-label="Choose a file" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; addSelectedFile(file, 'file'); }} />
  </div>;
}

export default OnboardingCaptureDemo;

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
