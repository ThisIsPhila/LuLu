import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createLuLiveSession} from './lu-live.js';
test('creates a Live WebRTC session server-side without exposing the API key',async()=>{
 let input:any;
 const fake=async (url:string,init:RequestInit)=>{assert.equal(url,'https://api.openai.com/v1/live/sessions');input=JSON.parse(String(init.body));return new Response(JSON.stringify({session:{id:'live_test123'},transport:{type:'webrtc',sdp:'answer'}}),{status:201});};
 assert.deepEqual(await createLuLiveSession('secret','offer',fake),{sessionId:'live_test123',answer:'answer'});
 assert.equal(input.session.model,'gpt-live-1');assert.equal(input.transport.sdp,'offer');assert.equal(JSON.stringify(input).includes('secret'),false);
});
test('invalid or failed Live requests fail closed',async()=>{
 await assert.rejects(createLuLiveSession('','offer'));
 await assert.rejects(createLuLiveSession('secret','offer',async()=>new Response('{}',{status:200})));
});
