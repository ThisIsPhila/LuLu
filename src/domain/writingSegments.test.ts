import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {splitCompletedSegments} from './writingSegments.ts';

test('a single line break stays in the editable draft', () => {
  assert.deepEqual(splitCompletedSegments('first\nsecond'), {completed: [], draft: 'first\nsecond'});
});
test('two line breaks move the preceding segment into the workspace', () => {
  assert.deepEqual(splitCompletedSegments('first\n\nsecond\n\nthird'), {completed: ['first', 'second'], draft: 'third'});
  assert.deepEqual(splitCompletedSegments('first\r\n\r\n'), {completed: ['first'], draft: ''});
});
