import { App as CapacitorApp } from '@capacitor/app';
import { isNativePlatform } from './runtime';

export function onAppActiveChange(callback: (isActive: boolean) => void): () => void {
  if (!isNativePlatform()) {
    const onVisibility = () => callback(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }
  let disposed = false;
  let remove: (() => void) | undefined;
  void CapacitorApp.addListener('appStateChange', state => callback(state.isActive)).then(handle => {
    if (disposed) void handle.remove(); else remove = () => { void handle.remove(); };
  }).catch(() => {});
  return () => { disposed = true; remove?.(); };
}

export function onAndroidBack(callback: (canGoBack: boolean) => void): () => void {
  if (!isNativePlatform()) return () => {};
  let disposed = false;
  let remove: (() => void) | undefined;
  void CapacitorApp.addListener('backButton', event => callback(event.canGoBack)).then(handle => {
    if (disposed) void handle.remove(); else remove = () => { void handle.remove(); };
  }).catch(() => {});
  return () => { disposed = true; remove?.(); };
}

export function exitNativeApp(): void {
  if (isNativePlatform()) void CapacitorApp.exitApp();
}
