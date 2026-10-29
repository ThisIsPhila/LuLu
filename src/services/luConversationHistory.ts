import { decryptPrivate, encryptPrivate, type Envelope } from './backend/deviceVault.ts';
import type { LuAgentAction, LuScrubbedEntity, LuSurfaceReference } from './luChatContracts';

export type LuToolEvent = {
  id: string;
  label: string;
  state: 'running' | 'done' | 'failed';
  detail?: string;
  action?: LuAgentAction;
};

export type LuSavedMessage = {
  speaker: 'You' | 'Lu';
  text: string;
  originalText?: string;
  entities?: LuScrubbedEntity[];
  references?: LuSurfaceReference[];
  tools?: LuToolEvent[];
  imageCount?: number;
};

export type LuSavedConversation = {
  id: string;
  mode: 'text' | 'voice';
  title: string;
  updatedAt: number;
  messages: LuSavedMessage[];
};

const storageKey = (uid: string) => `lulu.lu-conversations.v1.${encodeURIComponent(uid)}`;
const envelopeId = 'lu-conversation-history';
const maxConversations = 24;
const maxMessages = 50;
const writes = new Map<string, Promise<void>>();

export function createLuConversationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `lu-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function validConversation(value: unknown): value is LuSavedConversation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LuSavedConversation>;
  return typeof item.id === 'string' && (item.mode === 'text' || item.mode === 'voice')
    && typeof item.title === 'string' && Number.isFinite(item.updatedAt) && Array.isArray(item.messages);
}

async function read(uid: string): Promise<LuSavedConversation[]> {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const envelope = JSON.parse(raw) as Envelope;
    const data = await decryptPrivate<{ conversations?: unknown }>(uid, envelopeId, envelope);
    return Array.isArray(data.conversations)
      ? data.conversations.filter(validConversation).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, maxConversations)
      : [];
  } catch {
    return [];
  }
}

export async function loadLuConversations(uid: string): Promise<LuSavedConversation[]> {
  await writes.get(uid)?.catch(() => {});
  return read(uid);
}

export async function saveLuConversation(uid: string, conversation: LuSavedConversation): Promise<void> {
  const previous = writes.get(uid) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const current = await read(uid);
    const bounded = {
      ...conversation,
      title:conversation.title.slice(0,72),
      messages:conversation.messages.slice(-maxMessages).map(message=>({
        ...message,
        text:message.text.slice(-12_000),
        originalText:message.originalText?.slice(-4_000),
        references:message.references?.slice(0,3).map(reference=>({...reference,title:reference.title.slice(0,500),content:reference.content.slice(0,1400)})),
        tools:message.tools?.slice(-12).map(event=>({...event,label:event.label.slice(0,120),detail:event.detail?.slice(0,500)})),
      })),
    };
    const conversations = [bounded, ...current.filter(item => item.id !== conversation.id)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, maxConversations);
    while(conversations.length>1&&JSON.stringify({conversations}).length>2_500_000)conversations.pop();
    const envelope = await encryptPrivate(uid, envelopeId, { conversations });
    localStorage.setItem(storageKey(uid), JSON.stringify(envelope));
  });
  writes.set(uid, next);
  try { await next; } finally { if (writes.get(uid) === next) writes.delete(uid); }
}

