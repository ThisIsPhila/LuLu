import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createOfflineWorkerSource } from '../scripts/offline-shell-worker.mjs';

const assets = [
  { url: '/index.html', content: '<!doctype html><script src="/assets/app.js"></script>' },
  { url: '/assets/app.js', content: 'window.app = true;' },
  { url: '/assets/app.css', content: 'body { color: black; }' },
  { url: '/media/brand/lulu-wordmark-black.png', content: Buffer.from('brand mark') },
];
const request = (url, { mode = 'cors', method = 'GET' } = {}) => ({ url, mode, method });

function createHarness(source) {
  const listeners = new Map();
  const storage = new Map();
  const deleted = [];
  let fetchImpl = async () => new Response('network');
  let failAddAll = false;
  const caches = {
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map());
      const entries = storage.get(name);
      return {
        async addAll(urls) {
          for (let index = 0; index < urls.length; index += 1) {
            if (failAddAll === 'before') throw new TypeError('precache failed');
            entries.set(urls[index], new Response(`cached:${urls[index]}`));
            if (failAddAll === 'partial' && index === 0) throw new TypeError('precache failed');
          }
        },
        async match(key) { return entries.get(typeof key === 'string' ? key : new URL(key.url).pathname); },
      };
    },
    async keys() { return [...storage.keys()]; },
    async delete(name) { deleted.push(name); return storage.delete(name); },
  };
  const self = {
    location: { origin: 'https://lulu.example' },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  vm.runInNewContext(source, { self, caches, URL, Response, Promise, fetch: (...args) => fetchImpl(...args) });

  return {
    storage,
    deleted,
    get cacheNames() { return [...storage.keys()]; },
    set fetch(value) { fetchImpl = value; },
    set addAllFailure(value) { failAddAll = value; },
    async dispatch(type, event) {
      listeners.get(type)(event);
      await event.pending;
      return event.response;
    },
    async install() {
      let pending;
      await this.dispatch('install', { waitUntil(value) { pending = value; }, get pending() { return pending; } });
    },
    async activate() {
      let pending;
      await this.dispatch('activate', { waitUntil(value) { pending = value; }, get pending() { return pending; } });
    },
    async request(request) {
      let pending;
      const event = { request, respondWith(value) { pending = value; }, get pending() { return pending; } };
      await this.dispatch('fetch', event);
      return pending ? { intercepted: true, response: await pending } : { intercepted: false };
    },
  };
}

test('worker generator accepts only the app index, generated assets and four local brand assets', () => {
  assert.doesNotThrow(() => createOfflineWorkerSource(assets));
  for (const url of [
    'https://fonts.googleapis.com/css?family=Inter', '/docs/hackathon/review.html', '/demo/index.html',
    '/functions/auth/login', '/assets/../docs/review.html', '/assets/app.js.map',
  ]) {
    assert.throws(() => createOfflineWorkerSource([
      { url: '/index.html', content: 'shell' }, { url, content: 'not part of the shell' },
    ]), /outside the app allowlist/);
  }
  assert.throws(() => createOfflineWorkerSource([{ url: '/assets/app.js', content: 'missing shell' }]), /index must be included/);
});

test('cache version is deterministic for one build and changes when any cached asset changes', () => {
  const cacheName = source => source.match(/const CACHE_NAME = CACHE_PREFIX \+ "([a-f0-9]+)";/)?.[1];
  assert.equal(cacheName(createOfflineWorkerSource(assets)), cacheName(createOfflineWorkerSource(assets)));
  assert.notEqual(cacheName(createOfflineWorkerSource(assets)), cacheName(createOfflineWorkerSource([
    ...assets.slice(0, -1), { ...assets.at(-1), content: Buffer.from('changed brand mark') },
  ])));
});

test('install precaches only allowlisted build files and activate preserves unrelated caches', async () => {
  const worker = createOfflineWorkerSource(assets);
  const harness = createHarness(worker);
  const unrelatedCache = 'third-party-library-cache';
  const oldAppCache = 'lulu-app-static-shell-v1-old';
  harness.storage.set(unrelatedCache, new Map());
  harness.storage.set(oldAppCache, new Map());

  await harness.install();
  const newCache = harness.cacheNames.find(name => name.startsWith('lulu-app-static-shell-v1-') && name !== oldAppCache);
  assert.ok(newCache);
  assert.deepEqual([...harness.storage.get(newCache).keys()].sort(), assets.map(asset => asset.url).sort());
  await harness.activate();
  assert.deepEqual(harness.deleted, [oldAppCache]);
  assert.equal(harness.storage.has(unrelatedCache), true);
});

