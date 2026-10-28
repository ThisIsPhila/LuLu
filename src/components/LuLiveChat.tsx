import {useEffect, useRef, useState} from 'react';
import {request} from '../services/backend/request';

type Bubble = {speaker: 'You' | 'Lu'; text: string};
type LiveAnswer = {sessionId: string; answer: string};

/** Owner preview. The microphone is opened only after the disclosure is accepted. */
export function LuLiveChat() {
  const [status, setStatus] = useState('Ready to talk');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const connection = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  function close() {
    generation.current++;
    if (channel.current?.readyState === 'open') channel.current.send(JSON.stringify({type:'session.close'}));
    channel.current?.close(); channel.current = null;
    connection.current?.close(); connection.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (audio.current) audio.current.srcObject = null;
    if (alive.current) {setConnected(false); setBusy(false);}
  }
  useEffect(() => { alive.current=true; return () => {alive.current=false;close();}; }, []);
  async function start() {
    if (busy || connected) return;
    setBusy(true); setStatus('Connecting…');
    const attempt = ++generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({audio:true});
      if (attempt !== generation.current) {media.getTracks().forEach(track => track.stop()); return;}
      stream.current=media;
      const peer = new RTCPeerConnection(); connection.current=peer;
      peer.ontrack = event => {if(audio.current) {audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track]); void audio.current.play().catch(() => setStatus('Tap the audio player to hear Lu.'));}};
      media.getAudioTracks().forEach(track => peer.addTrack(track,media));
      const events=peer.createDataChannel('oai-events'); channel.current=events;
      events.onmessage = event => {
        try {
          const data=JSON.parse(String(event.data)) as {type?:string;delta?:unknown};
          if(data.type==='session.started') {setConnected(true);setBusy(false);setStatus('Listening');}
          if(data.type==='session.closed') {close();setStatus('Conversation ended.');}
          if((data.type==='session.input_transcript.delta' || data.type==='session.output_transcript.delta') && typeof data.delta==='string') {
            const speaker=data.type==='session.input_transcript.delta' ? 'You' : 'Lu'; const fragment=data.delta;
            setBubbles(current => {const last=current[current.length-1]; return last?.speaker===speaker ? [...current.slice(0,-1),{speaker,text:last.text+fragment}] : [...current,{speaker,text:fragment}];});
          }
        } catch { /* Ignore malformed provider events. */ }
      };
      events.onclose = () => {if(attempt === generation.current) {close();setStatus('Conversation disconnected.');}};
      const offer=await peer.createOffer(); await peer.setLocalDescription(offer);
      const result=await request<LiveAnswer>('/lu/live',{offer:offer.sdp});
      if(attempt !== generation.current) return;
      await peer.setRemoteDescription({type:'answer',sdp:result.answer});
    } catch (error) {
      if (attempt !== generation.current) return;
      close();setStatus(error instanceof Error ? error.message : 'Could not start voice.');
    }
  }
  return <section className="lu-live-chat" aria-label="Live conversation with Lu">
    <p>For this cloud demo, your voice goes directly to the live AI service and may contain personal details. Private journal entries are not sent.</p>
    <p role="status">{status}</p>
    <audio ref={audio} controls autoPlay aria-label="Lu voice playback" />
    <div className="lu-text-chat-thread" aria-label="Conversation" aria-live="polite">{bubbles.map((bubble,index)=><article className={`lu-text-chat-message ${bubble.speaker==='You'?'is-you':'is-lu'}`} key={index}><small>{bubble.speaker}</small><p>{bubble.text}</p></article>)}</div>
    {connected || busy ? <button type="button" onClick={() => {close();setStatus('Conversation ended.');}}>End conversation</button> : <button type="button" onClick={() => void start()}>Start voice conversation</button>}
  </section>;
}
