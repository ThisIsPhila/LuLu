import { request } from './backend/request';
import {
  parseLuChatResult,
  parseLuScrubResult,
  validateLuChatInput,
  validateLuChatLanguage,
  type LuHistoryMessage,
  type LuChatLanguage,
  type LuChatResult,
  type LuScrubResult,
} from './luChatContracts';

/** Sends original text only to the dedicated PII scrub endpoint. */
export async function scrubLuMessage(text: string): Promise<LuScrubResult> {
  const input = validateLuChatInput(text);
  const response: unknown = await request('/lu/scrub', { text: input });
  return parseLuScrubResult(response,input);
}

/** Sends scrubbed text plus its matching source for server-side action authorization.
 * The source is hash-bound to the one-use ticket and is never sent to Lu's model.
 */
export async function sendLuChatMessage(input: {
  ticket: string;
  text: string;
  sourceText: string;
  language: LuChatLanguage;
  history: LuHistoryMessage[];
}): Promise<LuChatResult> {
  const text = validateLuChatInput(input.text);
  const sourceText = validateLuChatInput(input.sourceText);
  if(input.history.length>6||input.history.some(item=>!['user','assistant'].includes(item.role)||!item.text.trim()||item.text.length>1200))throw new Error('This conversation is too long. Start a new chat turn.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(input.ticket)) throw new Error('The scrub review has expired. Scrub and review your message again.');
  const language = validateLuChatLanguage(input.language);
  const response: unknown = await request('/lu/chat', { ticket: input.ticket, text, sourceText, language, history: input.history });
  return parseLuChatResult(response);
}
