import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { readDisplayName, writeDisplayName } from './displayName.ts';

const entries = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => { entries.set(key, value); },
  removeItem: (key: string) => { entries.delete(key); },
}, configurable: true });

test('a greeting name is encrypted on this device and scoped to its account', async () => {
  await writeDisplayName('name-test-owner', 'Sample Name');
  assert.equal(await readDisplayName('name-test-owner'), 'Sample Name');
  assert.equal(await readDisplayName('name-test-other'), '');
  assert.equal([...entries.values()].some(value => value.includes('Sample Name')), false);
});

test('quick edits are stored in order and the last name wins', async () => {
  await Promise.all([writeDisplayName('name-test-owner', 'First'), writeDisplayName('name-test-owner', 'Final')]);
  assert.equal(await readDisplayName('name-test-owner'), 'Final');
});
