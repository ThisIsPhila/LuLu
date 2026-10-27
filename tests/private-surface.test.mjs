import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateSurface } from '../src/domain/privacy/privateSurface.ts';

test('an unlocked session never adds private controls to ordinary screens', () => {
  const context = { editingOrdinaryEntry: false, hasPrivatePreview: false, readingProtectedEntry: false };
  for (const view of ['home', 'leaves', 'stories', 'library', 'settings', 'model-settings', 'reader', 'privacy-demo']) {
    assert.equal(isPrivateSurface(view, context), false, view);
  }
  assert.equal(isPrivateSurface('compose', { ...context, editingOrdinaryEntry: true }), false);
});

test('the private editor, protected reader and private review retain an exit surface', () => {
  const context = { editingOrdinaryEntry: false, hasPrivatePreview: false, readingProtectedEntry: false };
  for (const view of ['local-private', 'inspector', 'enclave-writing', 'compose']) assert.equal(isPrivateSurface(view, context), true, view);
  assert.equal(isPrivateSurface('reader', { ...context, readingProtectedEntry: true }), true);
  assert.equal(isPrivateSurface('privacy-demo', { ...context, hasPrivatePreview: true }), true);
});
