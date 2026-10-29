import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { firebaseGuardPolicy, readInputFile, validateFirebase } from '../scripts/firebase-guard.mjs';

const [firebaseBase, firebasercBase, functionSourceBase] = await Promise.all([
  readFile(new URL('../firebase.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../.firebaserc', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../functions/src/index.ts', import.meta.url), 'utf8')
]);

const input = (changes = {}) => ({
  firebase: structuredClone(firebaseBase),
  firebaserc: structuredClone(firebasercBase),
  policy: firebaseGuardPolicy,
  functionSource: functionSourceBase,
  exceptions: [],
  now: new Date('2026-10-25T12:00:00Z'),
  ...changes
});
const codes = (result) => result.filter(({ exception }) => !exception).map(({ code }) => code);

test('allows the existing project and bounded Johannesburg function configuration', () => {
  assert.deepEqual(codes(validateFirebase(input())), []);
});

test('rejects project and region drift', () => {
  const wrongProject = input();
  wrongProject.firebaserc.projects.default = 'another-project';
  const wrongRegion = input({ functionSource: functionSourceBase.replace("region: 'africa-south1'", "region: 'us-central1'") });
  assert.ok(codes(validateFirebase(wrongProject)).includes('FIREBASE_PROJECT'));
  assert.ok(codes(validateFirebase(input({ activeProject: 'another-project' }))).includes('FIREBASE_ACTIVE_PROJECT'));
  assert.ok(codes(validateFirebase(wrongRegion)).includes('FUNCTION_REGION'));
});

test('rejects new Firebase services and function triggers or Admin services', () => {
  const extraService = input();
  extraService.firebase.storage = { rules: 'storage.rules' };
  const extraTrigger = input({ functionSource: `${functionSourceBase}\nexport const cleanup = onSchedule({}, async () => {});` });
  const extraAdminService = input({ functionSource: functionSourceBase.replace("from 'firebase-admin/firestore'", "from 'firebase-admin/firestore'\nimport { getStorage } from 'firebase-admin/storage'") });
  assert.ok(codes(validateFirebase(extraService)).includes('FIREBASE_SERVICES'));
  assert.ok(codes(validateFirebase(extraTrigger)).includes('FUNCTION_EXPORTS'));
  assert.ok(codes(validateFirebase(extraAdminService)).includes('FUNCTION_SERVICES'));
});

test('rejects unsupported keys inside existing Firebase service objects', () => {
  const firestoreDatabase = input();
  firestoreDatabase.firebase.firestore.database = 'other';
  const hostingFramework = input();
  hostingFramework.firebase.hosting.source = 'framework';
  const authTenant = input();
  authTenant.firebase.auth.tenantId = 'tenant';
  assert.ok(codes(validateFirebase(firestoreDatabase)).includes('FIRESTORE_CONFIGURATION_KEYS'));
  assert.ok(codes(validateFirebase(hostingFramework)).includes('HOSTING_CONFIGURATION_KEYS'));
  assert.ok(codes(validateFirebase(authTenant)).includes('AUTH_CONFIGURATION_KEYS'));
});

test('rejects Hosting rewrites that route to backend or dynamic-link services', () => {
  for (const target of [{ function: 'api' }, { run: { serviceId: 'service' } }, { dynamicLinks: true }]) {
    const changed = input();
    changed.firebase.hosting.rewrites = [{ source: '/**', ...target }];
    assert.ok(codes(validateFirebase(changed)).includes('HOSTING_REWRITES'));
  }
});

test('rejects unknown function options and non-literal option expressions', () => {
  const extraCpu = input({ functionSource: functionSourceBase.replace("memory: '256MiB'", "memory: '256MiB', cpu: 2") });
  const extraVpcConnector = input({ functionSource: functionSourceBase.replace("memory: '256MiB'", "memory: '256MiB', vpcConnector: 'connector-name'") });
  const dynamicOption = input({ functionSource: functionSourceBase.replace("region: 'africa-south1'", 'region: process.env.LULU_REGION') });
  assert.ok(codes(validateFirebase(extraCpu)).includes('FUNCTION_OPTION_UNKNOWN'));
  assert.ok(codes(validateFirebase(extraVpcConnector)).includes('FUNCTION_OPTION_UNKNOWN'));
  assert.ok(codes(validateFirebase(dynamicOption)).includes('FUNCTION_OPTIONS_UNSUPPORTED'));
});

test('allows only the reviewed literal OpenAI and Resend secret bindings', () => {
  assert.deepEqual(codes(validateFirebase(input())), []);
  const extra = input({ functionSource: functionSourceBase.replace("secrets: ['OPENAI_API_KEY', 'RESEND_API_KEY']", "secrets: ['OPENAI_API_KEY', 'RESEND_API_KEY', 'OTHER_SECRET']") });
  const dynamic = input({ functionSource: functionSourceBase.replace("secrets: ['OPENAI_API_KEY', 'RESEND_API_KEY']", 'secrets: [process.env.SECRET_NAME]') });
  const computed = input({ functionSource: functionSourceBase.replace("secrets: ['OPENAI_API_KEY', 'RESEND_API_KEY']", 'secrets: approvedSecrets') });
  assert.ok(codes(validateFirebase(extra)).includes('FUNCTION_SECRET_BINDING'));
  assert.ok(codes(validateFirebase(dynamic)).includes('FUNCTION_OPTIONS_UNSUPPORTED'));
  assert.ok(codes(validateFirebase(computed)).includes('FUNCTION_OPTIONS_UNSUPPORTED'));
});

test('rejects re-exports and export-list forms that could add functions indirectly', () => {
  const alias = input({ functionSource: `${functionSourceBase}\nexport { api as cleanup };` });
  const star = input({ functionSource: `${functionSourceBase}\nexport * from './extra.js';` });
  const hidden = input({ functionSource: functionSourceBase.replace('export const api =', 'const api =') + '\nexport { api };' });
  assert.ok(codes(validateFirebase(alias)).includes('FUNCTION_EXPORTS'));
  assert.ok(codes(validateFirebase(star)).includes('FUNCTION_EXPORTS'));
  assert.ok(codes(validateFirebase(hidden)).includes('FUNCTION_EXPORTS'));
});

test('staged mode reads the index snapshot even when the working file is different', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'firebase-guard-staged-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    await writeFile(path.join(root, 'firebase.json'), '{"staged":true}');
    execFileSync('git', ['add', 'firebase.json'], { cwd: root });
    await writeFile(path.join(root, 'firebase.json'), '{"staged":false}');
    const staged = readInputFile('firebase.json', { staged: true, root });
    const working = await readInputFile('firebase.json', { root });
    assert.equal(staged, '{"staged":true}');
    assert.equal(working, '{"staged":false}');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects nonzero minimum instances and expanded function resources', () => {
  const minimum = input({ functionSource: functionSourceBase.replace('minInstances: 0', 'minInstances: 1') });
  const expanded = input({ functionSource: functionSourceBase.replace('maxInstances: 2', 'maxInstances: 3').replace("memory: '256MiB'", "memory: '512MiB'") });
  const hugeMemory = input({ functionSource: functionSourceBase.replace("memory: '256MiB'", "memory: '1GiB'") });
  assert.ok(codes(validateFirebase(minimum)).includes('FUNCTION_MIN_INSTANCES'));
  const expandedCodes = codes(validateFirebase(expanded));
  assert.ok(expandedCodes.includes('FUNCTION_MAX_INSTANCES'));
  assert.ok(expandedCodes.includes('FUNCTION_MEMORY'));
  assert.ok(codes(validateFirebase(hugeMemory)).includes('FUNCTION_MEMORY'));
});

test('requires exception records to match a reviewed exact finding and makes accepted exceptions visible', () => {
  const drift = input({ functionSource: functionSourceBase.replace('maxInstances: 2', 'maxInstances: 3') });
  const exception = {
    id: 'owner-review-2026-10-25-01',
    findingCode: 'FUNCTION_MAX_INSTANCES',
    observedValue: '3',
    reviewedBy: 'project-owner',
    reviewedAt: '2026-10-25',
    reviewReference: 'owner decision recorded in project governance',
    rationale: 'Temporary reviewed exception for a bounded demo.',
    expiresAt: '2026-11-01T00:00:00Z'
  };
  const findings = validateFirebase({ ...drift, exceptions: [exception] });
  assert.ok(findings.some(({ code, exception: id }) => code === 'FUNCTION_MAX_INSTANCES' && id === exception.id));
  assert.ok(!findings.some(({ code }) => code === 'EXCEPTION_INVALID'));
  const expired = validateFirebase({ ...drift, exceptions: [{ ...exception, expiresAt: '2026-10-24T00:00:00Z' }] });
  assert.ok(codes(expired).includes('EXCEPTION_EXPIRED'));
});

test('rejects publishing the repository or another development output directory',()=>{
  const unsafe=input();unsafe.firebase.hosting.public='.';
  assert.ok(codes(validateFirebase(unsafe)).includes('HOSTING_PUBLIC_DIRECTORY'));
});
