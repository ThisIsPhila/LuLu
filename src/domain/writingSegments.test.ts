import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCompletedWritingInput } from './writingSegments.ts';

test('one newline keeps the writing in the editor', () => {
  assert.equal(extractCompletedWritingInput('A thought', 'A thought\n', 10), null);
});

test('two newlines move the completed paragraph and leave following text in the editor', () => {
  assert.deepEqual(
    extractCompletedWritingInput('A thought', 'A thought\n\nContinue here', 11),
    { paragraphs: ['A thought'], remainingText: 'Continue here' },
  );
});

test('a blank line already present in the previous value does not trigger twice', () => {
  assert.equal(extractCompletedWritingInput('A thought\n\n', 'A thought\n\nmore', 11), null);
});

test('a new separator can release earlier complete paragraphs in order', () => {
  assert.deepEqual(
    extractCompletedWritingInput('First\n\nSecond', 'First\n\nSecond\n\n', 15),
    { paragraphs: ['First', 'Second'], remainingText: '' },
  );
});
