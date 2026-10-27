import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Mic, Square, X } from 'lucide-react';
import { MAX_MEDIA_BYTES } from '../services/vault/localMediaVault';
import { createPrivateCaptureWriter } from '../services/privateQuickCapture';
import { createPlatformAudioCapture } from '../platform/nativeAudio';
import type { AudioCaptureController, AudioCaptureState } from '../services/mediaCapture';
import { captureNativeImage } from '../platform/nativeCapture';
import { isNativePlatform } from '../platform/runtime';
import type { LuQuickAction } from './LuOrb';
import './PrivateQuickCapture.css';

type Mode = Exclude<LuQuickAction, 'private-content'>;
type Props = { mode: Mode; uid: string; isAccountActive: () => boolean; onClose: () => void };

/** Only new records are written here; the UI never receives a vault or reads previous records. */
export function PrivateQuickCapture({ mode, uid, isAccountActive, onClose }: Props) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [audioState, setAudioState] = useState<AudioCaptureState>('idle');
  const active = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<AudioCaptureController | null>(null);
  const writer = createPrivateCaptureWriter(uid, isAccountActive);

  async function saveMedia(blob: Blob, source: 'camera' | 'file' | 'microphone', originalName?: string, durationMs?: number) {
    setBusy(true);setStatus('Saving…');
    try {
      if (!blob.size || blob.size > MAX_MEDIA_BYTES) throw new Error('Choose a file up to 25 MB.');
      await writer.media(blob, {source, ...(originalName ? {originalName} : {}), ...(durationMs === undefined ? {} : {durationMs})});
      if (active.current) setStatus('Saved. Open your private space with your passkey to view it.');
    } catch (error) { if (active.current) setStatus(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
    finally { if (active.current) setBusy(false); }
  }
  useEffect(() => {
    active.current = true;
    const capture = createPlatformAudioCapture({
      onState: value => { if(active.current){setAudioState(value.state);if(value.message)setStatus(value.message);} },
      onCaptured: (blob, metadata) => {if(active.current) void saveMedia(blob, 'microphone', undefined, metadata.durationMs);},
    });
    recorder.current = capture;
    return () => { active.current=false;capture.cancel();recorder.current=null; };
  }, [uid]);
  async function saveText() {
    if (!text.trim() || busy) return;
    setBusy(true);setStatus('Saving…');
    try { await writer.text(text); if(active.current){setText('');setStatus('Saved. Open your private space with your passkey to read it.');} }
    catch(error){if(active.current)setStatus(error instanceof Error ? error.message : 'Could not save. Please try again.');}
    finally{if(active.current)setBusy(false);}
  }
  async function chooseImage() {
    if (!isNativePlatform()) {fileInput.current?.click();return;}
    try {const image=await captureNativeImage(mode === 'camera' ? 'camera' : 'photos');if(image)await saveMedia(image.blob,mode === 'camera' ? 'camera' : 'file');}
    catch(error){if(active.current && !(error instanceof Error && /cancel/i.test(error.message)))setStatus('Could not open the camera or photo library.');}
  }
  const title = mode === 'dictate' ? 'Capture a thought' : mode === 'record' ? 'Record a voice note' : mode === 'camera' ? 'Take a photo' : 'Add a photo';
  return <div className="private-quick-backdrop"><section className="private-quick-card" role="dialog" aria-modal="true" aria-labelledby="private-quick-title">
    <header><span>LU · QUICK CAPTURE</span><button type="button" disabled={busy} onClick={onClose} aria-label="Close capture"><X size={20}/></button></header>
    <h2 id="private-quick-title">{title}</h2>
    {mode === 'dictate' && <><p>Use your keyboard’s microphone to dictate, or type your thought.</p><textarea aria-label="Your thought" value={text} maxLength={50000} onChange={event=>setText(event.target.value)} placeholder="Begin here…"/><button type="button" className="private-quick-primary" disabled={busy || !text.trim()} onClick={()=>void saveText()}>Save thought</button></>}
    {mode === 'record' && <><p>Start when you’re ready. Your recording stays on this device.</p><button type="button" className="private-quick-primary" disabled={busy || audioState === 'stopping'} onClick={()=>{if(audioState==='recording')recorder.current?.stop();else if(audioState==='requesting')recorder.current?.cancel();else void recorder.current?.start();}}>{audioState==='recording'?<><Square size={18}/> Stop and save</>:audioState==='requesting'?'Cancel microphone request':<><Mic size={18}/> Start recording</>}</button></>}
    {(mode === 'camera' || mode === 'upload') && <><p>Choose an image to save in your private space.</p><button type="button" className="private-quick-primary" disabled={busy} onClick={()=>void chooseImage()}>{mode==='camera'?<Camera size={18}/>:<ImagePlus size={18}/>} {mode==='camera'?'Open camera':'Choose photo'}</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" capture={mode==='camera'?'environment':undefined} hidden onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)void saveMedia(file,mode==='camera'?'camera':'file',mode==='upload'?file.name:undefined);}} /></>}
    <p className="private-quick-status" role="status">{audioState==='recording'?'Recording… Tap stop to save. Closing discards this recording.':status}</p>
    <p className="private-quick-note">Saved encrypted on this device. Your passkey is required to open saved private content.</p>
  </section></div>;
}
