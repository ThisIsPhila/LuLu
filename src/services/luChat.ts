import { request } from './backend/request';
import {
  parseLuChatResult,
  parseLuScrubResult,
  validateLuChatInput,
  validateLuChatLanguage,
  type LuChatLanguage,
  type LuChatResult,
  type LuScrubResult,
} from './luChatContracts';

/** Sends original text only to the dedicated PII scrub endpoint. */
export async function scrubLuMessage(text: string): Promise<LuScrubResult> {
  const input = validateLuChatInput(text);
  const response: unknown = await request('/lu/scrub', { text: input });
  return parseLuScrubResult(response);
}

/** Sends only the scrubbed text, opaque scrub ticket, and selected language to chat. */
export async function sendLuChatMessage(input: {
  ticket: string;
  text: string;
  language: LuChatLanguage;
}): Promise<LuChatResult> {
  const text = validateLuChatInput(input.text);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(input.ticket)) throw new Error('The scrub review has expired. Scrub and review your message again.');
  const language = validateLuChatLanguage(input.language);
  const response: unknown = await request('/lu/chat', { ticket: input.ticket, text, language });
  return parseLuChatResult(response);
}
