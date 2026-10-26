import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bindOnboardingDraft, clearOnboardingDraft, loadOnboardingDraft,
  saveFirstOnboardingEntry, saveOnboardingProgress,
} from '../src/services/onboardingDraft.ts';

test('onboarding progress and first writing survive reload only as encrypted local data', async () => {
  const state = { name: 'Alex', intentions: ['Capture thoughts'], firstEntryText: 'A private thought', prompt: null, supportChoice: null };
  const initial = await saveOnboardingProgress(6, state);
  assert.equal(initial.screen, 6);
  assert.equal(initial.entrySaved, false);
  const recordDatabase = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lulu.onboarding-draft.v1');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const raw = await new Promise((resolve, reject) => {
    const request = recordDatabase.transaction('records', 'readonly').objectStore('records').get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  recordDatabase.close();
  assert.ok(raw.ciphertext instanceof ArrayBuffer);
  assert.equal(JSON.stringify(raw).includes('A private thought'), false);
  const saved = await saveFirstOnboardingEntry('A private thought', null, state);
  assert.equal(saved.id, initial.id);
  assert.equal(saved.entrySaved, true);
  const restored = await loadOnboardingDraft();
  assert.equal(restored.state.firstEntryText, 'A private thought');
  assert.equal(restored.entrySaved, true);
  await Promise.all([
    saveOnboardingProgress(4, { ...state, firstEntryText: 'Changed once' }),
    saveOnboardingProgress(4, { ...state, firstEntryText: 'Changed twice' }),
  ]);
  const updated = await loadOnboardingDraft();
  assert.equal(updated.state.firstEntryText, 'Changed twice');
  assert.equal(updated.entrySaved, false, 'editing a saved entry requires another explicit save');
  const bound = await bindOnboardingDraft('test-account');
  assert.equal(bound.ownerUid, 'test-account');
  await assert.rejects(() => bindOnboardingDraft('another-account'), /another account/);
  await clearOnboardingDraft(saved.id);
  assert.equal(await loadOnboardingDraft(), null);
});
