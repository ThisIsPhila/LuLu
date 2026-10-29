import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {scrubForLu,scrubForLuDetailed,scrubTextsForLu,respondAsLu,respondAsLuWithTools} from './lu-chat.js';

test('privacy and response models are separate, non-stored cloud calls',async()=>{
 const bodies:any[]=[];
 const fake=async (_url:string,init:RequestInit)=>{
  const body=JSON.parse(String(init.body));bodies.push(body);
  const text=bodies.length===1?JSON.stringify({entities:[{value:'David',label:'Person'},{value:'Cape Town',label:'Place'}]}):bodies.length===2?JSON.stringify(['Person A visited Place A','Call Person A soon']):'Hello!';
  return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]}),{status:200});
 };
 const scrubbed=await scrubForLu('test-key','David visited Cape Town',fake);
 assert.equal(scrubbed,'Person A visited Place A');
 assert.deepEqual(await scrubTextsForLu('test-key',['David visited Cape Town','Call David soon'],fake),['Person A visited Place A','Call Person A soon']);
 assert.equal(await respondAsLu('test-key',scrubbed,'isiZulu',fake),'Hello!');
 assert.equal(bodies[0].input,'David visited Cape Town');
 assert.equal(bodies[1].input,JSON.stringify(['David visited Cape Town','Call David soon']));
 assert.equal(bodies[2].input,'Person A visited Place A');
 for(const body of bodies)assert.equal(body.store,false);
 assert.equal(bodies[2].model,'gpt-6-luna');assert.equal(bodies[2].reasoning.effort,'high');
 assert.match(bodies[2].instructions,/Politely decline unrelated requests/);
 assert.match(bodies[2].instructions,/Selected reply language: isiZulu/);
});

test('privacy scan returns exact source highlights and stable generic aliases',async()=>{
 const result=await scrubForLuDetailed('test-key','David met David in Cape Town.',async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({entities:[{value:'David',label:'Person'},{value:'Cape Town',label:'Place'}]})}]}]}),{status:200}));
 assert.equal(result.text,'Person A met Person A in Place A.');
 assert.deepEqual(result.entities.map(item=>({start:item.start,end:item.end,label:item.label,replacement:item.replacement})),[
  {start:0,end:5,label:'Person',replacement:'Person A'},
  {start:10,end:15,label:'Person',replacement:'Person A'},
  {start:19,end:28,label:'Place',replacement:'Place A'},
 ]);
 const ignored=await scrubForLuDetailed('test-key','David',async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({entities:[{value:'Nomsa',label:'Person'}]})}]}]}),{status:200}));
 assert.deepEqual(ignored,{text:'David',entities:[]});
});

test('Lu tool loop executes a server function and returns its result to the model',async()=>{
 const bodies:any[]=[];let executions=0;
 const fake=async (_url:string,init:RequestInit)=>{
  const body=JSON.parse(String(init.body));bodies.push(body);
  const output=bodies.length===1
   ? [{type:'function_call',call_id:'call_settings',name:'navigate_app',arguments:JSON.stringify({destination:'settings'})}]
   : [{type:'message',content:[{type:'output_text',text:'I opened Settings.'}]}];
  return new Response(JSON.stringify({status:'completed',output}),{status:200});
 };
 const result=await respondAsLuWithTools('test-key','Person A asked to open Settings.','English',{
  fetcher:fake,
  history:[{role:'user',text:'Can you help with LuLu?'}],
  execute:async call=>{executions++;assert.equal(call.name,'navigate_app');return {output:{navigated:true},action:{kind:'navigate',destination:'settings'}};},
 });
 assert.equal(executions,1);assert.equal(result.reply,'I opened Settings.');
 assert.deepEqual(result.actions,[{kind:'navigate',destination:'settings'}]);
 assert.equal(bodies[0].store,false);assert.ok(Array.isArray(bodies[0].tools));
 assert.ok(bodies[1].input.some((item:any)=>item.type==='function_call_output'&&item.call_id==='call_settings'));
});

test('confirmed chained actions return within the bounded tool loop',async()=>{
 const bodies:any[]=[];
 const fake=async (_url:string,init:RequestInit)=>{
  bodies.push(JSON.parse(String(init.body)));
  const output=bodies.length===1
   ? [{type:'function_call',call_id:'call_search',name:'search_surface_entries',arguments:JSON.stringify({query:'garden',kind:'Journal'})}]
   : [{type:'function_call',call_id:'call_open',name:'open_entry',arguments:JSON.stringify({reference:'entry_1'})}];
  return new Response(JSON.stringify({status:'completed',output}),{status:200});
 };
 const result=await respondAsLuWithTools('test-key','Find my journal entry about the garden and open it.','English',{
  fetcher:fake,
  execute:async call=>call.name==='search_surface_entries'
   ? {output:{matches:[{reference:'entry_1'}]},references:[{reference:'entry_1',entryId:'entry-id',kind:'Journal',title:'The garden',content:'A scrubbed excerpt.'}]}
   : {output:{opened:true},action:{kind:'open-entry',entryId:'entry-id'}},
 });
 assert.equal(bodies.length,2);
 assert.match(result.reply,/opening that entry/i);
 assert.deepEqual(result.actions,[{kind:'open-entry',entryId:'entry-id'}]);
 assert.equal(result.references[0].content,'A scrubbed excerpt.');
});

test('invalid model responses, unsupported languages and unbounded history fail closed',async()=>{
 const failed=async()=>new Response(JSON.stringify({status:'incomplete',output:[]}),{status:200});
 await assert.rejects(scrubForLu('test','hello',failed));
 await assert.rejects(respondAsLu('test','hello','unknown',failed));
 await assert.rejects(respondAsLuWithTools('test','hello','English',{execute:async()=>({output:{}}),history:Array.from({length:13},()=>({role:'user' as const,text:'hello'}))}));
});
