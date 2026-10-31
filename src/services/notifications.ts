export type NotificationKind = 'welcome' | 'update' | 'ai' | 'account' | 'system';

export type UserNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

const MAX_NOTIFICATIONS = 50;
const memoryStore = new Map<string, UserNotification[]>();
const seededAccounts = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

const storageKey = (uid: string) => `lulu.notifications.${uid}`;
const seedKey = (uid: string) => `lulu.notifications.seeded.${uid}`;

function isUserNotification(value: unknown): value is UserNotification {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string' && typeof item.createdAt === 'string' && typeof item.read === 'boolean';
}

function readStore(uid: string): UserNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isUserNotification);
    }
  } catch { /* Fall through to the in-memory copy. */ }
  return memoryStore.get(uid) ?? [];
}

function writeStore(uid: string, items: UserNotification[]) {
  memoryStore.set(uid, items);
  try { localStorage.setItem(storageKey(uid), JSON.stringify(items)); } catch { /* Keep the in-memory copy for this session. */ }
  const set = listeners.get(uid);
  if (set) for (const listener of set) listener();
}

function isSeeded(uid: string): boolean {
  if (seededAccounts.has(uid)) return true;
  try { return localStorage.getItem(seedKey(uid)) === '1'; } catch { return false; }
}

function markSeeded(uid: string) {
  seededAccounts.add(uid);
  try { localStorage.setItem(seedKey(uid), '1'); } catch { /* Seeded for this session only. */ }
}

/** Newest-first copy of the user's notifications. Stored on this device only. */
export function listNotifications(uid: string): UserNotification[] {
  return readStore(uid).map(item => ({ ...item }));
}

export function unreadCount(uid: string): number {
  return readStore(uid).filter(item => !item.read).length;
}

/** Adds a notification. Reuses the existing item when the id already exists. */
export function pushNotification(uid: string, input: { kind: NotificationKind; title: string; body: string; id?: string }): UserNotification {
  const items = readStore(uid);
  const id = input.id ?? `${input.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existing = items.find(item => item.id === id);
  if (existing) return existing;
  const created: UserNotification = { id, kind: input.kind, title: input.title, body: input.body, createdAt: new Date().toISOString(), read: false };
  writeStore(uid, [created, ...items].slice(0, MAX_NOTIFICATIONS));
  return created;
}

export function markAllRead(uid: string) {
  const items = readStore(uid);
  if (items.every(item => item.read)) return;
  writeStore(uid, items.map(item => item.read ? item : { ...item, read: true }));
}

/** Fires the listener when notifications change; returns an unsubscribe function. */
export function subscribeNotifications(uid: string, listener: () => void): () => void {
  let set = listeners.get(uid);
  if (!set) { set = new Set(); listeners.set(uid, set); }
  set.add(listener);
  return () => { set.delete(listener); if (!set.size) listeners.delete(uid); };
}

/** Adds the one-time welcome notification the first time the bell runs for an account. */
export function ensureSeeded(uid: string) {
  if (isSeeded(uid)) return;
  markSeeded(uid);
  pushNotification(uid, {
    id: 'welcome',
    kind: 'welcome',
    title: 'Welcome to LuLu',
    body: 'Your story, your safety, your choice. Tap Lu — the guide button — anytime you need help finding your way around.',
  });
}
