#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = '.sdd/memory/governance/firebase-guard-policy.json';
const EXCEPTIONS_PATH = '.sdd/memory/governance/firebase-guard-exceptions.json';
const ALLOWED_FUNCTION_OPTIONS = new Set(['region', 'memory', 'maxInstances', 'minInstances', 'concurrency', 'timeoutSeconds', 'invoker']);
const ALLOWED_SERVICE_KEYS = {
  hosting: new Set(['public', 'ignore', 'rewrites', 'site', 'predeploy', 'cleanUrls', 'trailingSlash', 'headers']),
  firestore: new Set(['rules', 'indexes', 'predeploy']),
  auth: new Set(['predeploy', 'providers'])
};

const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
const stable = (value) => JSON.stringify(canonical(value));
const get = (object, dottedPath) => dottedPath.split('.').reduce((value, key) => value?.[key], object);

function add(findings, code, observedValue, message) {
  findings.push({ code, observedValue: stable(observedValue), message });
}

function hasModifier(node, kind) {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
}

function inspectExports(functionSource) {
  const sourceFile = ts.createSourceFile('functions/src/index.ts', functionSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exports = [];
  let apiInitializer;
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      exports.push({ kind: statement.moduleSpecifier ? 're-export' : 'export-list', value: statement.moduleSpecifier?.getText(sourceFile) ?? statement.exportClause?.getText(sourceFile) ?? '*' });
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      exports.push({ kind: 'export-assignment', value: statement.expression.getText(sourceFile) });
      continue;
    }
    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = ts.isIdentifier(declaration.name) ? declaration.name.text : declaration.name.getText(sourceFile);
        exports.push({ kind: 'variable', name });
        if (name === 'api') apiInitializer = declaration.initializer;
      }
    } else {
      const name = 'name' in statement && statement.name && ts.isIdentifier(statement.name) ? statement.name.text : 'default';
      exports.push({ kind: ts.SyntaxKind[statement.kind], name });
    }
  }
  return { sourceFile, exports, apiInitializer, parseDiagnostics: sourceFile.parseDiagnostics };
}

function readLiteral(expression, sourceFile) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  return { unsupported: expression.getText(sourceFile) };
}

