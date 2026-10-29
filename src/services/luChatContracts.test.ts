import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLuChatResult, parseLuScrubResult, validateLuChatInput, validateLuChatLanguage } from './luChatContracts.ts';

test('accepts bounded scrub and chat contracts', () => {
  const ticket = '123e4567-e89b-12d3-a456-426614174000';
  const original='David asked for help.';
  const scrubbed={scrubbed:'Person A asked for help.',entities:[{start:0,end:5,label:'Person',replacement:'Person A'}],ticket};
  assert.deepEqual(parseLuScrubResult(scrubbed,original),scrubbed);
  assert.throws(()=>parseLuScrubResult({...scrubbed,scrubbed:'Person B asked for help.'},original));
  assert.deepEqual(parseLuChatResult({ reply: 'I can help you find support information.', actions: [], references: [] }), { reply: 'I can help you find support information.', actions: [], references: [] });
  assert.deepEqual(parseLuChatResult({ reply: 'Opening Settings.', actions: [{kind:'navigate',destination:'settings'}], references: [] }).actions,[{kind:'navigate',destination:'settings'}]);
  assert.equal(validateLuChatInput('  Help me find Settings.  '), 'Help me find Settings.');
  assert.equal(validateLuChatLanguage('Afrikaans'), 'Afrikaans');
  assert.equal(validateLuChatLanguage('auto'), 'auto');
});

test('fails closed for malformed, empty, oversized, or unsupported responses and input', () => {
  assert.throws(() => parseLuScrubResult({ scrubbed: '', entities:[], ticket: 'x' },''));
  assert.throws(() => parseLuScrubResult({ scrubbed: 'Person A', entities:[], ticket: '' },'David'));
  assert.throws(() => parseLuChatResult({ reply: 'x'.repeat(8_001), actions: [], references: [] }));
  assert.throws(() => parseLuChatResult({ reply: 'Lu', actions: [{kind:'navigate',destination:'outside'}], references: [] }));
  assert.throws(() => parseLuChatResult({ reply: 'Lu', actions: [], references: [{reference:'entry_1',entryId:'entry-id',kind:'Journal',title:'A title',content:'x'.repeat(1_401)}] }));
  assert.throws(() => validateLuChatInput('  '));
  assert.throws(() => validateLuChatInput('x'.repeat(4_001)));
  assert.throws(() => validateLuChatLanguage('French'));
});