test('failed precache removes only its partial new cache and leaves the active version intact', async () => {
  const harness = createHarness(createOfflineWorkerSource(assets));
  const active = 'lulu-app-static-shell-v1-active';
  harness.storage.set(active, new Map([['/index.html', new Response('active shell')]]));
  harness.addAllFailure = 'partial';
  await assert.rejects(harness.install(), /precache failed/);
  assert.deepEqual(harness.cacheNames, [active]);
  assert.equal(harness.deleted.length, 1);
  assert.notEqual(harness.deleted[0], active);
  assert.ok(harness.deleted[0].startsWith('lulu-app-static-shell-v1-'));
  assert.equal(await harness.storage.get(active).get('/index.html').text(), 'active shell');
});

test('failed reinstall with an existing identical build cache preserves the active cache', async () => {
  const worker = createOfflineWorkerSource(assets);
  const harness = createHarness(worker);
  const active = `lulu-app-static-shell-v1-${worker.match(/const CACHE_NAME = CACHE_PREFIX \+ "([a-f0-9]+)";/)[1]}`;
  const originalIndex = new Response('active index from same build');
  harness.storage.set(active, new Map([['/index.html', originalIndex]]));
  harness.addAllFailure = 'before';

  await assert.rejects(harness.install(), /precache failed/);
  assert.deepEqual(harness.cacheNames, [active]);
  assert.deepEqual(harness.deleted, []);
  assert.equal(await harness.storage.get(active).get('/index.html').text(), 'active index from same build');
});

test('root/index navigation is network-first and falls back only to the cached app index', async () => {
  const harness = createHarness(createOfflineWorkerSource(assets));
  await harness.install();
  harness.fetch = async () => { throw new TypeError('offline'); };
  const root = await harness.request(request('https://lulu.example/', { mode: 'navigate' }));
  assert.equal(root.intercepted, true);
  assert.equal(await root.response.text(), 'cached:/index.html');

  let onlineRequests = 0;
  harness.fetch = async () => { onlineRequests += 1; return new Response('fresh network index'); };
  const online = await harness.request(request('https://lulu.example/index.html', { mode: 'navigate' }));
  assert.equal(await online.response.text(), 'fresh network index');
  assert.equal(onlineRequests, 1);
});

test('other routes and runtime APIs are never given the app-index fallback or cached', async () => {
  const harness = createHarness(createOfflineWorkerSource(assets));
  await harness.install();
  for (const url of [
    'https://lulu.example/docs/hackathon/review.html',
    'https://lulu.example/demo/',
    'https://lulu.example/unknown/path',
    'https://lulu.example/auth/login/options',
    'https://africa-south1-khora-lulu-2026.cloudfunctions.net/api/auth/login/options',
  ]) {
    const result = await harness.request(request(url, { mode: url.includes('docs') || url.includes('demo') || url.includes('unknown') ? 'navigate' : 'cors' }));
    assert.equal(result.intercepted, false, url);
  }
});

test('built assets are cache-first while unlisted assets, queries and non-GET requests bypass the cache', async () => {
  const harness = createHarness(createOfflineWorkerSource(assets));
  await harness.install();
  let networkRequests = 0;
  harness.fetch = async () => { networkRequests += 1; return new Response('network asset'); };

  const localAsset = await harness.request(request('https://lulu.example/assets/app.js'));
  assert.equal(await localAsset.response.text(), 'cached:/assets/app.js');
  assert.equal(networkRequests, 0);

  for (const req of [
    request('https://lulu.example/assets/not-built.js'),
    request('https://lulu.example/assets/app.js?v=2'),
    request('https://lulu.example/assets/app.js', { method: 'POST' }),
  ]) {
    assert.equal((await harness.request(req)).intercepted, false);
  }
});

test('worker update stays waiting for normal lifecycle and registration does not force a reload', () => {
  const source = createOfflineWorkerSource(assets);
  assert.equal(source.includes('skipWaiting'), false);
  assert.equal(source.includes('clients.claim'), false);
});
