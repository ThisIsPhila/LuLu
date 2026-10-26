import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createOfflineWorkerSource } from './scripts/offline-shell-worker.mjs';

const OFFLINE_PUBLIC_ASSETS = [
  '/media/brand/lu-mark-black.png',
  '/media/brand/lu-mark-white.png',
  '/media/brand/lulu-wordmark-black.png',
  '/media/brand/lulu-wordmark-white.png',
];

function offlineShellPlugin() {
  let indexHtml = '';
  return {
    name: 'lulu-offline-shell',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        indexHtml = html;
        return html;
      },
    },
    generateBundle(_options, bundle) {
      const assets = [{ url: '/index.html', content: indexHtml }];
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.startsWith('assets/') && !fileName.endsWith('.map')) {
          assets.push({
            url: `/${fileName}`,
            content: output.type === 'chunk' ? output.code : output.source,
          });
        }
      }
      for (const url of OFFLINE_PUBLIC_ASSETS) {
        assets.push({ url, content: readFileSync(resolve('public', url.slice(1))) });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'offline-shell-worker.js',
        source: createOfflineWorkerSource(assets),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    root: demo ? 'demo' : '.',
    base: demo ? './' : '/',
    resolve: { dedupe: ['@firebase/app'] },
    build: {
      outDir: demo ? '../dist/demo' : 'dist/app',
      emptyOutDir: true,
      ...(demo ? { rollupOptions: { input: { index: resolve('demo/index.html'), legacy: resolve('demo/legacy.html') } } } : {}),
    },
    plugins: demo ? [] : [offlineShellPlugin()],
  };
});
