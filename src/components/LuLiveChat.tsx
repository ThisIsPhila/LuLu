import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Mic, MicOff, Phone, Radio, ShieldCheck } from 'lucide-react';
import { request } from '../services/backend/request';
import { waitForLocalIceSdp } from '../services/liveWebrtc';
import type { LuAgentAction, LuSurfaceReference } from '../services/luChatContracts';
import { LuActivity } from './LuActivity';
import './LuLiveChat.css';

type Bubble = { speaker: 'You'|'Lu'; text: string };
type LiveAnswer = { sessionId: string; answer: string; expiresAt: number; voiceSecondsRemaining: number|null };
type LiveToolResult = { output: unknown; action: LuAgentAction|null; references: LuSurfaceReference[] };
type LiveEvent = { type?: string; delta?: unknown; transcript?: unknown; item?: unknown; event?: unknown; response?: unknown };

export function LuLiveChat({ onAgentAction, onVoiceAccessRefresh }: { onAgentAction?: (action: LuAgentAction) => void; onVoiceAccessRefresh?: () => void }) {
  const [status, setStatus] = useState('Ready when you are');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioNeedsTap, setAudioNeedsTap] = useState(false);
  const [voiceSecondsRemaining, setVoiceSecondsRemaining] = useState<number|null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [references, setReferences] = useState<LuSurfaceReference[]>([]);
  const connection = useRef<RTCPeerConnection|null>(null);
  const stream = useRef<MediaStream|null>(null);
  const channel = useRef<RTCDataChannel|null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const currentUserTranscript = useRef('');
  const sessionId = useRef('');
  const sessionTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const readyTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const closingRequest = useRef(false);
  const IDLE_PAUSE_MS = 60_000;

  function addTranscript(speaker: Bubble['speaker'], delta: string) {
    setBubbles(current => {
      const last = current.at(-1);
      return last?.speaker === speaker
        ? [...current.slice(0,-1), { speaker, text: last.text + delta }]
        : [...current, { speaker, text: delta }];
    });
  }
  function setFinalUserTranscript(transcript: string) {
    currentUserTranscript.current = transcript;
    setBubbles(current => {
      const last = current.at(-1);
      return last?.speaker === 'You'
        ? [...current.slice(0,-1), { speaker:'You', text:transcript }]
        : [...current, { speaker:'You', text:transcript }];
    });
  }
  function finalizeClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (readyTimer.current) clearTimeout(readyTimer.current);
    closeTimer.current = null;
    readyTimer.current = null;
    closingRequest.current = false;
    const endedSessionId=sessionId.current;
    generation.current++;
    channel.current?.close(); channel.current = null;
    connection.current?.close(); connection.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (audio.current) audio.current.srcObject = null;
    sessionId.current = '';
    if(endedSessionId)void request('/lu/live/end',{sessionId:endedSessionId}).catch(()=>{}).finally(()=>onVoiceAccessRefresh?.());
    if (alive.current) { setConnected(false); setBusy(false); setClosing(false); setMuted(false); setAudioNeedsTap(false); }
  }
  function close(sendClose = true) {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (readyTimer.current) clearTimeout(readyTimer.current);
    sessionTimer.current = null;
    idleTimer.current = null;
    readyTimer.current = null;
    if (sendClose && sessionId.current && channel.current?.readyState === 'open') {
      if (closingRequest.current) return;
      closingRequest.current = true;
      if (alive.current) { setBusy(true); setClosing(true); setStatus('Ending conversation…'); }
      try { channel.current.send(JSON.stringify({ type:'session.close' })); }
      catch { finalizeClose(); return; }
      // Stop collecting microphone audio immediately while the data channel
      // remains open long enough to receive the provider's close confirmation.
      stream.current?.getAudioTracks().forEach(track=>track.stop());
      stream.current = null;
      // Give GPT-Live time to confirm session.closed before closing the data
      // channel. A timeout still tears down the microphone and settles usage.
      closeTimer.current=setTimeout(()=>{
        if(alive.current)setStatus('The voice service did not confirm that it closed. The microphone is stopped; refresh your allowance shortly.');
        finalizeClose();
      },15_000);
      return;
    }
    finalizeClose();
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; close(); }; }, []);

  async function runFunction(itemValue: unknown, attempt: number) {
    if (!itemValue || typeof itemValue !== 'object') return;
    const item = itemValue as { type?:unknown; name?:unknown; arguments?:unknown; call_id?:unknown };
    if (item.type !== 'function_call' || typeof item.name !== 'string' || typeof item.arguments !== 'string' || typeof item.call_id !== 'string') return;
    if (attempt !== generation.current || !sessionId.current || closingRequest.current) return;
    setStatus(item.name === 'search_surface_entries' ? 'Lu is searching your writing…' : 'Lu is working in LuLu…');
    setBusy(true);
    let output: unknown = { error:'Lu could not complete that app action.' };
    try {
      const args: unknown = JSON.parse(item.arguments);
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid action request.');
      const result = await request<LiveToolResult>('/lu/live/action', {
        sessionId:sessionId.current,
        name:item.name,
        arguments:args,
        transcript:currentUserTranscript.current,
      });
      output = result.output;
      if (result.references.length) setReferences(result.references);
      if (result.action) onAgentAction?.(result.action);
    } catch (error) {
      output = { error:error instanceof Error ? error.message : 'Lu could not complete that app action.' };
    }
    const dataChannel = channel.current;
    if (attempt === generation.current && dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type:'response.item.create', item:{ type:'function_call_output', call_id:item.call_id, output:JSON.stringify(output) } }));
      dataChannel.send(JSON.stringify({ type:'response.create' }));
    }
    if (alive.current && attempt === generation.current) { setBusy(false); setStatus('Listening'); }
  }
  function armIdlePause(attempt:number) {
    if(idleTimer.current)clearTimeout(idleTimer.current);
    idleTimer.current=setTimeout(()=>{
      if(attempt!==generation.current||!sessionId.current)return;
      close();
      setStatus('Paused after one minute without speech. Your chat is kept here. Tap “Continue talking” to resume.');
    },IDLE_PAUSE_MS);
  }
  function handleEvent(eventValue: unknown, attempt: number) {
    if (!eventValue || typeof eventValue !== 'object' || attempt !== generation.current) return;
    const data = eventValue as LiveEvent;
    if (data.type === 'session.started') { if(readyTimer.current)clearTimeout(readyTimer.current);readyTimer.current=null;setConnected(true);setBusy(false);setStatus('Listening');armIdlePause(attempt);return; }
    if (data.type === 'session.closed') { const closeWasRequested=closingRequest.current; close(false); if(!closeWasRequested)setStatus('Conversation ended'); return; }
    if (data.type === 'error') { setBusy(false);setStatus('The voice service reported an error. End this conversation and reconnect to Lu.');return; }
    if (data.type === 'session.input_audio_buffer.speech_started' || data.type === 'input_audio_buffer.speech_started') {currentUserTranscript.current = '';if(idleTimer.current)clearTimeout(idleTimer.current);return;}
    if (data.type === 'session.input_audio_buffer.speech_stopped' || data.type === 'input_audio_buffer.speech_stopped') {armIdlePause(attempt);return;}
    if (data.type === 'session.input_transcript.delta' && typeof data.delta === 'string') {
      currentUserTranscript.current += data.delta; addTranscript('You', data.delta); if(idleTimer.current)clearTimeout(idleTimer.current); return;
    }
    if (data.type === 'session.input_transcript.done' && typeof data.transcript === 'string') { setFinalUserTranscript(data.transcript);armIdlePause(attempt);return; }
    if (data.type === 'session.output_transcript.delta' && typeof data.delta === 'string') { addTranscript('Lu', data.delta);armIdlePause(attempt);return; }
    const nested = data.type === 'response.event' && data.event && typeof data.event === 'object' ? data.event as LiveEvent : data;
    if (nested.type === 'error' || nested.type === 'response.failed') { setBusy(false);setStatus('Lu could not complete that voice request. Please try again.');return; }
    if (nested.type === 'response.output_item.done' && nested.item) void runFunction(nested.item, attempt);
  }

  async function start() {
    if (busy || connected) return;
    setBusy(true); setReferences([]); setStatus('Connecting to Lu…'); const attempt = ++generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio:true });
      if (attempt !== generation.current) { media.getTracks().forEach(track=>track.stop()); return; }
      stream.current = media;
      const peer = new RTCPeerConnection(); connection.current = peer;
      peer.ontrack = event => { if (audio.current) { audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track]); void audio.current.play().then(()=>setAudioNeedsTap(false)).catch(()=>{setAudioNeedsTap(true);setStatus('Lu’s voice is ready. Tap “Play Lu’s voice” to hear it.');}); } };
      media.getAudioTracks().forEach(track=>peer.addTrack(track,media));
      const events = peer.createDataChannel('oai-events'); channel.current = events;
      events.onmessage = event => { try { handleEvent(JSON.parse(String(event.data)),attempt); } catch { /* Ignore malformed provider event payloads. */ } };
      events.onclose = () => { if (attempt === generation.current) { close(false); setStatus('Conversation disconnected'); } };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const completedOfferSdp = await waitForLocalIceSdp(peer);
      const history=bubbles.slice(-12).map(({speaker,text})=>({speaker,text:text.slice(-2000)}));
      const result = await request<LiveAnswer>('/lu/live',{offer:completedOfferSdp,history});
      if (attempt !== generation.current) { void request('/lu/live/end',{sessionId:result.sessionId}).catch(()=>{}).finally(()=>onVoiceAccessRefresh?.());return; }
      sessionId.current = result.sessionId;
      if(typeof result.voiceSecondsRemaining==='number')setVoiceSecondsRemaining(result.voiceSecondsRemaining);
      const remaining = Math.max(1,result.expiresAt-Date.now());
      sessionTimer.current = setTimeout(()=>{if(attempt===generation.current){close();setStatus('Your voice time for this session has ended. Start another conversation when your allowance refills.');}},remaining);
      readyTimer.current=setTimeout(()=>{if(attempt===generation.current&&sessionId.current){close();setStatus('The voice service did not confirm the conversation. Check your connection and try again.');}},20_000);
      await peer.setRemoteDescription({type:'answer',sdp:result.answer});
    } catch (error) {
      if (attempt !== generation.current) return;
      close(); setStatus(error instanceof Error ? error.message : 'Could not start voice.');
    }
  }
  function toggleMute() { const next=!muted; setMuted(next); stream.current?.getAudioTracks().forEach(track=>track.enabled=!next); }
  async function playLuVoice() {
    try {
      await audio.current?.play();
      setAudioNeedsTap(false);
      setStatus(connected?'Listening':'Ready when you are');
    } catch {
      setStatus('Audio is still blocked. Check your device’s sound settings, then try again.');
    }
  }

  return <section className="lu-live-chat" aria-label="Live conversation with Lu">
    <aside className="lu-live-disclosure"><ShieldCheck size={18}/><span><strong>Cloud voice demo · GPT-Live + GPT-6 Luna</strong><small>GPT-Live receives your audio directly and may hear personal details. Lu’s GPT-6 Luna backend can search scrubbed excerpts from ordinary Journal and Story entries and carry out app actions you request. Protected private writing is never available to its tools. After one minute without speech the microphone session pauses; recent chat text is sent again if you choose to continue.</small></span></aside>
    <div className="lu-live-stage"><div className={`lu-live-orb${connected?' is-listening':''}${busy?' is-connecting':''}`} aria-hidden="true"><span>Lu</span></div><strong className="lu-live-status" role="status">{busy||connected?<LuActivity state={busy?'connecting':'listening'} label={status}/>:status}</strong><span className="lu-live-hint">{connected?'Speak naturally. Lu can use the app tools while you talk.':'Start a conversation with Lu about using the app.'}</span>{voiceSecondsRemaining!==null&&<small className="lu-live-allowance">Judge voice allowance: {Math.floor(voiceSecondsRemaining/60)}m {String(voiceSecondsRemaining%60).padStart(2,'0')}s remaining</small>}</div>
    <div className="lu-live-thread" aria-label="Conversation" aria-live="polite">{bubbles.map((bubble,index)=><article className={`lu-live-bubble is-${bubble.speaker==='You'?'you':'lu'}`} key={index}><small>{bubble.speaker}</small><p>{bubble.text}</p></article>)}
      {references.map(reference=><article className="lu-live-reference" key={reference.reference}><small>{reference.kind} · {reference.reference.replace('_',' ')}</small><strong>{reference.title||'Untitled entry'}</strong><p>{reference.content}</p><button type="button" onClick={()=>onAgentAction?.({kind:'open-entry',entryId:reference.entryId})}><ExternalLink size={14}/>Open entry</button></article>)}
    </div>
    <div className="lu-live-controls">{connected?<><button type="button" className="lu-live-secondary" disabled={closing} onClick={toggleMute}>{muted?<MicOff size={19}/>:<Mic size={19}/>}<span>{muted?'Unmute':'Mute'}</span></button>{audioNeedsTap&&<button type="button" className="lu-live-secondary" disabled={closing} onClick={()=>void playLuVoice()}><Radio size={19}/><span>Play Lu’s voice</span></button>}<button type="button" className="lu-live-end" disabled={closing} onClick={()=>close()}><Phone size={19}/><span>{closing?'Ending…':'End conversation'}</span></button></>:<button type="button" className="lu-live-start" disabled={busy} onClick={()=>void start()}>{busy?<Radio size={19}/>:<Mic size={19}/>}<span>{busy?'Connecting…':bubbles.length?'Continue talking':'Start talking'}</span></button>}</div>
    <audio ref={audio} autoPlay playsInline className="lu-live-audio" aria-hidden="true" />
  </section>;
}
