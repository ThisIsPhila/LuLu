import {useEffect, useRef, useState} from 'react';
import {Mic, MicOff, Phone, Radio, ShieldCheck} from 'lucide-react';
import {request} from '../services/backend/request';
import {LuActivity} from './LuActivity';
import './LuLiveChat.css';

type Bubble={speaker:'You'|'Lu';text:string};
type LiveAnswer={sessionId:string;answer:string};

export function LuLiveChat(){
 const [status,setStatus]=useState('Ready when you are');
 const [connected,setConnected]=useState(false);
 const [busy,setBusy]=useState(false);
 const [muted,setMuted]=useState(false);
 const [bubbles,setBubbles]=useState<Bubble[]>([]);
 const connection=useRef<RTCPeerConnection|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const channel=useRef<RTCDataChannel|null>(null);
 const audio=useRef<HTMLAudioElement>(null);
 const alive=useRef(true);
 const generation=useRef(0);
 function close(){generation.current++;if(channel.current?.readyState==='open')channel.current.send(JSON.stringify({type:'session.close'}));channel.current?.close();channel.current=null;connection.current?.close();connection.current=null;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(audio.current)audio.current.srcObject=null;if(alive.current){setConnected(false);setBusy(false);setMuted(false);}}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;close();};},[]);
 async function start(){if(busy||connected)return;setBusy(true);setStatus('Connecting to Lu…');const attempt=++generation.current;try{const media=await navigator.mediaDevices.getUserMedia({audio:true});if(attempt!==generation.current){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;const peer=new RTCPeerConnection();connection.current=peer;peer.ontrack=event=>{if(audio.current){audio.current.srcObject=event.streams[0]??new MediaStream([event.track]);void audio.current.play().catch(()=>setStatus('Audio is ready. Tap to hear Lu.'));}};media.getAudioTracks().forEach(track=>peer.addTrack(track,media));const events=peer.createDataChannel('oai-events');channel.current=events;events.onmessage=event=>{try{const data=JSON.parse(String(event.data)) as {type?:string;delta?:unknown};if(data.type==='session.started'){setConnected(true);setBusy(false);setStatus('Listening');}if(data.type==='session.closed'){close();setStatus('Conversation ended');}if((data.type==='session.input_transcript.delta'||data.type==='session.output_transcript.delta')&&typeof data.delta==='string'){const speaker=data.type==='session.input_transcript.delta'?'You':'Lu';setBubbles(current=>{const last=current.at(-1);return last?.speaker===speaker?[...current.slice(0,-1),{speaker,text:last.text+data.delta}]:[...current,{speaker,text:data.delta as string}];});}}catch{}};events.onclose=()=>{if(attempt===generation.current){close();setStatus('Conversation disconnected');}};const offer=await peer.createOffer();await peer.setLocalDescription(offer);const result=await request<LiveAnswer>('/lu/live',{offer:offer.sdp});if(attempt!==generation.current)return;await peer.setRemoteDescription({type:'answer',sdp:result.answer});}catch(error){if(attempt!==generation.current)return;close();setStatus(error instanceof Error?error.message:'Could not start voice.');}}
 function toggleMute(){const next=!muted;setMuted(next);stream.current?.getAudioTracks().forEach(track=>track.enabled=!next);}
 return <section className="lu-live-chat" aria-label="Live conversation with Lu">
  <aside className="lu-live-disclosure"><ShieldCheck size={18}/><span><strong>Cloud voice demo</strong><small>Your voice goes to the live AI service and may contain personal details. Private journal entries are not sent.</small></span></aside>
  <div className="lu-live-stage"><div className={`lu-live-orb${connected?' is-listening':''}${busy?' is-connecting':''}`} aria-hidden="true"><span>Lu</span></div><strong className="lu-live-status" role="status">{busy||connected?<LuActivity state={busy?'connecting':'listening'} label={status}/>:status}</strong><span className="lu-live-hint">{connected?'Speak naturally. Lu is listening.':'Start a conversation with Lu about using the app.'}</span></div>
  <div className="lu-live-thread" aria-label="Conversation" aria-live="polite">{bubbles.map((bubble,index)=><article className={`lu-live-bubble is-${bubble.speaker==='You'?'you':'lu'}`} key={index}><small>{bubble.speaker}</small><p>{bubble.text}</p></article>)}</div>
  <div className="lu-live-controls">{connected?<><button type="button" className="lu-live-secondary" onClick={toggleMute}>{muted?<MicOff size={19}/>:<Mic size={19}/>}<span>{muted?'Unmute':'Mute'}</span></button><button type="button" className="lu-live-end" onClick={()=>{close();setStatus('Conversation ended');}}><Phone size={19}/><span>End conversation</span></button></>:<button type="button" className="lu-live-start" disabled={busy} onClick={()=>void start()}>{busy?<Radio size={19}/>:<Mic size={19}/>}<span>{busy?'Connecting…':'Start talking'}</span></button>}</div>
  <audio ref={audio} autoPlay className="lu-live-audio" aria-hidden="true" />
 </section>;
}
