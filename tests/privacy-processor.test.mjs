import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalPrivacyProcessor, replaceDetectedSpans } from '../src/services/privacy/privacyProcessor.ts';
import { createModelManager } from '../src/services/privacy/modelManager.ts';

const span = (start, end, label = 'person') => ({ start, end, label, confidence: 0.9, detector: 'synthetic' });
test('UTF-16 source spans preserve emoji, combining marks and repeated aliases', () => {
  const input = '🌿 Noe\u0308l met Nomsa. Nomsa left.';
  const first = input.indexOf('Nomsa'), second = input.lastIndexOf('Nomsa');
  assert.equal(replaceDetectedSpans(input, [span(second, second + 5), span(first, first + 5)]), '🌿 Noe\u0308l met [PERSON_1]. [PERSON_1] left.');
  assert.throws(() => replaceDetectedSpans(input, [span(1, 2)]), /Invalid/);
  assert.throws(() => replaceDetectedSpans(input, [span(first, first + 5), span(first + 1, first + 3)]), /overlapping/);
});
test('processor uses local detection and optional existing distancing; disposed work cannot return', async () => {
  let finish;
  const processor = createLocalPrivacyProcessor({
    modelVersion: 'synthetic-only', initialise: async () => {}, dispose: async () => {},
    detect: () => new Promise(resolve => { finish = resolve; }),
  });
  await assert.rejects(processor.process('I met Nomsa.'), /not ready/);
  await processor.initialise();
  const first = processor.process('I met Nomsa.', { distance: true });
  finish([span(6, 11)]);
  assert.deepEqual(await first, { sanitised: 'She met [PERSON_1].', detectedEntities: [span(6, 11)], provider: 'local', modelVersion: 'synthetic-only', review: 'required', distancing: 'existing_phrase_rules' });
  const stale = processor.process('I met Nomsa.');
  await processor.dispose(); finish([]);
  await assert.rejects(stale, /session ended/);
});
const bytes = new Uint8Array([1, 2, 3]);
const sha256 = '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81';
const manifest = { id: 'synthetic', version: '1', license: 'test', artifacts: [{ name: 'model.onnx', url: 'https://example.invalid/model', bytes: 3, sha256 }] };
test('manager verifies complete package before atomic publication; removal is separate from runtime', async () => {
  let installed = false, downloads = 0;
  const store = { has: async () => installed, commit: async (_manifest, files) => { assert.deepEqual(files.get('model.onnx'), bytes); installed = true; }, remove: async () => { installed = false; } };
  const manager = createModelManager(manifest, store, async (_url, progress) => { downloads++; progress(3); return bytes; });
  assert.equal(await manager.isInstalled(), false);
  await Promise.all([manager.install(), manager.install()]);
  assert.equal(downloads, 1); assert.equal(manager.state().status, 'ready');
  await manager.remove(); assert.equal(await manager.isInstalled(), false);
  const bad = createModelManager(manifest, store, async () => new Uint8Array([1, 2, 4]));
  await assert.rejects(bad.install(), /installation failed/);
  assert.equal(installed, false); assert.equal(bad.state().status, 'failed');
  const unsupported = createModelManager(manifest, store, async () => bytes, false);
  await assert.rejects(unsupported.install(), /unsupported/);
  assert.equal(unsupported.state().status, 'unsupported');
});

test('journal-only needs no provider, local failure never selects a cloud demo', async () => {
  const { selectPrivacyProcessor } = await import('../src/services/privacy/selectProcessor.ts');
  assert.equal(selectPrivacyProcessor('journal_only', {}), null);
  assert.throws(() => selectPrivacyProcessor('local', { cloud_demo: { provider: 'cloud_demo' } }), /unavailable/);
  assert.throws(() => selectPrivacyProcessor('cloud_demo', { cloud_demo: { provider: 'local' } }), /unavailable/);
});
