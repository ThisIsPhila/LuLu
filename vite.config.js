import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createOfflineWorkerSource } from './scripts/offline-shell-worker.mjs';

const LOCAL_PRIVACY_MODEL_CACHE = '/tmp/lulu-privacy-spike';
const LOCAL_PRIVACY_MODEL_FILES = new Set(['model_quantized.onnx', 'tokenizer.json', 'tokenizer_config.json', 'gliner_config.json']);

function localPrivacyModelPreview() {
  const serveModelArtifact = (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.statusCode = 405; response.end(); return; }
    const filename = decodeURIComponent((request.url ?? '').split('?')[0]).replace(/^\/+/, '');
    if (!LOCAL_PRIVACY_MODEL_FILES.has(filename)) { response.statusCode = 404; response.end('Local model artifact not found.'); return; }
    const file = resolve(LOCAL_PRIVACY_MODEL_CACHE, filename);
    if (!existsSync(file)) { response.statusCode = 404; response.end('Local model artifact not found.'); return; }
    const stat = statSync(file);
    response.setHeader('Content-Length', String(stat.size));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', filename.endsWith('.json') ? 'application/json' : 'application/octet-stream');
    if (request.method === 'HEAD') { response.statusCode = 200; response.end(); return; }
    response.statusCode = 200;
    createReadStream(file).pipe(response);
  };
  const register = server => { server.middlewares.use('/__local-privacy-model', serveModelArtifact); };
  return {
    name: 'lulu-local-privacy-model-preview',
    configureServer: register,
    configurePreviewServer: register,
  };
}

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
    server: { hmr: false },
    resolve: { dedupe: ['@firebase/app'] },
    build: {
      outDir: demo ? '../dist/demo' : 'dist/app',
      emptyOutDir: true,
      ...(demo ? { rollupOptions: { input: { index: resolve('demo/index.html'), legacy: resolve('demo/legacy.html') } } } : {}),
    },
    plugins: demo ? [] : [offlineShellPlugin(), localPrivacyModelPreview()],
  };
});
