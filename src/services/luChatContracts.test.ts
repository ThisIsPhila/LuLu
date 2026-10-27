import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLuChatResult, parseLuScrubResult, validateLuChatInput, validateLuChatLanguage } from './luChatContracts.ts';

test('accepts bounded scrub and chat contracts', () => {
  const ticket = '123e4567-e89b-12d3-a456-426614174000';
  assert.deepEqual(parseLuScrubResult({ scrubbed: 'Person A asked for help.', ticket }), { scrubbed: 'Person A asked for help.', ticket });
  assert.deepEqual(parseLuChatResult({ reply: 'I can help you find support information.' }), { reply: 'I can help you find support information.' });
  assert.equal(validateLuChatInput('  Help me find Settings.  '), 'Help me find Settings.');
  assert.equal(validateLuChatLanguage('Afrikaans'), 'Afrikaans');
});

test('fails closed for malformed, empty, oversized, or unsupported responses and input', () => {
  assert.throws(() => parseLuScrubResult({ scrubbed: '', ticket: 'x' }));
  assert.throws(() => parseLuScrubResult({ scrubbed: 'Person A', ticket: '' }));
  assert.throws(() => parseLuChatResult({ reply: 'x'.repeat(8_001) }));
  assert.throws(() => validateLuChatInput('  '));
  assert.throws(() => validateLuChatInput('x'.repeat(4_001)));
  assert.throws(() => validateLuChatLanguage('French'));
});
