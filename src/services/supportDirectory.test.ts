import assert from 'node:assert/strict';
import test from 'node:test';
import { searchSupportResources, supportResources } from './supportDirectory.ts';

test('support directory provides source-linked South African contact options', () => {
  assert.ok(supportResources.length >= 4);
  for (const resource of supportResources) {
    assert.match(resource.tel, /^[0-9]+$/u);
    assert.match(resource.sourceUrl, /^https:\/\//u);
    assert.ok(resource.serviceUrl?.startsWith('https://'));
    assert.match(resource.checkedOn, /^\d{4}-\d{2}-\d{2}$/u);
  }
});

test('support directory search matches names, service types and phone numbers', () => {
  assert.equal(searchSupportResources('SADAG')[0]?.id, 'sadag-crisis-helpline');
  assert.equal(searchSupportResources('emergency')[0]?.id, 'saps-emergency');
  assert.equal(searchSupportResources('0800 567 567')[0]?.id, 'sadag-crisis-helpline');
  assert.deepEqual(searchSupportResources('no listed service'), []);
});
