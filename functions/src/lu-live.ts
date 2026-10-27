/** GPT Live transport adapter. This module is not exposed as an endpoint until
 * server-enforced usage limits and session shutdown have been implemented. */
type Fetcher=(url:string,init:RequestInit)=>Promise<Response>;
export async function createLuLiveSession(apiKey:string, offer:string, fetcher:Fetcher=fetch):Promise<{sessionId:string;answer:string}> {
  if(!apiKey || typeof offer!=='string' || offer.length<1 || offer.length>20000) throw new Error('Invalid voice session request.');
  const response=await fetcher('https://api.openai.com/v1/live/sessions',{
    method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20_000),
    body:JSON.stringify({session:{model:'gpt-live-1',instructions:'You are Lu, a friendly guide to the LuLu app. Be concise. Do not claim to have performed an action unless a connected app tool confirms it.'},transport:{type:'webrtc',sdp:offer}}),
  });
  if(!response.ok) throw new Error('The voice session could not start.');
  const result=await response.json() as {session?:{id?:unknown};transport?:{type?:unknown;sdp?:unknown}};
  if(typeof result.session?.id!=='string' || !/^live_[A-Za-z0-9_-]+$/.test(result.session.id) || result.transport?.type!=='webrtc' || typeof result.transport.sdp!=='string' || result.transport.sdp.length<1 || result.transport.sdp.length>20000) throw new Error('The voice service returned an invalid session.');
  return {sessionId:result.session.id,answer:result.transport.sdp};
}
