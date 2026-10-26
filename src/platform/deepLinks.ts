import { App } from '@capacitor/app';
import { isNativePlatform } from './runtime';

export type DeepLinkListener = (url: string) => void;

/** Listen before reading the launch URL so cold-start callbacks cannot race subscription. */
export function listenForAppLinks(callback: DeepLinkListener): () => void {
  if (!isNativePlatform()) return () => {};
  let disposed = false;
  let remove: (() => void) | undefined;
  const deliver = (url: string | undefined) => { if (!disposed && url) callback(url); };
  void App.addListener('appUrlOpen', event => deliver(event.url)).then(handle => {
    if (disposed) void handle.remove(); else remove = () => { void handle.remove(); };
    return App.getLaunchUrl();
  }).then(launch => deliver(launch?.url)).catch(() => {});
  return () => { disposed = true; remove?.(); };
}

export async function readLaunchUrl(): Promise<string | undefined> {
  if (!isNativePlatform()) return undefined;
  try { return (await App.getLaunchUrl())?.url; } catch { return undefined; }
}