function validateFirebase({ firebase, firebaserc, functionSource, policy, exceptions = [], activeProject, now = new Date() }) {
  const findings = [];
  if (!firebase || typeof firebase !== 'object' || Array.isArray(firebase)) {
    add(findings, 'FIREBASE_JSON_INVALID', null, 'firebase.json must contain a JSON object.');
    return findings;
  }

  const keys = Object.keys(firebase).sort();
  if (stable(keys) !== stable([...policy.firebaseRootKeys].sort())) {
    add(findings, 'FIREBASE_SERVICES', keys, `Firebase service keys must remain ${policy.firebaseRootKeys.join(', ')}.`);
  }
  if (get(firebaserc, 'projects.default') !== policy.projectId) {
    add(findings, 'FIREBASE_PROJECT', get(firebaserc, 'projects.default') ?? null, `Default project must remain ${policy.projectId}.`);
  }
  if (activeProject && activeProject !== policy.projectId) {
    add(findings, 'FIREBASE_ACTIVE_PROJECT', activeProject, `Firebase CLI deploy target must remain ${policy.projectId}.`);
  }
  if (get(firebase, 'hosting.public') !== 'dist/app') add(findings, 'HOSTING_PUBLIC_DIRECTORY', get(firebase, 'hosting.public') ?? null, 'Only the main app build dist/app can be hosted; development demos and internal documents stay local.');
  if (get(firebase, 'hosting.site') !== policy.hostingSite) {
    add(findings, 'FIREBASE_HOSTING_SITE', get(firebase, 'hosting.site') ?? null, `Hosting site must remain ${policy.hostingSite}.`);
  }
  for (const [service, allowedKeys] of Object.entries(ALLOWED_SERVICE_KEYS)) {
    const config = firebase[service];
    const unknownKeys = config && typeof config === 'object' ? Object.keys(config).filter((key) => !allowedKeys.has(key)).sort() : ['(missing or invalid service object)'];
    if (unknownKeys.length) add(findings, `${service.toUpperCase()}_CONFIGURATION_KEYS`, unknownKeys, `Unsupported ${service} configuration keys require owner review.`);
  }
  const allowedSpaRewrite = [{ source: '**', destination: '/index.html' }];
  if (stable(firebase.hosting?.rewrites) !== stable(allowedSpaRewrite)) {
    add(findings, 'HOSTING_REWRITES', firebase.hosting?.rewrites ?? null, 'Only the fixed SPA rewrite from ** to /index.html is allowed; backend, dynamic-link and framework rewrites require owner review.');
  }
  if (get(firebase, 'firestore.rules') !== 'firestore.rules' || get(firebase, 'firestore.indexes') !== 'firestore.indexes.json') {
    add(findings, 'FIRESTORE_CONFIGURATION', firebase.firestore ?? null, 'Keep the existing Standard Firestore rules and index files; do not add another database configuration here.');
  }
  if (stable(firebase.auth?.providers) !== stable({ anonymous: false, emailPassword: false })) {
    add(findings, 'AUTH_PROVIDERS', firebase.auth?.providers ?? null, 'Keep anonymous and email/password providers disabled unless the owner reviews a change.');
  }
  for (const [service, config] of [['hosting', firebase.hosting], ['firestore', firebase.firestore], ['auth', firebase.auth]]) {
    if (!Array.isArray(config?.predeploy) || !config.predeploy.includes('node scripts/firebase-guard.mjs')) {
      add(findings, 'FIREBASE_PREDEPLOY_HOOK', service, `The ${service} predeploy hook must run the Firebase guard.`);
    }
  }

  const functionConfigs = Array.isArray(firebase.functions) ? firebase.functions : [];
  const expectedFunctionConfig = [{ source: policy.functionSource, codebase: policy.functionCodebase, runtime: policy.functionRuntime, predeploy: ['node scripts/firebase-guard.mjs', 'npm --prefix "$RESOURCE_DIR" run build'] }];
  if (stable(functionConfigs) !== stable(expectedFunctionConfig)) {
    add(findings, 'FUNCTIONS_CONFIGURATION', functionConfigs, 'Keep one existing second-generation function codebase with its pinned source, runtime and build step.');
  }

  const parsed = inspectExports(functionSource);
  if (parsed.parseDiagnostics.length) {
    add(findings, 'FUNCTION_SOURCE_PARSE', parsed.parseDiagnostics.map((diagnostic) => diagnostic.messageText), 'Function source could not be parsed for guard review.');
  }
  if (stable(parsed.exports) !== stable([{ kind: 'variable', name: policy.functionName }])) {
    add(findings, 'FUNCTION_EXPORTS', parsed.exports, `Only the existing ${policy.functionName} function export is allowed; extra exports, export lists and re-exports need owner review.`);
  }

  const functionImports = [...functionSource.matchAll(/from\s+['"](firebase-functions(?:\/[^'"]*)?|firebase-admin(?:\/[^'"]*)?)['"]/g)].map((match) => match[1]);
  const allowedImports = new Set(['firebase-functions/v2/https', 'firebase-admin/app', 'firebase-admin/auth', 'firebase-admin/firestore']);
  const disallowedImports = [...new Set(functionImports.filter((name) => !allowedImports.has(name)))].sort();
  if (disallowedImports.length) {
    add(findings, 'FUNCTION_SERVICES', disallowedImports, 'New Firebase trigger types or Admin services need explicit owner review.');
  }

  const initializer = parsed.apiInitializer;
  if (!initializer || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) || initializer.expression.text !== 'onRequest') {
    add(findings, 'FUNCTION_OPTIONS', initializer?.getText(parsed.sourceFile) ?? null, 'Could not verify that api directly calls onRequest with literal options.');
  } else {
    const options = {};
    const object = initializer.arguments[0];
    if (!object || !ts.isObjectLiteralExpression(object)) {
      add(findings, 'FUNCTION_OPTIONS_UNSUPPORTED', object?.getText(parsed.sourceFile) ?? null, 'Function resource options must be a literal object so the guard can inspect them.');
    } else {
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) {
          add(findings, 'FUNCTION_OPTIONS_UNSUPPORTED', property.getText(parsed.sourceFile), 'Function options must use explicit key/value properties with literal values.');
          continue;
        }
        const key = property.name.text;
        if (!ALLOWED_FUNCTION_OPTIONS.has(key)) {
          add(findings, 'FUNCTION_OPTION_UNKNOWN', key, `Function option ${key} is not allowlisted; review resource expansion before changing policy.`);
          continue;
        }
        const value = readLiteral(property.initializer, parsed.sourceFile);
        if (value && typeof value === 'object' && Object.hasOwn(value, 'unsupported')) {
          add(findings, 'FUNCTION_OPTIONS_UNSUPPORTED', { key, expression: value.unsupported }, 'Function options must use literal values; dynamic expressions fail closed.');
        } else {
          options[key] = value;
        }
      }
    }
    const memoryMatch = typeof options.memory === 'string' ? options.memory.match(/^(\d+)(MiB|GiB)$/) : null;
    const memoryMiB = Number.isInteger(options.memory) ? options.memory : memoryMatch ? Number(memoryMatch[1]) * (memoryMatch[2] === 'GiB' ? 1024 : 1) : Number.NaN;
    const checks = [
      ['region', options.region === policy.functionRegion, options.region ?? null, `Function region must stay ${policy.functionRegion}.`],
      ['memory', Number.isFinite(memoryMiB) && memoryMiB > 0 && memoryMiB <= policy.functionMemoryMiBMax, options.memory ?? null, `Function memory must be set at or below ${policy.functionMemoryMiBMax} MiB.`],
      ['minInstances', options.minInstances === policy.functionMinInstances, options.minInstances ?? null, 'Function minInstances must remain 0.'],
      ['maxInstances', Number.isInteger(options.maxInstances) && options.maxInstances >= 1 && options.maxInstances <= policy.functionMaxInstances, options.maxInstances ?? null, `Function maxInstances must be set from 1 to ${policy.functionMaxInstances}.`],
      ['concurrency', Number.isInteger(options.concurrency) && options.concurrency >= 1 && options.concurrency <= policy.functionConcurrencyMax, options.concurrency ?? null, `Function concurrency must be set from 1 to ${policy.functionConcurrencyMax}.`],
      ['timeoutSeconds', Number.isInteger(options.timeoutSeconds) && options.timeoutSeconds >= 1 && options.timeoutSeconds <= policy.functionTimeoutSecondsMax, options.timeoutSeconds ?? null, `Function timeout must be set from 1 to ${policy.functionTimeoutSecondsMax} seconds.`],
      ['invoker', options.invoker === 'public', options.invoker ?? null, 'Function invoker must remain public for the existing API.']
    ];
    for (const [key, valid, observed, message] of checks) if (!valid) add(findings, `FUNCTION_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`, observed, message);
    if (!Object.hasOwn(options, 'region') || !Object.hasOwn(options, 'memory') || !Object.hasOwn(options, 'minInstances') || !Object.hasOwn(options, 'maxInstances')) {
      add(findings, 'FUNCTION_OPTIONS_INCOMPLETE', options, 'Set each required function resource option explicitly so drift can be reviewed.');
    }
  }

  const nowTime = now.getTime();
  for (const exception of exceptions) {
    const expiry = Date.parse(exception.expiresAt ?? '');
    if (!exception.findingCode || !exception.observedValue || exception.reviewedBy !== 'project-owner' || !exception.reviewedAt || !exception.reviewReference || !exception.rationale || !Number.isFinite(expiry)) {
      add(findings, 'EXCEPTION_INVALID', exception.id ?? null, 'Each exception needs an exact finding/value, project-owner review, review reference, rationale and expiry.');
    } else if (expiry <= nowTime) {
      add(findings, 'EXCEPTION_EXPIRED', exception.id ?? null, `Owner-reviewed exception ${exception.id ?? '(unnamed)'} has expired.`);
    }
  }

  const active = exceptions.filter((exception) => Date.parse(exception.expiresAt) > nowTime);
  const waived = new Set();
  for (const finding of findings) {
    const exception = active.find((candidate) => candidate.findingCode === finding.code && candidate.observedValue === finding.observedValue);
    if (exception) {
      waived.add(exception.id);
      finding.exception = exception.id;
    }
  }
  for (const exception of active) {
    if (!waived.has(exception.id)) add(findings, 'EXCEPTION_UNUSED', exception.id ?? null, `Exception ${exception.id ?? '(unnamed)'} does not match a current finding; remove or update it.`);
  }
  return findings;
}

