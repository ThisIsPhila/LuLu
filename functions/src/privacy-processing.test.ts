import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
 configuredProvider,
  createOpenAIDecisionsProvider, createOpenAIResponsesProvider, disabledProvider, privacyCapability,
  validateReviewedPrivacyRequest,
} from './privacy-processing.js';

const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const reviewed = (text = 'I work at [ORG_1] in [CITY_1].') => ({
  text, revision: 'entry-r4', sha256: digest(text), purpose: 'Check contextual identification risk', reviewed: true,
});

test('reviewed request accepts exact hash and bounded explicit contract', () => {
  assert.deepEqual(validateReviewedPrivacyRequest(reviewed()), reviewed());
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed(), sha256: '0'.repeat(64)}), /changed/);
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed(), reviewed: false}), /Invalid/);
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed(), originalText: 'raw content'}), /Invalid/);
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed(), raw: 'raw content'}), /Invalid/);
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed(), text: '  ', sha256: digest('  ')}), /Invalid/);
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed('x'.repeat(4_001))}), /Invalid/);
  assert.throws(() => validateReviewedPrivacyRequest({...reviewed('a\u0000b')}), /Invalid/);
});

test('Decisions is the keyed default, explicit disable is respected, and Responses requires its model', () => {
  assert.equal(configuredProvider({}).enabled, false);
  assert.equal(configuredProvider({}, 'key').id, 'openai_decisions');
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'disabled'}, 'key').enabled, false);
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'openai_decisions'}).enabled, false);
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'openai_responses'}).enabled, false);
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'unknown', OPENAI_RESPONSES_MODEL: 'model'}, 'key').enabled, false);
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'openai_responses', OPENAI_RESPONSES_MODEL: 'gpt-4o-mini'}, '').enabled, false);
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'openai_decisions'}, 'key').id, 'openai_decisions');
  assert.equal(configuredProvider({PRIVACY_PROVIDER: 'openai_responses', OPENAI_RESPONSES_MODEL: 'gpt-4o-mini'}, 'key').id, 'openai_responses');
  assert.deepEqual(privacyCapability(disabledProvider), {
    provider: 'disabled', enabled: false, accepts: 'reviewed_pseudonymised_text', maxCharacters: 4_000,
  });
});

const decisionAnswer = (choice = 'review', confidence = 0.84) => ({
  model: 'gpt-6-luna',
  answers: [{
    type: 'choice', name: 'contextual_identification_risk', choice, confidence,
    probabilities: [
      {value: 'low', probability: 0.08}, {value: 'review', probability: 0.84},
      {value: 'high', probability: 0.06}, {value: 'unknown', probability: 0.02},
    ],
  }],
});

test('Decisions adapter sends only reviewed pseudonymised text and returns typed choice with fixed app explanation', async () => {
  let sent: {url: string; init: RequestInit} | undefined;
  const provider = createOpenAIDecisionsProvider({
    apiKey: 'test-secret',
    fetcher: async (url, init) => {
      sent = {url, init};
      return new Response(JSON.stringify(decisionAnswer()), {status: 200});
    },
  });
  const request = validateReviewedPrivacyRequest(reviewed());
  const result = await provider.understand(request, AbortSignal.timeout(100));
  assert.equal(sent?.url, 'https://api.openai.com/v1/decisions');
  assert.equal(sent?.init.method, 'POST');
  assert.equal((sent?.init.headers as Record<string, string>).Authorization, 'Bearer test-secret');
  const payload = JSON.parse(String(sent?.init.body));
  assert.equal(payload.model, 'gpt-6-luna');
  assert.equal(payload.input[0].role, 'developer');
  assert.equal(payload.input[1].role, 'user');
  assert.match(payload.input[1].content[0].text, /\[ORG_1\]/);
  assert.match(payload.input[1].content[0].text, /Declared purpose: Check contextual identification risk/);
  assert.equal(JSON.stringify(payload).includes('originalText'), false);
  assert.equal(payload.questions[0].type, 'choice');
  assert.equal(payload.questions[0].name, 'contextual_identification_risk');
  assert.deepEqual(result, {
    provider: 'openai_decisions', model: 'gpt-6-luna', decision: 'review', confidence: 0.84,
    explanation: 'The service selected review because the combined details may identify someone. Check the text yourself.',
    review: {revision: request.revision, sha256: request.sha256, purpose: request.purpose}, advisory: true,
  });
});

