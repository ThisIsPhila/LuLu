export const LU_CHAT_MAX_INPUT_CHARACTERS = 4_000;
export const LU_CHAT_LANGUAGES = ['English', 'Afrikaans', 'isiZulu'] as const;
export type LuChatLanguage = (typeof LU_CHAT_LANGUAGES)[number];
export type LuChatReplyLanguage = LuChatLanguage | 'auto';

export type LuScrubbedEntity = { start:number; end:number; label:'Person'|'Place'|'Organisation'|'Date'|'Time'|'Email'|'Phone'|'Relationship'|'Identifier'|'Detail'; replacement:string };
export type LuScrubResult = { scrubbed: string; entities:LuScrubbedEntity[]; ticket: string };
export type LuAgentAction =
  | { kind: 'navigate'; destination: 'home'|'journal'|'stories'|'library'|'reader'|'write'|'settings'|'support' }
  | { kind: 'open-entry'; entryId: string }
  | { kind: 'create-draft'; title: string; body: string; entryKind: 'Journal'|'Story' };
export type LuSurfaceReference = { reference: string; entryId: string; kind: 'Journal'|'Story'; title: string; content: string };
export type LuHistoryMessage = { role: 'user'|'assistant'; text: string };
export type LuChatResult = { reply: string; actions: LuAgentAction[]; references: LuSurfaceReference[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseLuScrubResult(value: unknown, sourceText:string): LuScrubResult {
  if (!isRecord(value) || typeof value.scrubbed !== 'string' || typeof value.ticket !== 'string'
    || !value.scrubbed.trim() || value.scrubbed.length > LU_CHAT_MAX_INPUT_CHARACTERS
    || !Array.isArray(value.entities) || value.entities.length>100
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value.ticket)) {
    throw new Error('Lu could not safely prepare this message. Your text was not sent to chat.');
  }
  const labels=['Person','Place','Organisation','Date','Time','Email','Phone','Relationship','Identifier','Detail'];
  let cursor=0,rebuilt='';
  const entities=value.entities.map(item=>{
    if(!isRecord(item)||!Number.isSafeInteger(item.start)||!Number.isSafeInteger(item.end)||typeof item.label!=='string'||!labels.includes(item.label)||typeof item.replacement!=='string'||!new RegExp(`^(?:${labels.join('|')}) [A-Z]{1,3}$`,'u').test(item.replacement))throw new Error('Lu returned invalid privacy highlights. Your text was not sent to chat.');
    const start=item.start as number,end=item.end as number;
    if(start<cursor||end<=start||end>sourceText.length)throw new Error('Lu returned invalid privacy highlights. Your text was not sent to chat.');
    rebuilt+=sourceText.slice(cursor,start)+item.replacement;cursor=end;
    return {start,end,label:item.label as LuScrubbedEntity['label'],replacement:item.replacement};
  });
  rebuilt+=sourceText.slice(cursor);
  if(rebuilt!==value.scrubbed)throw new Error('Lu privacy highlights did not match the transformed text. Your text was not sent to chat.');
  return { scrubbed: value.scrubbed, entities, ticket: value.ticket };
}

export function parseLuChatResult(value: unknown): LuChatResult {
  if (!isRecord(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 8_000 || !Array.isArray(value.actions) || value.actions.length>6 || !Array.isArray(value.references) || value.references.length>3) {
    throw new Error('Lu could not return a usable reply. Please try again.');
  }
  const actions=value.actions.map((candidate):LuAgentAction=>{
    if(!isRecord(candidate)||typeof candidate.kind!=='string')throw new Error('Lu returned an invalid app action.');
    if(candidate.kind==='navigate'&&['home','journal','stories','library','reader','write','settings','support'].includes(candidate.destination as string))return {kind:'navigate',destination:candidate.destination as Extract<LuAgentAction,{kind:'navigate'}>['destination']};
    if(candidate.kind==='open-entry'&&typeof candidate.entryId==='string'&&candidate.entryId.length>0&&candidate.entryId.length<=256)return {kind:'open-entry',entryId:candidate.entryId};
    if(candidate.kind==='create-draft'&&typeof candidate.title==='string'&&candidate.title.length<=300&&typeof candidate.body==='string'&&candidate.body.length<=6000&&['Journal','Story'].includes(candidate.entryKind as string))return {kind:'create-draft',title:candidate.title,body:candidate.body,entryKind:candidate.entryKind as 'Journal'|'Story'};
    throw new Error('Lu returned an invalid app action.');
  });
  const references=value.references.map((candidate):LuSurfaceReference=>{
    if(!isRecord(candidate)||typeof candidate.reference!=='string'||candidate.reference.length>32||typeof candidate.entryId!=='string'||candidate.entryId.length>256||!['Journal','Story'].includes(candidate.kind as string)||typeof candidate.title!=='string'||candidate.title.length>500||typeof candidate.content!=='string'||candidate.content.length>1400)throw new Error('Lu returned invalid search results.');
    return {reference:candidate.reference,entryId:candidate.entryId,kind:candidate.kind as 'Journal'|'Story',title:candidate.title,content:candidate.content};
  });
  return { reply: value.reply, actions, references };
}

export function validateLuChatInput(text: string): string {
  const value = text.trim();
  if (!value || value.length > LU_CHAT_MAX_INPUT_CHARACTERS) {
    throw new Error(`Enter a message of 1–${LU_CHAT_MAX_INPUT_CHARACTERS.toLocaleString()} characters.`);
  }
  return value;
}

export function validateLuChatLanguage(value: string): LuChatReplyLanguage {
  if (value === 'auto') return 'auto';
  if ((LU_CHAT_LANGUAGES as readonly string[]).includes(value)) return value as LuChatLanguage;
  throw new Error('Lu can automatically reply in English, Afrikaans, or isiZulu.');
}
