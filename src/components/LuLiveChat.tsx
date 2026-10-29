import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ExternalLink, LoaderCircle, Mic, MicOff, Phone, Radio, ShieldCheck } from 'lucide-react';
import { request } from '../services/backend/request';
import { waitForLocalIceSdp } from '../services/liveWebrtc';
import type { LuAgentAction, LuSurfaceReference } from '../services/luChatContracts';
import { createLuConversationId, saveLuConversation, type LuSavedConversation, type LuSavedMessage, type LuToolEvent } from '../services/luConversationHistory';
import './LuLiveChat.css';

type Bubble = { speaker: 'You'|'Lu'; text: string; references?: LuSurfaceReference[] };
type LiveAnswer = { sessionId: string; answer: string; expiresAt: number; voiceSecondsRemaining: number|null };
type LiveToolResult = { output: unknown; action: LuAgentAction|null; references: LuSurfaceReference[] };
type LiveEvent = { type?: string; delta?: unknown; transcript?: unknown; item?: unknown; event?: unknown; response?: unknown };

export function LuLiveChat({ accountId, conversationId, savedConversation, onConversationChange, onSessionStateChange, onActivityChange, onAgentAction, onVoiceAccessRefresh, autoStart = false, startRequestId = 0, stopRequestId = 0, initialMediaStream = null, startError = '' }: { accountId: string; conversationId: string; savedConversation?: LuSavedConversation; onConversationChange: (conversation:LuSavedConversation)=>void; onSessionStateChange: (active:boolean)=>void; onActivityChange: (activity:string|null)=>void; onAgentAction?: (action: LuAgentAction) => boolean|void; onVoiceAccessRefresh?: () => void; autoStart?: boolean; startRequestId?: number; stopRequestId?: number; initialMediaStream?: MediaStream | null; startError?: string }) {
  const [status, setStatus] = useState('Ready when you are');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioNeedsTap, setAudioNeedsTap] = useState(false);
  const [voiceSecondsRemaining, setVoiceSecondsRemaining] = useState<number|null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(()=>savedConversation?.messages.map(message=>({speaker:message.speaker,text:message.text,references:message.references}))??[]);
  const [references, setReferences] = useState<LuSurfaceReference[]>(()=>savedConversation?.messages.flatMap(message=>message.references??[])??[]);
  const [toolEvents, setToolEvents] = useState<LuToolEvent[]>(()=>savedConversation?.messages.flatMap(message=>message.tools??[])??[]);
  const [sessionActive,setSessionActive]=useState(false);
  const connection = useRef<RTCPeerConnection|null>(null);
  const stream = useRef<MediaStream|null>(null);
  const channel = useRef<RTCDataChannel|null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const currentUserTranscript = useRef('');
  const sessionId = useRef('');
  const sessionTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const readyTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const closingRequest = useRef(false);
  const startRequestSeen = useRef(0);
  const stopRequestSeen = useRef(0);
  const onConversationChangeRef=useRef(onConversationChange);
  const onSessionStateChangeRef=useRef(onSessionStateChange);
  const onActivityChangeRef=useRef(onActivityChange);
  onConversationChangeRef.current=onConversationChange;
  onSessionStateChangeRef.current=onSessionStateChange;
  onActivityChangeRef.current=onActivityChange;
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
    if (alive.current) { setConnected(false); setSessionActive(false); setBusy(false); setClosing(false); setMuted(false); setAudioNeedsTap(false); }
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
  useEffect(() => {
    if (!autoStart || !startRequestId || startRequestSeen.current===startRequestId) return;
    startRequestSeen.current=startRequestId;
    if (!initialMediaStream) { setStatus(startError || 'Waiting for microphone permission…'); return; }
    void start(initialMediaStream);
  }, [autoStart, startRequestId, initialMediaStream, startError]);
  useEffect(()=>{
    if(!stopRequestId||stopRequestSeen.current===stopRequestId)return;
    stopRequestSeen.current=stopRequestId;
    close();
  },[stopRequestId]);
  useEffect(() => {
    if (startError) { setBusy(false); setStatus(startError); }
  }, [startError]);
  useEffect(()=>{onSessionStateChangeRef.current(sessionActive);},[sessionActive]);
  useEffect(()=>{onActivityChangeRef.current(busy||sessionActive?status:null);},[busy,sessionActive,status]);
  useEffect(()=>{
    const saved= savedConversation?.messages??[];
    setBubbles(saved.map(message=>({speaker:message.speaker,text:message.text,references:message.references})));
    setReferences(saved.flatMap(message=>message.references??[]));
    setToolEvents(saved.flatMap(message=>message.tools??[]));
  // A new session id resets the timeline once; updates to the saved list do not.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[conversationId]);
  useEffect(()=>{
    if(!bubbles.length)return;
    const timer=window.setTimeout(()=>{
      const messages:LuSavedMessage[]=bubbles.map((bubble,index)=>{
        const saved:LuSavedMessage={speaker:bubble.speaker,text:bubble.text,references:bubble.references};
        if(index===bubbles.length-1&&toolEvents.length)saved.tools=toolEvents;
        return saved;
      });
      const first=bubbles.find(bubble=>bubble.speaker==='You');
      const conversation:LuSavedConversation={id:conversationId,mode:'voice',title:(first?.text??'Voice conversation').replace(/\s+/gu,' ').slice(0,72),updatedAt:Date.now(),messages};
      void saveLuConversation(accountId,conversation).then(()=>onConversationChangeRef.current(conversation)).catch(()=>setStatus('Conversation could not be saved on this device.'));
    },450);
    return ()=>window.clearTimeout(timer);
  },[accountId,conversationId,bubbles,toolEvents]);

  useEffect(()=>{
    const container=thread.current;
    if(container)container.scrollTop=container.scrollHeight;
  },[bubbles,toolEvents,references,busy]);

  async function runFunction(itemValue: unknown, attempt: number) {
    if (!itemValue || typeof itemValue !== 'object') return;
    const item = itemValue as { type?:unknown; name?:unknown; arguments?:unknown; call_id?:unknown };
    if (item.type !== 'function_call' || typeof item.name !== 'string' || typeof item.arguments !== 'string' || typeof item.call_id !== 'string') return;
    if (attempt !== generation.current || !sessionId.current || closingRequest.current) return;
    const toolLabel=item.name==='search_surface_entries'?'Search Journal and Stories':item.name==='create_draft'?'Prepare a draft':item.name==='open_entry'?'Open entry':'Navigate in LuLu';
    const toolId=typeof item.call_id==='string'?item.call_id:createLuConversationId();
    setToolEvents(current=>[...current,{id:toolId,label:toolLabel,state:'running'}]);
    setStatus(item.name === 'search_surface_entries' ? 'Searching Journal and Stories…' : 'Working in LuLu…');
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
      const actionAccepted=result.action?onAgentAction?.(result.action)!==false:true;
      const outputError=!!output&&typeof output==='object'&&'error' in output;
      const detail=!actionAccepted?'Lu could not open this while the current screen has unfinished work.':result.references.length?`Found ${result.references.length} scrubbed excerpt${result.references.length===1?'':'s'}.`:result.action?.kind==='create-draft'?`“${result.action.title}” is ready for your review; it has not been saved.`:result.action?.kind==='navigate'?`Opened ${result.action.destination} in LuLu.`:result.action?.kind==='open-entry'?'Opened the entry you asked for.':outputError?String((output as {error:unknown}).error):'LuLu action completed.';
      setToolEvents(current=>current.map(event=>event.id===toolId?{...event,state:!actionAccepted||outputError?'failed':'done',detail,action:result.action??undefined}:event));
    } catch (error) {
      output = { error:error instanceof Error ? error.message : 'Lu could not complete that app action.' };
      setToolEvents(current=>current.map(event=>event.id===toolId?{...event,state:'failed',detail:output&&typeof output==='object'&&'error'in output?String((output as {error:unknown}).error):'Action failed.'}:event));
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
    if (data.type === 'session.started') { if(readyTimer.current)clearTimeout(readyTimer.current);readyTimer.current=null;setConnected(true);setSessionActive(true);setBusy(false);setStatus('Listening');armIdlePause(attempt);return; }
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

  async function start(preparedStream?: MediaStream) {
    if (busy || connected) return;
    setBusy(true); setReferences([]); setStatus('Connecting to Lu…'); const attempt = ++generation.current;
    try {
      const media = preparedStream ?? await navigator.mediaDevices.getUserMedia({ audio:true });
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
    <aside className="lu-live-disclosure"><ShieldCheck size={18}/><span><strong>Cloud voice demo</strong><small>Your audio goes directly to OpenAI and may contain personal details. Lu can search scrubbed ordinary entries, navigate LuLu, open entries and prepare drafts. Protected private writing is unavailable.</small></span></aside>
    <div className="lu-live-stage"><span className={`lu-live-character-status${status.toLowerCase().includes('error')||status.toLowerCase().includes('could not')?' is-error':''}`} role="status"><span className="lu-orb-status-dot" aria-hidden="true"/>{status}</span><div className={`lu-live-visualizer${connected?' is-listening':''}${busy?' is-working':''}`} aria-hidden="true">{Array.from({length: nineBars},(_,index)=><i key={index} style={{'--bar':index} as CSSProperties}/>)}</div><span className="lu-live-hint">{connected?'Speak naturally. The transcript and Lu’s app actions appear here.':'Double-tap Lu to start a voice conversation.'}</span>{voiceSecondsRemaining!==null&&<small className="lu-live-allowance">{Math.floor(voiceSecondsRemaining/60)}m {String(voiceSecondsRemaining%60).padStart(2,'0')}s of voice time remaining</small>}</div>
    <div ref={thread} className="lu-live-thread" aria-label="Conversation" aria-live="polite">{bubbles.map((bubble,index)=><article className={`lu-live-bubble is-${bubble.speaker==='You'?'you':'lu'}`} key={index}><small>{bubble.speaker}</small><p>{bubble.text}</p></article>)}
      {toolEvents.map(event=><article className={`lu-live-tool-event is-${event.state}`} key={event.id}><span className="lu-chat-tool-indicator" aria-hidden="true">{event.state==='running'?<LoaderCircle size={16}/>:event.state==='failed'?'!':'✓'}</span><span><strong>{event.label}</strong>{event.detail&&<small>{event.detail}</small>}</span>{event.action&&event.state==='failed'&&<button type="button" onClick={()=>onAgentAction?.(event.action!)}>Try again</button>}</article>)}
      {references.map(reference=><article className="lu-live-reference" key={reference.reference}><small>{reference.kind} · {reference.reference.replace('_',' ')}</small><strong>{reference.title||'Untitled entry'}</strong><p>{reference.content}</p><button type="button" onClick={()=>onAgentAction?.({kind:'open-entry',entryId:reference.entryId})}><ExternalLink size={14}/>Open entry</button></article>)}
    </div>
    <div className="lu-live-controls">{connected?<><button type="button" className="lu-live-secondary" disabled={closing} onClick={toggleMute}>{muted?<MicOff size={19}/>:<Mic size={19}/>}<span>{muted?'Unmute':'Mute'}</span></button>{audioNeedsTap&&<button type="button" className="lu-live-secondary" disabled={closing} onClick={()=>void playLuVoice()}><Radio size={19}/><span>Play Lu’s voice</span></button>}<button type="button" className="lu-live-end" disabled={closing} onClick={()=>close()}><Phone size={19}/><span>{closing?'Ending…':'End conversation'}</span></button></>:<button type="button" className="lu-live-start" disabled={busy} onClick={()=>void start()}>{busy?<Radio size={19}/>:<Mic size={19}/>}<span>{busy?'Connecting…':bubbles.length?'Continue talking':'Start talking'}</span></button>}</div>
    <audio ref={audio} autoPlay playsInline className="lu-live-audio" aria-hidden="true" />
  </section>;
}

const nineBars=9;
