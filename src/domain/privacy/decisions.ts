import { decisionOperationContracts } from './types.ts';
import type { DisclosureCopy, DisclosureReviewStatus, ExternalDecisionGate, ExternalDecisionIntent, PrivacyDecisionOperation, ReviewedRemotePolicy } from './types.ts';

export type DisclosureSnapshotInput = {
  snapshotId: string;
  sourceRevisions: readonly { recordId: string; revisionId: string }[];
  purpose: string;
  recipientId: string;
  text: string;
};

/** Hash the exact UTF-8 disclosure bytes using WebCrypto SHA-256. */
export async function hashDisclosureText(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto SHA-256 is unavailable');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashSnapshot(snapshot: Pick<DisclosureCopy, 'snapshotId' | 'sourceRevisions' | 'purpose' | 'recipientId' | 'text'>): Promise<string> {
  const canonicalSnapshot = JSON.stringify({
    snapshotId: snapshot.snapshotId,
    sourceRevisions: snapshot.sourceRevisions.map(ref => ({ recordId: ref.recordId, revisionId: ref.revisionId })),
    purpose: snapshot.purpose,
    recipientId: snapshot.recipientId,
    text: snapshot.text,
  });
  return hashDisclosureText(canonicalSnapshot);
}

/** Freeze source revision, purpose, and recipient references before review. */
export async function prepareDisclosureCopy(input: DisclosureSnapshotInput): Promise<DisclosureCopy> {
  if (!input.snapshotId.trim() || !input.purpose.trim() || !input.recipientId.trim() || !input.text.trim()) {
    throw new Error('Disclosure snapshot requires an ID, purpose, recipient, and non-empty text');
  }
  if (!input.sourceRevisions.length || input.sourceRevisions.some(ref => !ref.recordId.trim() || !ref.revisionId.trim())) {
    throw new Error('Disclosure snapshot requires valid source revision references');
  }
  const contentSha256 = await hashDisclosureText(input.text);
  const frozenSnapshot = {
    snapshotId: input.snapshotId,
    sourceRevisions: input.sourceRevisions.map(ref => ({ ...ref })),
    purpose: input.purpose,
    recipientId: input.recipientId,
    text: input.text,
  };
  const snapshotSha256 = await hashSnapshot(frozenSnapshot);
  return {
    kind: 'disclosure_copy',
    ...frozenSnapshot,
    contentSha256,
    snapshotSha256,
    review: {
      status: 'pending_review',
      purpose: input.purpose,
      recipientId: input.recipientId,
      policyId: '',
      reviewedContentSha256: contentSha256,
      reviewedSnapshotSha256: snapshotSha256,
      reviewer: 'owner',
      reviewedAt: '',
    },
  };
}

/** Approve only the exact prepared snapshot, recipient, and reviewed policy. */
export async function reviewDisclosureCopy(
  copy: DisclosureCopy,
  input: { policyId: string; recipientId: string; purpose: string; reviewedAt: string; reviewer: 'owner' | 'local_review_process'; status: Exclude<DisclosureReviewStatus, 'pending_review'> },
): Promise<DisclosureCopy> {
  const actualHash = await hashDisclosureText(copy.text);
  const actualSnapshotHash = await hashSnapshot(copy);
  if (actualHash !== copy.contentSha256 || actualSnapshotHash !== copy.snapshotSha256) throw new Error('Disclosure snapshot changed after preparation');
  if (input.recipientId !== copy.recipientId || input.purpose !== copy.purpose || !input.policyId.trim()) {
    throw new Error('Disclosure review does not match its snapshot recipient, purpose, or policy');
  }
  return {
    ...copy,
    sourceRevisions: copy.sourceRevisions.map(ref => ({ ...ref })),
    review: {
      status: input.status,
      purpose: input.purpose,
      recipientId: input.recipientId,
      policyId: input.policyId,
      reviewedContentSha256: actualHash,
      reviewedSnapshotSha256: actualSnapshotHash,
      reviewer: input.reviewer,
      reviewedAt: input.reviewedAt,
    },
  };
}

/**
 * A pure fail-closed policy check. It does not send data anywhere. A remote
 * route must not be added until policy ownership and review are explicit.
 */
export async function evaluateExternalDecision(
  intent: ExternalDecisionIntent,
  policy: ReviewedRemotePolicy | null | undefined,
): Promise<ExternalDecisionGate> {
  if (!policy || policy.status !== 'reviewed' || typeof policy.policyId !== 'string' || !policy.policyId.trim()) {
    return { allowed: false, reason: 'missing_policy' };
  }
  if (intent.userAuthorised !== true) return { allowed: false, reason: 'no_user_authorisation' };
  if (!policy.allowedOperations.includes(intent.operation)) return { allowed: false, reason: 'operation_not_allowed' };

  const contract = decisionOperationContracts.find(item => item.operation === intent.operation);
  if (!contract || contract.acceptedInput !== 'disclosure_copy') {
    return { allowed: false, reason: 'operation_not_allowed' };
  }

  const disclosure = intent.input;
  if (disclosure.kind !== 'disclosure_copy' || !disclosure.text.trim() || !disclosure.snapshotId.trim() || disclosure.sourceRevisions.length === 0) {
    return { allowed: false, reason: 'empty_disclosure' };
  }
  if (disclosure.sourceRevisions.some(ref => !ref.recordId.trim() || !ref.revisionId.trim())) {
    return { allowed: false, reason: 'invalid_snapshot' };
  }
  let currentHash: string;
  let currentSnapshotHash: string;
  try {
    currentHash = await hashDisclosureText(disclosure.text);
    currentSnapshotHash = await hashSnapshot(disclosure);
  } catch {
    return { allowed: false, reason: 'invalid_snapshot' };
  }
  if (!/^[a-f0-9]{64}$/.test(disclosure.contentSha256) || currentHash !== disclosure.contentSha256) {
    return { allowed: false, reason: 'disclosure_changed' };
  }
  if (!/^[a-f0-9]{64}$/.test(disclosure.snapshotSha256) || currentSnapshotHash !== disclosure.snapshotSha256) {
    return { allowed: false, reason: 'disclosure_changed' };
  }
  if (disclosure.purpose !== disclosure.review.purpose) return { allowed: false, reason: 'purpose_mismatch' };
  if (disclosure.recipientId !== disclosure.review.recipientId) return { allowed: false, reason: 'recipient_mismatch' };
  if (policy.policyId !== disclosure.review.policyId) return { allowed: false, reason: 'policy_mismatch' };
  if (disclosure.review.reviewedContentSha256 !== disclosure.contentSha256) return { allowed: false, reason: 'disclosure_changed' };
  if (disclosure.review.reviewedSnapshotSha256 !== disclosure.snapshotSha256) return { allowed: false, reason: 'disclosure_changed' };
  if (disclosure.review.status !== 'approved_for_purpose') return { allowed: false, reason: 'review_not_approved' };
  if (!policy.allowedPurposes.includes(disclosure.purpose)) return { allowed: false, reason: 'purpose_not_allowed' };
  if (!policy.allowedRecipients.includes(disclosure.recipientId)) return { allowed: false, reason: 'recipient_not_allowed' };

  return { allowed: true, operation: intent.operation, purpose: disclosure.purpose };
}

/** The operation contract is the only source of the available typed names. */
export function isPrivacyDecisionOperation(value: string): value is PrivacyDecisionOperation {
  return decisionOperationContracts.some(contract => contract.operation === value);
}