test('Decisions refusal maps to unknown with fixed explanation and no fabricated confidence', async () => {
  const provider = createOpenAIDecisionsProvider({
    apiKey: 'test-secret',
    fetcher: async () => new Response(JSON.stringify({model: 'gpt-6-luna', answers: [{type: 'refusal', name: 'contextual_identification_risk'}]}), {status: 200}),
  });
  const request = validateReviewedPrivacyRequest(reviewed());
  const result = await provider.understand(request);
  assert.deepEqual(result, {
    provider: 'openai_decisions', model: 'gpt-6-luna', decision: 'unknown', confidence: null,
    explanation: 'The service declined to classify this text. Review the text yourself.',
    review: {revision: request.revision, sha256: request.sha256, purpose: request.purpose}, advisory: true,
  });
});

test('Decisions adapter rejects malformed choices, probabilities and upstream failures', async () => {
  const withBody = (body: unknown, status = 200) => createOpenAIDecisionsProvider({
    apiKey: 'test-secret', fetcher: async () => new Response(JSON.stringify(body), {status}),
  });
  await assert.rejects(withBody({}, 429).understand(validateReviewedPrivacyRequest(reviewed())), /request failed/);
  await assert.rejects(withBody({model: 'gpt-6-luna', answers: []}).understand(validateReviewedPrivacyRequest(reviewed())), /invalid result/);
  await assert.rejects(withBody(decisionAnswer('bad')).understand(validateReviewedPrivacyRequest(reviewed())), /invalid result/);
  const wrongProbabilities = decisionAnswer();
  wrongProbabilities.answers[0].probabilities.pop();
  await assert.rejects(withBody(wrongProbabilities).understand(validateReviewedPrivacyRequest(reviewed())), /invalid result/);
});

test('Responses adapter sends only reviewed pseudonymised text and validates bounded structured output', async () => {
  let sent: {url: string; init: RequestInit} | undefined;
  const provider = createOpenAIResponsesProvider({
    apiKey: 'test-secret', model: 'gpt-4o-mini',
    fetcher: async (url, init) => {
      sent = {url, init};
      return new Response(JSON.stringify({output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify({decision: 'review', rationale: 'The combined details may identify someone.'})}]}]}), {status: 200});
    },
  });
  const request = validateReviewedPrivacyRequest(reviewed());
  const result = await provider.understand(request, AbortSignal.timeout(100));
  assert.equal(sent?.url, 'https://api.openai.com/v1/responses');
  const payload = JSON.parse(String(sent?.init.body));
  assert.equal(payload.store, false);
  assert.equal(payload.model, 'gpt-4o-mini');
  assert.match(payload.input, /\[ORG_1\]/);
  assert.equal(payload.input.includes('originalText'), false);
  assert.deepEqual(result, {
    provider: 'openai_responses', model: 'gpt-4o-mini', decision: 'review',
    rationale: 'The combined details may identify someone.',
    review: {revision: request.revision, sha256: request.sha256, purpose: request.purpose}, advisory: true,
  });
});

test('Responses adapter rejects provider errors and invalid or oversized decisions', async () => {
  const withBody = (body: unknown, status = 200) => createOpenAIResponsesProvider({
    apiKey: 'test-secret', model: 'model-1',
    fetcher: async () => new Response(JSON.stringify(body), {status}),
  });
  await assert.rejects(withBody({}, 429).understand(validateReviewedPrivacyRequest(reviewed())), /request failed/);
  await assert.rejects(withBody({output: []}).understand(validateReviewedPrivacyRequest(reviewed())), /invalid result/);
  await assert.rejects(withBody({output: [{type: 'message', content: [{type: 'output_text', text: '{"decision":"nope","rationale":"x"}'}]}]}).understand(validateReviewedPrivacyRequest(reviewed())), /invalid result/);
  await assert.rejects(withBody({output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify({decision: 'high', rationale: 'x'.repeat(401)})}]}]}).understand(validateReviewedPrivacyRequest(reviewed())), /invalid result/);
});
