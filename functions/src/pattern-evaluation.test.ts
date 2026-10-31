import test from 'node:test';
import assert from 'node:assert/strict';
import type { PatternAssessment } from './pattern-intelligence.js';
import { summarizePatternEvaluation } from './pattern-evaluation.js';

const assessment = (overrides: Partial<PatternAssessment> = {}): PatternAssessment => ({
  provider: 'openai_decisions',
  model: 'gpt-6-luna',
  patterns: [
    { id: 'financial_abuse', title: 'Financial control', explanation: 'Text signal.', probability: 0.82, band: 'possible_indication' },
    { id: 'physical_abuse', title: 'Physical aggression', explanation: 'Text signal.', probability: 0.18, band: 'not_indicated' },
  ],
  immediateSafety: { probability: 0.1, band: 'not_indicated' },
  engagement: { timing: 'on_request', primary: 'pattern_insight', offers: ['explore_pattern', 'talk_with_lu', 'view_support'], urgentSupport: false },
  review: { revision: 'fixture', sha256: 'a'.repeat(64), purpose: 'synthetic evaluation' },
  advisory: true,
  ...overrides,
});

test('scores qualitative expectations at the product display threshold', () => {
  const result = summarizePatternEvaluation(assessment(), {
    patterns: ['financial_abuse'],
    notExpectedPatterns: ['physical_abuse'],
    immediateSafety: false,
  });
  assert.deepEqual(result.positive.matched, ['financial_abuse']);
  assert.deepEqual(result.negative.matched, ['physical_abuse']);
  assert.equal(result.immediateSafety.matched, true);
  assert.equal(result.matchesAnnotatedExpectations, true);
});

test('reports missed positives, false positives, and unknown safety separately', () => {
  const current = assessment({
    patterns: [
      { id: 'financial_abuse', title: 'Financial control', explanation: 'Text signal.', probability: 0.2, band: 'not_indicated' },
      { id: 'physical_abuse', title: 'Physical aggression', explanation: 'Text signal.', probability: 0.75, band: 'possible_indication' },
    ],
    immediateSafety: { probability: null, band: 'unknown' },
  });
  const result = summarizePatternEvaluation(current, {
    patterns: ['financial_abuse'],
    notExpectedPatterns: ['physical_abuse'],
    immediateSafety: false,
  });
  assert.deepEqual(result.positive.missed, ['financial_abuse']);
  assert.deepEqual(result.negative.falsePositives, ['physical_abuse']);
  assert.deepEqual(result.unreviewedSignals, []);
  assert.deepEqual(result.immediateSafety, { expected: false, observed: null, matched: null });
  assert.equal(result.matchesAnnotatedExpectations, false);
});

test('does not count a model signal as an annotation match when that category was not reviewed', () => {
  const current = assessment({ patterns: [
    { id: 'financial_abuse', title: 'Financial control', explanation: 'Text signal.', probability: 0.82, band: 'possible_indication' },
    { id: 'physical_abuse', title: 'Physical aggression', explanation: 'Text signal.', probability: 0.8, band: 'possible_indication' },
  ] });
  const result = summarizePatternEvaluation(current, {
    patterns: ['financial_abuse'],
    notExpectedPatterns: [],
    immediateSafety: false,
  });
  assert.deepEqual(result.unreviewedSignals, ['physical_abuse']);
  assert.equal(result.matchesAnnotatedExpectations, false);
});

test('keeps refusal and null probabilities unavailable for positive and negative annotations', () => {
  const current = assessment({ patterns: [
    { id: 'financial_abuse', title: 'Financial control', explanation: 'Text signal.', probability: null, band: 'unknown' },
    { id: 'physical_abuse', title: 'Physical aggression', explanation: 'Text signal.', probability: null, band: 'unknown' },
  ] });
  const result = summarizePatternEvaluation(current, {
    patterns: ['financial_abuse'],
    notExpectedPatterns: ['physical_abuse'],
    immediateSafety: false,
  });
  assert.deepEqual(result.unavailable, {
    positive: ['financial_abuse'],
    negative: ['physical_abuse'],
  });
  assert.deepEqual(result.positive.matched, []);
  assert.deepEqual(result.positive.missed, []);
  assert.deepEqual(result.negative.matched, []);
  assert.deepEqual(result.negative.falsePositives, []);
  assert.equal(result.matchesAnnotatedExpectations, false);
});

