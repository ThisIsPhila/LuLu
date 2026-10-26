import { Browser } from '@capacitor/browser';
import { isNativePlatform } from './runtime';

export async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new TypeError('External LuLu links must use HTTPS.');
  if (isNativePlatform()) {
    await Browser.open({ url: parsed.toString(), presentationStyle: 'popover' });
    return;
  }
  const opened = window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
  if (!opened) throw new Error('The browser blocked the authentication window.');
}

export async function closeExternalBrowser(): Promise<void> {
  if (isNativePlatform()) await Browser.close().catch(() => {});
}

export function onExternalBrowserFinished(callback: () => void): () => void {
  if (!isNativePlatform()) return () => {};
  let disposed = false;
  let remove: (() => void) | undefined;
  void Browser.addListener('browserFinished', () => { if (!disposed) callback(); }).then(handle => {
    if (disposed) void handle.remove(); else remove = () => { void handle.remove(); };
  }).catch(() => {});
  return () => { disposed = true; remove?.(); };
}
