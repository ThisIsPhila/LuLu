export const LU_CHAT_MAX_INPUT_CHARACTERS = 4_000;
export const LU_CHAT_LANGUAGES = ['English', 'Afrikaans', 'isiZulu'] as const;
export type LuChatLanguage = (typeof LU_CHAT_LANGUAGES)[number];

export type LuScrubResult = { scrubbed: string; ticket: string };
export type LuChatResult = { reply: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseLuScrubResult(value: unknown): LuScrubResult {
  if (!isRecord(value) || typeof value.scrubbed !== 'string' || typeof value.ticket !== 'string'
    || !value.scrubbed.trim() || value.scrubbed.length > LU_CHAT_MAX_INPUT_CHARACTERS
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value.ticket)) {
    throw new Error('Lu could not safely prepare this message. Your text was not sent to chat.');
  }
  return { scrubbed: value.scrubbed, ticket: value.ticket };
}

export function parseLuChatResult(value: unknown): LuChatResult {
  if (!isRecord(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 8_000) {
    throw new Error('Lu could not return a usable reply. Please try again.');
  }
  return { reply: value.reply };
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
