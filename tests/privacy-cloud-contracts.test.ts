import assert from 'node:assert/strict';
import test from 'node:test';
import { createReviewedTextRequest, parseCloudProcessingCapability, parseCloudUnderstandingResult } from '../src/services/privacy/cloudProcessingContracts.ts';

test('cloud capability accepts disabled and configured provider contracts only', () => {
  assert.deepEqual(parseCloudProcessingCapability({
    provider: 'disabled', enabled: false, accepts: 'reviewed_pseudonymised_text', maxCharacters: 4000,
  }), { provider: 'disabled', enabled: false, accepts: 'reviewed_pseudonymised_text', maxCharacters: 4000 });
  assert.equal(parseCloudProcessingCapability({
    provider: 'openai_decisions', enabled: true, accepts: 'reviewed_pseudonymised_text', maxCharacters: 4000,
  }).provider, 'openai_decisions');
  assert.throws(() => parseCloudProcessingCapability({
    provider: 'disabled', enabled: true, accepts: 'reviewed_pseudonymised_text', maxCharacters: 4000,
  }), /invalid privacy capability/);
  assert.throws(() => parseCloudProcessingCapability({
    provider: 'openai_gibberish', enabled: true, accepts: 'reviewed_pseudonymised_text', maxCharacters: 4000,
  }), /invalid privacy capability/);
});

test('cloud request body contains only the reviewed transformed text and its binding metadata', () => {
  const body = createReviewedTextRequest({
    text: 'Person 1 met Place 1.', revision: 'private-rev:nonce', sha256: 'a'.repeat(64), purpose: 'Review context',
  });
  assert.deepEqual(Object.keys(body).sort(), ['purpose', 'reviewed', 'revision', 'sha256', 'text']);
  assert.equal(body.reviewed, true);
  assert.equal(body.text, 'Person 1 met Place 1.');
});

test('cloud interpretation response must bind to the exact reviewed revision, digest and purpose', () => {
  const expected = { revision: 'source-revision:nonce', sha256: 'a'.repeat(64), purpose: 'Understand the passage' };
  const response = {
    provider: 'openai_responses', model: 'configured-model', decision: 'review', rationale: 'Ambiguous reference.',
    review: expected, advisory: true,
  };
  assert.deepEqual(parseCloudUnderstandingResult(response, expected), response);
  assert.throws(() => parseCloudUnderstandingResult({ ...response, review: { ...expected, sha256: 'b'.repeat(64) } }, expected), /did not match/);
  assert.throws(() => parseCloudUnderstandingResult({ ...response, advisory: false }, expected), /did not match/);
  const decisionsResponse = {
    provider: 'openai_decisions', model: 'gpt-6-luna', decision: 'review', explanation: 'The passage needs a human review.',
    confidence: 0.8, review: expected, advisory: true,
  };
  assert.deepEqual(parseCloudUnderstandingResult(decisionsResponse, expected), decisionsResponse);
  assert.deepEqual(parseCloudUnderstandingResult({ ...decisionsResponse, confidence: null }, expected), { ...decisionsResponse, confidence: null });
  assert.throws(() => parseCloudUnderstandingResult({ ...decisionsResponse, confidence: 1.5 }, expected), /did not match/);
  assert.throws(() => parseCloudUnderstandingResult({
    provider: 'openai_decisions', model: 'gpt-6-luna', decision: 'review', explanation: 'Review.', review: expected, advisory: true,
  }, expected), /did not match/);
});
