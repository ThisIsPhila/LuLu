export const LU_CHAT_MAX_INPUT_CHARACTERS = 4_000;
export const LU_CHAT_LANGUAGES = ['English', 'Afrikaans', 'isiZulu'] as const;
export type LuChatLanguage = (typeof LU_CHAT_LANGUAGES)[number];

export type LuScrubResult = { scrubbed: string; ticket: string };
export type LuAgentAction =
  | { kind: 'navigate'; destination: 'home'|'journal'|'stories'|'library'|'reader'|'write'|'settings' }
  | { kind: 'open-entry'; entryId: string }
  | { kind: 'create-draft'; title: string; body: string; entryKind: 'Journal'|'Story' };
export type LuSurfaceReference = { reference: string; entryId: string; kind: 'Journal'|'Story'; title: string; content: string };
export type LuHistoryMessage = { role: 'user'|'assistant'; text: string };
export type LuChatResult = { reply: string; actions: LuAgentAction[]; references: LuSurfaceReference[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseLuScrubResult(value: unknown): LuScrubResult {
  if (!isRecord(value) || typeof value.scrubbed !== 'string' || typeof value.ticket !== 'string'
    || !value.scrubbed.trim() || value.scrubbed.length > LU_CHAT_MAX_INPUT_CHARACTERS
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value.ticket)) {
    throw new Error('Lu could not safely prepare this message. Your text was not sent to chat.');
  }
  return { scrubbed: value.scrubbed.trim(), ticket: value.ticket };
}

export function parseLuChatResult(value: unknown): LuChatResult {
  if (!isRecord(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 8_000 || !Array.isArray(value.actions) || value.actions.length>6 || !Array.isArray(value.references) || value.references.length>3) {
    throw new Error('Lu could not return a usable reply. Please try again.');
  }
  const actions=value.actions.map((candidate):LuAgentAction=>{
    if(!isRecord(candidate)||typeof candidate.kind!=='string')throw new Error('Lu returned an invalid app action.');
    if(candidate.kind==='navigate'&&['home','journal','stories','library','reader','write','settings'].includes(candidate.destination as string))return {kind:'navigate',destination:candidate.destination as Extract<LuAgentAction,{kind:'navigate'}>['destination']};
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

export function validateLuChatLanguage(value: string): LuChatLanguage {
  if ((LU_CHAT_LANGUAGES as readonly string[]).includes(value)) return value as LuChatLanguage;
  throw new Error('Choose English, Afrikaans, or isiZulu.');
}
