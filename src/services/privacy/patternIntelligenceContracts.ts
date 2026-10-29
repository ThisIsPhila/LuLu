import type {ReviewedTextRequest} from './cloudProcessingContracts';

export type PatternBand='strong_indication'|'possible_indication'|'uncertain'|'not_indicated'|'unknown';
export type BehaviourPattern={id:string;title:string;explanation:string;probability:number|null;band:PatternBand};
export type PatternEngagement={timing:'on_request';primary:'none'|'reflection'|'pattern_insight'|'support_options';offers:Array<'explore_pattern'|'talk_with_lu'|'view_support'>;urgentSupport:boolean};
export type PatternAssessment={provider:'openai_decisions';model:'gpt-6-luna';patterns:BehaviourPattern[];immediateSafety:{probability:number|null;band:PatternBand};engagement:PatternEngagement;review:{revision:string;sha256:string;purpose:string};advisory:true};

export type ReviewedPatternRequest=ReviewedTextRequest;

const validBands:PatternBand[]=['strong_indication','possible_indication','uncertain','not_indicated','unknown'];
function isRecord(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function validProbability(value:unknown):value is number|null{return value===null||(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1);}
function bandFor(probability:number|null):PatternBand{
  if(probability===null)return 'unknown';
  if(probability>=.85)return 'strong_indication';
  if(probability>=.65)return 'possible_indication';
  if(probability>=.4)return 'uncertain';
  return 'not_indicated';
}
function resolveEngagement(patterns:BehaviourPattern[],safety:number|null):PatternEngagement{
  const urgentSupport=safety!==null&&safety>=.65;
  const relevant=patterns.some(pattern=>pattern.probability!==null&&pattern.probability>=.4);
  return {timing:'on_request',primary:urgentSupport?'support_options':patterns.some(pattern=>pattern.probability!==null&&pattern.probability>=.65)?'pattern_insight':relevant?'reflection':'none',offers:[...(relevant?['explore_pattern' as const,'talk_with_lu' as const]:[]),'view_support'],urgentSupport};
}

export function parsePatternAssessment(value:unknown,expected:{revision:string;sha256:string;purpose:string}):PatternAssessment{
  const ids=new Set(['emotional_abuse','coercive_control','financial_abuse','social_isolation','physical_abuse','sexual_coercion','digital_abuse','stalking_harassment','reproductive_coercion','workplace_abuse','neglect_deprivation','threats_intimidation']);
  if(!isRecord(value)||value.provider!=='openai_decisions'||value.model!=='gpt-6-luna'||value.advisory!==true||!Array.isArray(value.patterns)||value.patterns.length!==ids.size||!isRecord(value.review))throw new Error('The pattern service returned an invalid result.');
  const patterns=value.patterns.map(item=>{
    if(!isRecord(item)||typeof item.id!=='string'||!ids.delete(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>120||typeof item.explanation!=='string'||item.explanation.length>500||!validProbability(item.probability)||!validBands.includes(item.band as PatternBand)||item.band!==bandFor(item.probability))throw new Error('The pattern service returned an invalid result.');
    return {id:item.id,title:item.title,explanation:item.explanation,probability:item.probability,band:item.band as PatternBand};
  });
  if(ids.size!==0||!isRecord(value.immediateSafety)||!validProbability(value.immediateSafety.probability)||!validBands.includes(value.immediateSafety.band as PatternBand)||value.immediateSafety.band!==bandFor(value.immediateSafety.probability))throw new Error('The pattern service returned an invalid result.');
  const immediateSafety={probability:value.immediateSafety.probability,band:value.immediateSafety.band as PatternBand};
  if(!isRecord(value.engagement)||value.engagement.timing!=='on_request'||typeof value.engagement.urgentSupport!=='boolean'||!Array.isArray(value.engagement.offers)||!['none','reflection','pattern_insight','support_options'].includes(String(value.engagement.primary))||value.engagement.offers.some(item=>!['explore_pattern','talk_with_lu','view_support'].includes(String(item))))throw new Error('The pattern service returned an invalid result.');
  const engagement=resolveEngagement(patterns,immediateSafety.probability);
  if(value.engagement.primary!==engagement.primary||value.engagement.urgentSupport!==engagement.urgentSupport||JSON.stringify(value.engagement.offers)!==JSON.stringify(engagement.offers))throw new Error('The pattern service returned an invalid result.');
  if(value.review.revision!==expected.revision||value.review.sha256!==expected.sha256||value.review.purpose!==expected.purpose)throw new Error('The pattern result did not match the reviewed text. No result was shown.');
  return {provider:'openai_decisions',model:'gpt-6-luna',patterns,immediateSafety,engagement,review:{revision:expected.revision,sha256:expected.sha256,purpose:expected.purpose},advisory:true};
}
