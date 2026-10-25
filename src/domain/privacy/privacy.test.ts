import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canCompanionAccess,
  createCompanionStatement,
  evaluateExternalDecision,
  isEvidenceEligible,
  prepareDisclosureCopy,
  projectParagraphs,
  reduceParagraphPrivacy,
  reviewDisclosureCopy,
} from './index.ts';
import type { CompanionGrant, DisclosureCopy, ReviewedRemotePolicy } from './index.ts';

async function reviewedDisclosure(): Promise<DisclosureCopy> {
  const prepared = await prepareDisclosureCopy({
    snapshotId: 'snapshot-1',
    sourceRevisions: [{ recordId: 'record-1', revisionId: 'revision-4' }],
    purpose: 'support-information',
    recipientId: 'recipient-reviewed-support',
    text: 'A reviewed, redacted description.',
  });
  return reviewDisclosureCopy(prepared, {
    policyId: 'policy-reviewed-by-owner',
    recipientId: 'recipient-reviewed-support',
    purpose: 'support-information',
    reviewedAt: '2026-10-25T10:00:00.000Z',
    reviewer: 'owner',
    status: 'approved_for_purpose',
  });
}

const reviewedPolicy: ReviewedRemotePolicy = {
  status: 'reviewed',
  policyId: 'policy-reviewed-by-owner',
  allowedOperations: ['map_support_categories'],
  allowedPurposes: ['support-information'],
  allowedRecipients: ['recipient-reviewed-support'],
};

test('remote decision gate allows exact purpose, recipient, policy, and text snapshot', async () => {
  const copy = await reviewedDisclosure();
  assert.deepEqual(
    await evaluateExternalDecision({ operation: 'map_support_categories', input: copy, userAuthorised: true }, reviewedPolicy),
    { allowed: true, operation: 'map_support_categories', purpose: 'support-information' },
  );
});

test('remote decision gate fails closed without policy, strict authorization, or purpose approval', async () => {
  const copy = await reviewedDisclosure();
  const intent = { operation: 'map_support_categories' as const, input: copy, userAuthorised: true };
  assert.deepEqual(await evaluateExternalDecision(intent, null), { allowed: false, reason: 'missing_policy' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, userAuthorised: false }, reviewedPolicy), { allowed: false, reason: 'no_user_authorisation' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, userAuthorised: 'false' as unknown as boolean }, reviewedPolicy), { allowed: false, reason: 'no_user_authorisation' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, operation: 'identify_direct_identifiers' }, reviewedPolicy), { allowed: false, reason: 'operation_not_allowed' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, purpose: 'different-purpose' } }, reviewedPolicy), { allowed: false, reason: 'disclosure_changed' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, recipientId: 'other-recipient' } }, reviewedPolicy), { allowed: false, reason: 'disclosure_changed' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, review: { ...copy.review, purpose: 'different-purpose' } } }, reviewedPolicy), { allowed: false, reason: 'purpose_mismatch' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, review: { ...copy.review, recipientId: 'other-recipient' } } }, reviewedPolicy), { allowed: false, reason: 'recipient_mismatch' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, review: { ...copy.review, status: 'unable_to_assess' } } }, reviewedPolicy), { allowed: false, reason: 'review_not_approved' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, text: 'Changed after review.' } }, reviewedPolicy), { allowed: false, reason: 'disclosure_changed' });
  assert.deepEqual(await evaluateExternalDecision({ ...intent, input: { ...copy, sourceRevisions: [{ recordId: 'record-1', revisionId: 'revision-5' }] } }, reviewedPolicy), { allowed: false, reason: 'disclosure_changed' });
  assert.deepEqual(await evaluateExternalDecision(intent, { ...reviewedPolicy, policyId: 'other-policy' }), { allowed: false, reason: 'policy_mismatch' });
  assert.deepEqual(await evaluateExternalDecision(intent, { ...reviewedPolicy, allowedRecipients: [] }), { allowed: false, reason: 'recipient_not_allowed' });
});

test('disclosure preparation and review bind source revisions, purpose, recipient, policy, and exact text', async () => {
  const prepared = await prepareDisclosureCopy({
    snapshotId: 'snapshot-2',
    sourceRevisions: [{ recordId: 'record-2', revisionId: 'rev-9' }],
    purpose: 'support-information',
    recipientId: 'recipient-reviewed-support',
    text: 'Candidate disclosure.',
  });
  assert.equal(prepared.review.status, 'pending_review');
  assert.deepEqual(prepared.sourceRevisions, [{ recordId: 'record-2', revisionId: 'rev-9' }]);
  await assert.rejects(() => reviewDisclosureCopy({ ...prepared, text: 'Edited candidate.' }, {
    policyId: 'policy-reviewed-by-owner', recipientId: 'recipient-reviewed-support', purpose: 'support-information',
    reviewedAt: '2026-10-25T10:00:00.000Z', reviewer: 'owner', status: 'approved_for_purpose',
  }), /snapshot changed after preparation/);
  await assert.rejects(() => reviewDisclosureCopy(prepared, {
    policyId: 'policy-reviewed-by-owner', recipientId: 'different-recipient', purpose: 'support-information',
    reviewedAt: '2026-10-25T10:00:00.000Z', reviewer: 'owner', status: 'approved_for_purpose',
  }), /does not match/);
});

