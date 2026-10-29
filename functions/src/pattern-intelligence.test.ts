import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assessBehaviourPatterns, BEHAVIOUR_PATTERNS, patternBand, resolvePatternEngagement} from './pattern-intelligence.js';
import {validateReviewedPrivacyRequest} from './privacy-processing.js';

const text='Person A says Person B controls their salary, checks their phone and discourages contact with friends.';
const request=validateReviewedPrivacyRequest({text,revision:'private-r2',sha256:createHash('sha256').update(text).digest('hex'),purpose:'Understand reviewed experiences',reviewed:true});
const responseBody=(safety=.05)=>({model:'gpt-6-luna',answers:[
  ...BEHAVIOUR_PATTERNS.map((pattern,index)=>({type:'predicate',name:pattern.id,probability:index===2?0.91:index===6?0.88:index===3?0.73:0.02})),
  {type:'predicate',name:'immediate_safety_concern',probability:safety},
]});

test('Decisions classifies independent behaviour patterns from only the reviewed text',async()=>{
  let sent:{url:string;init:RequestInit}|undefined;
  const result=await assessBehaviourPatterns({apiKey:'test-secret',request,fetcher:async(url,init)=>{
    sent={url,init};return new Response(JSON.stringify(responseBody()),{status:200});
  }});
  assert.equal(sent?.url,'https://api.openai.com/v1/decisions');
  const body=JSON.parse(String(sent?.init.body));
  assert.equal(body.model,'gpt-6-luna');
  assert.equal(body.questions.length,13);
  assert.match(body.input[1].content[0].text,/Person A/);
  assert.doesNotMatch(body.input[1].content[0].text,/Nomsa|Sipho|David/);
  assert.equal(result.patterns.find(item=>item.id==='financial_abuse')?.band,'strong_indication');
  assert.equal(result.patterns.find(item=>item.id==='social_isolation')?.band,'possible_indication');
  assert.equal(result.immediateSafety.band,'not_indicated');
  assert.deepEqual(result.engagement,{timing:'on_request',primary:'pattern_insight',offers:['explore_pattern','talk_with_lu','view_support'],urgentSupport:false});
  assert.equal(result.review.sha256,request.sha256);
  assert.equal(result.advisory,true);
});

test('refusals stay unknown and malformed or incomplete model results fail closed',async()=>{
  const refused=responseBody();
  refused.answers[0]={type:'refusal',name:BEHAVIOUR_PATTERNS[0].id,probability:0};
  const result=await assessBehaviourPatterns({apiKey:'test-secret',request,fetcher:async()=>new Response(JSON.stringify(refused),{status:200})});
  assert.equal(result.patterns[0].probability,null);
  assert.equal(result.patterns[0].band,'unknown');
  await assert.rejects(assessBehaviourPatterns({apiKey:'test-secret',request,fetcher:async()=>new Response(JSON.stringify({model:'gpt-6-luna',answers:[]}),{status:200})}),/invalid result/);
  const invalid=responseBody();
  invalid.answers[1]={type:'predicate',name:'unknown_name',probability:.9};
  await assert.rejects(assessBehaviourPatterns({apiKey:'test-secret',request,fetcher:async()=>new Response(JSON.stringify(invalid),{status:200})}),/invalid result/);
});

test('engagement is user-requested and exposes urgent support only from the separate safety signal',()=>{
  assert.equal(patternBand(.85),'strong_indication');
  assert.equal(patternBand(.65),'possible_indication');
  assert.equal(resolvePatternEngagement([],null).primary,'none');
  assert.deepEqual(resolvePatternEngagement([],null).offers,['view_support']);
  const relevant=BEHAVIOUR_PATTERNS.map(item=>({id:item.id,title:item.title,explanation:item.explanation,probability:.1,band:'not_indicated' as const}));
  assert.equal(resolvePatternEngagement(relevant,.8).primary,'support_options');
  assert.equal(resolvePatternEngagement(relevant,.8).urgentSupport,true);
});
