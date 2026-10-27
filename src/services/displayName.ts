import { decryptPrivate, encryptPrivate, type Envelope } from './backend/deviceVault.ts';

/** The greeting name is encrypted and scoped to this account and this device. */
const keyFor = (uid: string) => `lulu.display-name.v1.${encodeURIComponent(uid)}`;
const pending = new Map<string, Promise<void>>();
const recordId = 'profile-display-name';

export async function readDisplayName(uid: string): Promise<string> {
  await pending.get(uid)?.catch(() => {});
  try {
    const stored = localStorage.getItem(keyFor(uid));
    if (!stored) return '';
    const value = await decryptPrivate<unknown>(uid, recordId, JSON.parse(stored) as Envelope);
    return typeof value === 'string' ? value.trim().slice(0, 80) : '';
  }
  catch { return ''; }
}

export function writeDisplayName(uid: string, value: string): Promise<void> {
  const name = value.slice(0, 80);
  const operation = (pending.get(uid) ?? Promise.resolve()).catch(() => {}).then(async () => {
    if (name.trim()) localStorage.setItem(keyFor(uid), JSON.stringify(await encryptPrivate(uid, recordId, name)));
    else localStorage.removeItem(keyFor(uid));
  });
  pending.set(uid, operation);
  void operation.finally(() => { if (pending.get(uid) === operation) pending.delete(uid); }).catch(() => {});
  return operation;
}
