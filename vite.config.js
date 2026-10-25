import { defineConfig } from 'vite';
import { resolve } from 'node:path';

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
  };
});
