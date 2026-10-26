import { isNativePlatform } from '../platform/runtime';

/** Register only the generated main-app worker; never run it during dev or demo. */
export function registerOfflineShell(): void {
  const build = (import.meta as ImportMeta & { env: { PROD: boolean; MODE: string } }).env;
  // Native WebViews own their bundle and lifecycle. A web-origin service worker
  // can race Capacitor's local asset server and is unnecessary offline.
  if (isNativePlatform() || !build.PROD || build.MODE !== 'app' || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register('/offline-shell-worker.js', { scope: '/' }).catch(() => {
    // Online auth remains available even if offline shell installation is unavailable.
  });
}
