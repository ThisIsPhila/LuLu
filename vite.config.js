import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    root: demo ? 'demo' : '.',
    base: demo ? './' : '/',
    build: { outDir: demo ? '../dist/demo' : 'dist/app', emptyOutDir: true },
  };
});