test('ordinary and starter content stay distinct from authentic evidence', () => {
  assert.equal(isEvidenceEligible({ kind: 'owner_authored', ownerId: 'owner-1' }, 'evidence'), true);
  assert.equal(isEvidenceEligible({ kind: 'companion_contribution', companionId: 'c-1', ownerId: 'owner-1', contributionId: 'contrib-1' }, 'evidence'), true);
  assert.equal(isEvidenceEligible({ kind: 'owner_authored', ownerId: 'owner-1' }, 'ordinary'), false);
  assert.equal(isEvidenceEligible({ kind: 'starter_content', seedId: 'starter-1' }, 'evidence'), false);
  assert.equal(isEvidenceEligible({ kind: 'starter_content', seedId: 'starter-1' }, 'ordinary'), false);
});

test('paragraphs are concealed while locked and revealing another conceals the prior paragraph', () => {
  const paragraphs = [
    { id: 'p1', text: 'Private name: Amara' },
    { id: 'p2', text: 'Ordinary reflection.' },
  ];
  const firstReveal = reduceParagraphPrivacy({}, { type: 'reveal', paragraphId: 'p1' }, paragraphs);
  const lockedProjection = projectParagraphs(paragraphs, firstReveal);
  assert.equal(lockedProjection.every(item => item.concealed), true);
  assert.equal(JSON.stringify(lockedProjection).includes('Amara'), false);

  const authorizedProjection = projectParagraphs(paragraphs, firstReveal, true);
  assert.equal(authorizedProjection[0].displayText, 'Private name: Amara');
  assert.equal(authorizedProjection[1].concealed, true);
  const secondReveal = reduceParagraphPrivacy(firstReveal, { type: 'reveal', paragraphId: 'p2' }, paragraphs);
  const movedProjection = projectParagraphs(paragraphs, secondReveal, true);
  assert.equal(movedProjection[0].concealed, true);
  assert.equal(movedProjection[1].displayText, 'Ordinary reflection.');
  assert.equal(paragraphs[0].text, 'Private name: Amara');
});

test('companion access requires matching owner and valid grant time, and is scoped, expiring, and revocable', () => {
  const grant: CompanionGrant = {
    companionId: 'trusted-1',
    ownerId: 'owner-1',
    grantedAt: '2026-10-25T09:00:00.000Z',
    expiresAt: '2026-10-26T09:00:00.000Z',
    permissions: [
      { operation: 'view_record', recordIds: ['record-1'] },
      { operation: 'append_statement', recordIds: ['record-1'] },
      { operation: 'receive_evidence', evidenceIds: ['evidence-1'] },
    ],
  };
  const request = { companionId: 'trusted-1', ownerId: 'owner-1', operation: 'view_record' as const, resourceId: 'record-1', now: '2026-10-25T12:00:00.000Z' };
  assert.equal(canCompanionAccess(grant, request), true);
  assert.equal(canCompanionAccess(grant, { ...request, ownerId: 'owner-2' }), false);
  assert.equal(canCompanionAccess(grant, { ...request, now: '2026-10-25T08:59:59.999Z' }), false);
  assert.equal(canCompanionAccess(grant, { ...request, now: 'not-a-date' }), false);
  assert.equal(canCompanionAccess({ ...grant, grantedAt: 'invalid' }, request), false);
  assert.equal(canCompanionAccess({ ...grant, expiresAt: '2026-10-25T08:00:00.000Z' }, request), false);
  assert.equal(canCompanionAccess(grant, { ...request, resourceId: 'record-2' }), false);
  assert.equal(canCompanionAccess(grant, { ...request, operation: 'view_trail_history', resourceId: 'trail-1' }), false);
  assert.equal(canCompanionAccess(grant, { ...request, now: '2026-10-26T09:00:00.000Z' }), false);
  assert.equal(canCompanionAccess({ ...grant, revokedAt: '2026-10-25T11:00:00.000Z' }, request), false);
  assert.equal(canCompanionAccess({ ...grant, revokedAt: 'invalid' }, request), false);
  assert.equal(canCompanionAccess({ ...grant, revokedAt: '2026-10-25T13:00:00.000Z' }, request), false);
  assert.equal(canCompanionAccess(null, request), false);
});

test('companion statement remains a separate attributed contribution value', () => {
  const statement = createCompanionStatement({
    kind: 'companion_statement',
    contributionId: 'contribution-1',
    companionId: 'trusted-1',
    ownerId: 'owner-1',
    recordId: 'record-1',
    createdAt: '2026-10-25T12:00:00.000Z',
    text: 'I have additional context.',
  });
  assert.equal(statement.kind, 'companion_statement');
  assert.equal(statement.companionId, 'trusted-1');
  assert.equal('originalContent' in statement, false);
});
