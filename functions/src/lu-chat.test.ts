import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {scrubForLu,respondAsLu} from './lu-chat.js';

test('privacy and Lu are separate calls and do not store provider responses',async()=>{
 const bodies:any[]=[];
 const fake=async (_url:string,init:RequestInit)=>{
  bodies.push(JSON.parse(String(init.body)));
  return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:bodies.length===1?'Person A visited Place A':'Hello!'}]}]}),{status:200});
 };
 const scrubbed=await scrubForLu('test-key','David visited Cape Town',fake);
 assert.equal(await respondAsLu('test-key',scrubbed,'isiZulu',fake),'Hello!');
 assert.equal(bodies[0].input,'David visited Cape Town');
 assert.equal(bodies[1].input,'Person A visited Place A');
 assert.equal(bodies[0].store,false);assert.equal(bodies[1].store,false);
 assert.match(bodies[1].instructions,/language of the user’s message/);
 assert.doesNotMatch(bodies[1].instructions,/Reply in isiZulu/);
});
test('invalid model responses and unsupported languages fail closed',async()=>{
 const failed=async()=>new Response(JSON.stringify({status:'incomplete',output:[]}),{status:200});
 await assert.rejects(scrubForLu('test','hello',failed));
 await assert.rejects(respondAsLu('test','hello','unknown',failed));
});