function readInputFile(relativePath, { staged = false, gitShow = execFileSync, root = ROOT } = {}) {
  if (staged) return gitShow('git', ['show', `:${relativePath}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return readFile(path.join(root, relativePath), 'utf8');
}

async function readJson(relativePath, options) {
  return JSON.parse(await readInputFile(relativePath, options));
}

export { readInputFile, validateFirebase };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const staged = process.argv.includes('--staged');
    const readOptions = { staged };
    const [firebase, firebaserc, policy, exceptionDocument, functionSource] = await Promise.all([
      readJson('firebase.json', readOptions), readJson('.firebaserc', readOptions), readJson(POLICY_PATH, readOptions), readJson(EXCEPTIONS_PATH, readOptions), readInputFile('functions/src/index.ts', readOptions)
    ]);
    const findings = validateFirebase({ firebase, firebaserc, functionSource, policy, exceptions: exceptionDocument.exceptions, activeProject: process.env.GCLOUD_PROJECT });
    if (!staged) {
      for (const name of ['demo','docs','legacy.html']) {
        let present = false;
        try { await readFile(path.join(ROOT,'dist/app',name)); present = true; }
        catch(error) { if (error.code === 'EISDIR') present = true; else if(error.code !== 'ENOENT') throw error; }
        if (present) add(findings,'HOSTING_DEVELOPMENT_CONTENT',name,'Remove development-only output and rebuild only the main app before deploying.');
      }
    }
    const errors = findings.filter((finding) => !finding.exception);
    const accepted = findings.filter((finding) => finding.exception);
    if (accepted.length) for (const finding of accepted) console.warn(`OWNER-REVIEWED ${finding.code}: ${finding.message} (exception ${finding.exception})`);
    if (errors.length) {
      for (const finding of errors) console.error(`Firebase guard: ${finding.code}: ${finding.message} Observed: ${finding.observedValue}`);
      console.error('Review the configuration and obtain owner review for any intentional change before adding a narrowly scoped exception.');
      process.exitCode = 1;
    } else {
      console.log(`Firebase guard passed${staged ? ' for staged configuration' : ''}. This local check does not set a spending cap or prevent a hook bypass.`);
    }
  } catch (error) {
    console.error(`Firebase guard could not read its configuration: ${error.message}`);
    process.exitCode = 1;
  }
}
