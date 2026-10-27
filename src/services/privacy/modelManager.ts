import type { ModelManager, ModelManifest, ModelPackageStore, ModelState } from './contracts.ts';

/** Platform-neutral installation coordinator. A streaming downloader and a
 * persistent, atomic platform store must be supplied by the integration. */
export function createModelManager(
  manifest: ModelManifest,
  store: ModelPackageStore,
  download: (url: string, progress: (received: number) => void) => Promise<Uint8Array>,
  supported = true,
): ModelManager {
  let state: ModelState = { status: supported ? 'not_installed' : 'unsupported' };
  let operation: Promise<void> | undefined;
  const totalBytes = manifest.artifacts.reduce((sum, file) => sum + file.bytes, 0);
  if (!/^[a-zA-Z0-9_.-]+$/.test(manifest.id) || !/^[a-zA-Z0-9_.-]+$/.test(manifest.version)
    || !Number.isSafeInteger(totalBytes) || !manifest.artifacts.length || new Set(manifest.artifacts.map(a => a.name)).size !== manifest.artifacts.length
    || manifest.artifacts.some(a => !Number.isSafeInteger(a.bytes) || a.bytes <= 0 || !/^[a-f0-9]{64}$/.test(a.sha256)
      || !/^[a-zA-Z0-9_.-]+$/.test(a.name) || !a.url.startsWith('https://'))) {
    throw new Error('Invalid model manifest');
  }
  return {
    state: () => ({ ...state }),
    async isInstalled() {
      if (!supported) return false;
      const installed = await store.has(manifest.id, manifest.version);
      if (!operation) state = installed ? { status: 'ready', version: manifest.version } : { status: 'not_installed' };
      return installed;
    },
    async install() {
      if (!supported) throw new Error('Model runtime unsupported');
      if (operation) return operation;
      operation = (async () => {
        try {
          if (await store.has(manifest.id, manifest.version)) {
            state = { status: 'ready', version: manifest.version };
            return;
          }
          const files = new Map<string, Uint8Array>();
          let completed = 0;
          state = { status: 'downloading', receivedBytes: 0, totalBytes };
          for (const artifact of manifest.artifacts) {
            const bytes = await download(artifact.url, received => {
              state = { status: 'downloading', receivedBytes: completed + Math.max(0, Math.min(received, artifact.bytes)), totalBytes };
            });
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))), b => b.toString(16).padStart(2, '0')).join('');
            if (bytes.byteLength !== artifact.bytes || hash !== artifact.sha256) throw new Error('Model integrity mismatch');
            files.set(artifact.name, bytes);
            completed += bytes.byteLength;
          }
          await store.commit(manifest, files);
          state = { status: 'ready', version: manifest.version };
        } catch {
          state = { status: 'failed', reason: 'installation_failed' };
          throw new Error('Model installation failed');
        }
      })();
      try { await operation; } finally { operation = undefined; }
    },
    async remove() {
      if (operation) throw new Error('Model installation in progress');
      await store.remove(manifest.id, manifest.version);
      state = { status: supported ? 'not_installed' : 'unsupported' };
    },
  };
}
