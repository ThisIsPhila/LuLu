#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MODEL = 'gpt-6-luna';
const PURPOSE = 'Evaluate fictional synthetic journal text for observable behaviour patterns';
const MAX_CASES_PER_RUN = 8;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
const DEFAULT_FIXTURES = resolve(REPO_ROOT, 'docs/testing/pattern-classification-fixtures.json');
const DEFAULT_OUTPUT = resolve(REPO_ROOT, 'docs/testing/pattern-classification-live-results.json');

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function validateFixtureSet(value) {
  if (!value || typeof value !== 'object' || value.source !== 'fictional_synthetic'
      || !Array.isArray(value.cases) || !Array.isArray(value.taxonomy) || value.cases.length === 0) {
    throw new Error('Fixture file must declare fictional_synthetic source, taxonomy, and at least one case.');
  }
  const ids = new Set();
  for (const item of value.cases) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()
        || ids.has(item.id) || typeof item.body !== 'string' || !item.body.trim()
        || item.body.length > 4_000 || !item.expected || typeof item.expected !== 'object'
        || !Array.isArray(item.expected.patterns) || !Array.isArray(item.expected.notExpectedPatterns)
        || typeof item.expected.immediateSafety !== 'boolean') {
      throw new Error('Fixture file contains an invalid case; no cloud request was sent.');
    }
    ids.add(item.id);
    const declared = new Set(value.taxonomy);
    for (const category of [...item.expected.patterns, ...item.expected.notExpectedPatterns]) {
      if (typeof category !== 'string' || !declared.has(category)) {
        throw new Error(`Fixture ${item.id} refers to a category outside the declared taxonomy.`);
      }
    }
    if (item.expected.patterns.some(category => item.expected.notExpectedPatterns.includes(category))) {
      throw new Error(`Fixture ${item.id} marks the same category positive and negative.`);
    }
  }
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const fixturePath = resolve(optionValue(args, '--fixtures') ?? DEFAULT_FIXTURES);
  const fixture = validateFixtureSet(JSON.parse(await readFile(fixturePath, 'utf8')));
  const fixtureLastModifiedAt = new Date((await stat(fixturePath)).mtimeMs).toISOString();
  const { assessBehaviourPatterns, validateReviewedPrivacyRequest, summarizePatternEvaluation, BEHAVIOUR_PATTERNS } = await loadAdapters();
  const apiTaxonomy = BEHAVIOUR_PATTERNS.map(item => item.id).sort();
  const fixtureTaxonomy = [...fixture.taxonomy].sort();
  if (JSON.stringify(apiTaxonomy) !== JSON.stringify(fixtureTaxonomy)) {
    throw new Error('Fixture taxonomy does not exactly match the current Decisions category set.');
  }
  if (args.includes('--reconcile')) {
    const reportPath = resolve(optionValue(args, '--report') ?? DEFAULT_OUTPUT);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    if (report.source !== 'fictional_synthetic' || !Array.isArray(report.cases)) {
      throw new Error('Only a synthetic fixture report can be reconciled.');
    }
    if (report.fixturePath && resolve(REPO_ROOT, report.fixturePath) !== fixturePath) {
      throw new Error('The saved assessment references a different fixture file.');
    }
    if (!Number.isFinite(Date.parse(report.evaluatedAt)) || Date.parse(report.evaluatedAt) < Date.parse(fixtureLastModifiedAt)) {
      throw new Error('The fixture changed after this assessment. Re-run the affected case before reconciling.');
    }
    const byId = new Map(fixture.cases.map(item => [item.id, item]));
    for (const item of report.cases) {
      const source = byId.get(item.id);
      if (!source || !Array.isArray(item.signals) || !item.immediateSafety) {
        throw new Error(`Report case ${item.id ?? 'unknown'} does not match a current fixture.`);
      }
      const inputSha256 = createHash('sha256').update(source.body, 'utf8').digest('hex');
      if (!item.inputSha256) {
        throw new Error(`Report case ${item.id} has no digest recorded during the live request. Re-run this case before reconciling.`);
      }
      if (item.inputSha256 !== inputSha256) {
        throw new Error(`Fixture body ${item.id} changed since its assessment. Re-run this case before reconciling.`);
      }
      item.evaluation = summarizePatternEvaluation({
        provider: 'openai_decisions',
        model: MODEL,
        patterns: item.signals.map(signal => ({
          ...signal,
          title: signal.id,
          explanation: '',
        })),
        immediateSafety: item.immediateSafety,
        engagement: { timing: 'on_request', primary: 'none', offers: ['view_support'], urgentSupport: false },
        review: { revision: `synthetic-${item.id}`, sha256: '0'.repeat(64), purpose: PURPOSE },
        advisory: true,
      }, {
        patterns: source.expected.patterns,
        notExpectedPatterns: source.expected.notExpectedPatterns,
        immediateSafety: source.expected.immediateSafety,
      });
    }
    report.summary.casesMatchingAnnotations = report.cases.filter(item => item.evaluation.matchesAnnotatedExpectations).length;
    report.summary.casesNeedingHumanReview = report.cases.filter(item => !item.evaluation.matchesAnnotatedExpectations).map(item => item.id);
    report.summary.scoring = 'Positive and clear-negative qualitative labels compare against probability >= 0.40; immediate safety compares against >= 0.65; unknown safety is unmatched. Null/refusal results for annotated categories are listed as unavailable and count as neither matches nor misses. Categories omitted from an annotation are unscored; any such model signal is listed for human review. This is annotation agreement, not a calibrated benchmark or accuracy claim.';
    report.requestPath = 'local harness using the existing Decisions adapter; no browser/app route or local inference';
    report.quotaBoundary = 'Direct provider calls do not consume or enforce LuLu account quota.';
    report.fixturePath = relative(REPO_ROOT, fixturePath);
    report.fixtureLastModifiedAt = fixtureLastModifiedAt;
    report.hashReconciliation = {
      verifiedAt: new Date().toISOString(),
      basis: 'Each inputSha256 was recorded from the validated request before its cloud call, checked against the adapter-returned review digest, and recomputed from the current fixture body.',
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    process.stdout.write(JSON.stringify({
      report: reportPath,
      caseCount: report.cases.length,
      casesMatchingAnnotations: report.summary.casesMatchingAnnotations,
      casesNeedingHumanReview: report.summary.casesNeedingHumanReview,
      cloudRequestsSent: 0,
    }, null, 2) + '\n');
    return;
  }
  const requestedId = optionValue(args, '--case');
  const cases = requestedId ? fixture.cases.filter(item => item.id === requestedId) : fixture.cases;
  if (!cases.length) throw new Error(`No fixture case matched ${requestedId}.`);
  if (cases.length > MAX_CASES_PER_RUN) throw new Error(`A live run is limited to ${MAX_CASES_PER_RUN} fixture cases; choose one with --case.`);
  const prepared = cases.map(item => {
    const sha256 = createHash('sha256').update(item.body, 'utf8').digest('hex');
    const request = validateReviewedPrivacyRequest({
      text: item.body,
      revision: `synthetic-${item.id}`.slice(0, 128),
      sha256,
      purpose: PURPOSE,
      reviewed: true,
    });
    return { item, request };
  });
  if (!args.includes('--live')) {
    process.stdout.write(JSON.stringify({
      source: fixture.source,
      fixtureSet: fixture.fixtureSet,
      validatedCases: cases.length,
      caseIds: cases.map(item => item.id),
      liveRequestsSent: 0,
    }, null, 2) + '\n');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is unavailable in this process.');
  const outputPath = resolve(optionValue(args, '--output') ?? DEFAULT_OUTPUT);
  const results = [];
  for (const { item, request } of prepared) {
    const requestPreparedAt = new Date().toISOString();
    const assessment = await assessBehaviourPatterns({ apiKey, request, signal: AbortSignal.timeout(25_000) });
    if (assessment.review.sha256 !== request.sha256) throw new Error(`Assessment hash did not match synthetic fixture ${item.id}.`);
    const evaluation = summarizePatternEvaluation(assessment, {
      patterns: item.expected.patterns,
      notExpectedPatterns: item.expected.notExpectedPatterns,
      immediateSafety: item.expected.immediateSafety,
    });
    results.push({
      id: item.id,
      title: item.title,
      model: assessment.model,
      inputSha256: request.sha256,
      requestPreparedAt,
      requestBinding: 'Validated request digest recorded before call and matched the adapter result.',
      signals: assessment.patterns.map(({ id, probability, band }) => ({ id, probability, band })),
      immediateSafety: assessment.immediateSafety,
      evaluation,
    });
    process.stderr.write(`Completed synthetic fixture ${item.id}.\n`);
  }

  const report = {
    schemaVersion: 1,
    source: 'fictional_synthetic',
    evaluatedAt: new Date().toISOString(),
    provider: 'openai_decisions',
    model: MODEL,
    requestPath: 'local harness using the existing Decisions adapter; no browser/app route or local inference',
    quotaBoundary: 'Direct provider calls do not consume or enforce LuLu account quota.',
    fixturePath: relative(REPO_ROOT, fixturePath),
    fixtureLastModifiedAt,
    cases: results,
    summary: {
      caseCount: results.length,
      casesMatchingAnnotations: results.filter(item => item.evaluation.matchesAnnotatedExpectations).length,
      casesNeedingHumanReview: results.filter(item => !item.evaluation.matchesAnnotatedExpectations).map(item => item.id),
      scoring: 'Positive and clear-negative qualitative labels compare against probability >= 0.40; immediate safety compares against >= 0.65; unknown safety is unmatched. Null/refusal results for annotated categories are listed as unavailable and count as neither matches nor misses. Categories omitted from an annotation are unscored; any such model signal is listed for human review. This is annotation agreement, not a calibrated benchmark or accuracy claim.',
    },
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(JSON.stringify({
    report: outputPath,
    provider: report.provider,
    model: report.model,
    caseCount: report.summary.caseCount,
    casesMatchingAnnotations: report.summary.casesMatchingAnnotations,
    casesNeedingHumanReview: report.summary.casesNeedingHumanReview,
  }, null, 2) + '\n');
}

let adapters;
async function loadAdapters() {
  if (adapters) return adapters;
  const outputRoot = resolve(SCRIPT_DIR, '../lib');
  const [patternModule, privacyModule, evaluationModule] = await Promise.all([
    import(pathToFileURL(resolve(outputRoot, 'pattern-intelligence.js'))),
    import(pathToFileURL(resolve(outputRoot, 'privacy-processing.js'))),
    import(pathToFileURL(resolve(outputRoot, 'pattern-evaluation.js'))),
  ]);
  adapters = {
    assessBehaviourPatterns: patternModule.assessBehaviourPatterns,
    BEHAVIOUR_PATTERNS: patternModule.BEHAVIOUR_PATTERNS,
    validateReviewedPrivacyRequest: privacyModule.validateReviewedPrivacyRequest,
    summarizePatternEvaluation: evaluationModule.summarizePatternEvaluation,
  };
  return adapters;
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Pattern evaluation failed.'}\n`);
  process.exitCode = 1;
});
