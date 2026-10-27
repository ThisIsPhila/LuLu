import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseNavigationProposal } from './actions.ts';

test('voice navigation accepts only known destinations and exact arguments', () => {
  assert.deepEqual(parseNavigationProposal({ destination: 'journal' }), { destination: 'journal' });
  for (const value of [null, [], { destination: 'delete' }, { destination: 'settings', extra: true }, { destination: 1 }]) {
    assert.equal(parseNavigationProposal(value), null);
  }
});
