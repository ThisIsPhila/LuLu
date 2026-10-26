import { useLayoutEffect, useRef, useState } from 'react';
import { Image, Mic, Square } from 'lucide-react';
import { MAX_MEDIA_BYTES, type LocalMediaVault } from '../services/vault/localMediaVault';
import type { AudioCaptureController, AudioCaptureState } from '../services/mediaCapture';
import { captureNativeImage } from '../platform/nativeCapture';
import { createPlatformAudioCapture as createAudioAdapter } from '../platform/nativeAudio';
import { isNativePlatform } from '../platform/runtime';

type Pending = { blob: Blob; mediaId: string; source: 'file' | 'camera' | 'microphone'; durationMs?: number; sha256?: string; originalName?: string };

/** Reuses the writing-card tools. Media never enters ordinary journal state. */
export function PrivateMediaCapture({ vault }: { vault: LocalMediaVault }) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  const operation = useRef(0);
  const retained = useRef<Pending | null>(null);
  const recorder = useRef<AudioCaptureController | null>(null);
  const [state, setState] = useState<AudioCaptureState>('idle');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [retryable, setRetryable] = useState(false);

  async function persist(pending: Pending) {
    const token = ++operation.current;
    retained.current = pending;
    setSaving(true);setRetryable(false);setMessage('Saving encrypted media…');
    try {
      if (pending.blob.size < 1 || pending.blob.size > MAX_MEDIA_BYTES) throw new RangeError('Capture size is outside the supported limit.');
      pending.sha256 ??= Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await pending.blob.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
      if (!active.current || operation.current !== token) return;
      try {
        await vault.put(pending.blob, { mediaId: pending.mediaId, source: pending.source, ...(pending.durationMs === undefined ? {} : {durationMs:pending.durationMs}), ...(pending.originalName ? {originalName:pending.originalName} : {}) });
      } catch (error) {
        // Reconcile an exact original after a lost acknowledgement; do not create a duplicate.
        const existing = await vault.get(pending.mediaId).catch(() => null);
        if (!existing || existing.metadata.sha256 !== pending.sha256 || existing.metadata.byteLength !== pending.blob.size) throw error;
      }
      if (active.current && operation.current === token) {
        retained.current = null;setMessage('Media saved encrypted on this device. Open Private writing to view it.');
      }
    } catch (error) {
      if (active.current && operation.current === token) {
        if (error instanceof TypeError || error instanceof RangeError) {
          retained.current=null;setMessage('Choose a supported image or audio capture between 1 byte and 25 MB.');setRetryable(false);
        } else {
          setMessage('Media could not be saved. Keep this page open and retry; leaving will discard this unsaved capture.');setRetryable(true);
        }
      }
    } finally { if (active.current && operation.current === token) setSaving(false); }
  }

  useLayoutEffect(() => {
    active.current = true;
    const capture = createAudioAdapter({
      onState: update => { if (active.current) {setState(update.state);if (update.message) setMessage(update.message);} },
      onCaptured: (blob, metadata) => {
        if (active.current) void persist({blob,mediaId:crypto.randomUUID(),source:'microphone',durationMs:metadata.durationMs});
      },
    });
    recorder.current = capture;
    return () => { active.current=false;operation.current++;retained.current=null;capture.cancel();if(recorder.current===capture)recorder.current=null; };
  }, [vault]);

  const recording = state === 'recording';
  const requesting = state === 'requesting';
  const occupied = saving || retryable || state === 'stopping';
  async function captureImage() {
    try {
      const image = await captureNativeImage();
      if (image) await persist({blob:image.blob,mediaId:crypto.randomUUID(),source:'camera'});
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) return;
      setMessage('The camera could not capture an image. Check camera permission and try again.');
    }
  }
  return <div className="private-media-capture">
    <div className="card-bottom-shelf">
      <div className="shelf-tools">
        <button type="button" className="shelf-tool-btn" aria-label="Capture or choose a private image" title="Image" disabled={occupied || recording || requesting} onClick={()=>isNativePlatform()?void captureImage():input.current?.click()}><Image size={15}/></button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" capture="environment" hidden onChange={event=>{
          const file=event.currentTarget.files?.[0];event.currentTarget.value='';
          if(file)void persist({blob:file,mediaId:crypto.randomUUID(),source:'file',originalName:file.name});
        }}/>
        <button type="button" className="shelf-tool-btn" disabled={occupied} title={recording?'Stop recording':'Microphone'}
          aria-label={recording?'Stop and save private audio':requesting?'Cancel microphone request':'Record private audio'}
          onClick={()=>{if(recording)recorder.current?.stop();else if(requesting)recorder.current?.cancel();else {setMessage('');void recorder.current?.start();}}}>
          {recording?<Square size={15}/>:<Mic size={15}/>}</button>
      </div>
    </div>
    <p className="private-journal-note" role={retryable?'alert':'status'} aria-live="polite">{recording?'Recording audio. Tap Stop to save; leaving discards the recording. Stops after about 60 seconds.':requesting?'Waiting for microphone permission…':message || 'Images and audio stay encrypted in this device’s private storage. Maximum 25 MB per capture. Back up saved records manually.'}</p>
    {retryable && <button type="button" className="private-draft-retry" onClick={()=>{const pending=retained.current;if(pending)void persist(pending);}}>Retry media save</button>}
  </div>;
}
