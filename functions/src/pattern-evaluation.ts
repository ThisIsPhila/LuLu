import type { PatternAssessment } from './pattern-intelligence.js';

export type PatternEvaluationExpectation = {
  patterns: readonly string[];
  notExpectedPatterns: readonly string[];
  immediateSafety: boolean;
};

export type PatternEvaluationSummary = {
  predictedPatterns: string[];
  positive: { expected: string[]; matched: string[]; missed: string[] };
  negative: { expected: string[]; matched: string[]; falsePositives: string[] };
  unavailable: { positive: string[]; negative: string[] };
  unreviewedSignals: string[];
  immediateSafety: { expected: boolean; observed: boolean | null; matched: boolean | null };
  matchesAnnotatedExpectations: boolean;
};

/** Compare qualitative synthetic labels with the product's existing display thresholds. */
export function summarizePatternEvaluation(
  assessment: PatternAssessment,
  expected: PatternEvaluationExpectation,
): PatternEvaluationSummary {
  const predictedPatterns = assessment.patterns
    .filter(pattern => pattern.probability !== null && pattern.probability >= 0.4)
    .map(pattern => pattern.id)
    .sort();
  const predicted = new Set(predictedPatterns);
  const positiveExpected = [...new Set(expected.patterns)].sort();
  const negativeExpected = [...new Set(expected.notExpectedPatterns)].sort();
  const reviewed = new Set([...positiveExpected, ...negativeExpected]);
  const probabilityById = new Map(assessment.patterns.map(pattern => [pattern.id, pattern.probability]));
  const known = (id: string) => probabilityById.get(id) ?? undefined;
  const unavailablePositive = positiveExpected.filter(id => known(id) === undefined || known(id) === null);
  const unavailableNegative = negativeExpected.filter(id => known(id) === undefined || known(id) === null);
  const matchedPositive = positiveExpected.filter(id => known(id) !== undefined && known(id) !== null && known(id)! >= 0.4);
  const missedPositive = positiveExpected.filter(id => known(id) !== undefined && known(id) !== null && known(id)! < 0.4);
  const matchedNegative = negativeExpected.filter(id => known(id) !== undefined && known(id) !== null && known(id)! < 0.4);
  const falsePositives = negativeExpected.filter(id => known(id) !== undefined && known(id) !== null && known(id)! >= 0.4);
  const unreviewedSignals = predictedPatterns.filter(id => !reviewed.has(id));
  const safetyProbability = assessment.immediateSafety.probability;
  const observedSafety = safetyProbability === null ? null : safetyProbability >= 0.65;

  return {
    predictedPatterns,
    positive: { expected: positiveExpected, matched: matchedPositive, missed: missedPositive },
    negative: { expected: negativeExpected, matched: matchedNegative, falsePositives },
    unavailable: { positive: unavailablePositive, negative: unavailableNegative },
    unreviewedSignals,
    immediateSafety: {
      expected: expected.immediateSafety,
      observed: observedSafety,
      matched: observedSafety === null ? null : observedSafety === expected.immediateSafety,
    },
    matchesAnnotatedExpectations: missedPositive.length === 0 && falsePositives.length === 0
      && unavailablePositive.length === 0 && unavailableNegative.length === 0
      && unreviewedSignals.length === 0
      && observedSafety !== null && observedSafety === expected.immediateSafety,
  };
}

