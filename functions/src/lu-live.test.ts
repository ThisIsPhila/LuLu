import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createLuLiveSession} from './lu-live.js';
test('creates a Live WebRTC session server-side without exposing the API key',async()=>{
 let input:any;
 const fake=async (url:string,init:RequestInit)=>{assert.equal(url,'https://api.openai.com/v1/live/sessions');input=JSON.parse(String(init.body));return new Response(JSON.stringify({session:{id:'live_test123'},transport:{type:'webrtc',sdp:'answer'}}),{status:201});};
 assert.deepEqual(await createLuLiveSession('secret','offer',[{speaker:'You',text:'Open my journal.'},{speaker:'Lu',text:'I can open that.'}],fake),{sessionId:'live_test123',answer:'answer'});
 assert.equal(input.session.model,'gpt-live-1');assert.equal(input.session.store,false);assert.equal(input.transport.sdp,'offer');
 assert.equal(input.session.delegation.type,'responses');assert.equal(input.session.delegation.responses.model,'gpt-6-luna');
 assert.ok(input.session.delegation.responses.tools.some((tool:any)=>tool.name==='search_surface_entries'));
 assert.deepEqual(input.session.input.map((item:any)=>item.role),['user','assistant']);
 assert.equal(input.session.input[0].content[0].text,'Open my journal.');
 assert.equal(input.session.delegation.responses.parallel_tool_calls,false);assert.equal(JSON.stringify(input).includes('secret'),false);
});
test('invalid or failed Live requests fail closed',async()=>{
 await assert.rejects(createLuLiveSession('','offer'));
 await assert.rejects(createLuLiveSession('secret','offer',[],async()=>new Response('{}',{status:200})));
 await assert.rejects(createLuLiveSession('secret','offer',[{speaker:'You',text:'x'.repeat(2_001)}]));
});
