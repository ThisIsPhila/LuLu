/**
 * Shared privacy-domain contracts. These types describe boundaries; they do
 * not encrypt, authenticate, sanitise, or persist their values.
 */

export type PrivacyDecisionOperation =
  | 'identify_direct_identifiers'
  | 'assess_contextual_identification_risk'
  | 'prepare_disclosure_copy'
  | 'describe_recurring_themes'
  | 'map_support_categories';

export type DecisionInputKind = 'private_content' | 'disclosure_copy' | 'record_references';

export type DecisionOperationContract = {
  operation: PrivacyDecisionOperation;
  purpose: string;
  acceptedInput: DecisionInputKind;
  /** Interpretation is descriptive and must never be presented as diagnosis. */
  mayDiagnose: false;
  /** Counts require a separately governed, genuine aggregate data source. */
  mayProducePopulationCounts: false;
  /** True means only that the contract has no external route implemented. */
  externalRouteImplemented: false;
};

export const decisionOperationContracts: readonly DecisionOperationContract[] = [
  {
    operation: 'identify_direct_identifiers',
    purpose: 'Identify possible direct identifiers for a local privacy review.',
    acceptedInput: 'private_content',
    mayDiagnose: false,
    mayProducePopulationCounts: false,
    externalRouteImplemented: false,
  },
  {
    operation: 'assess_contextual_identification_risk',
    purpose: 'Assess whether details or combinations of details may identify a person or situation.',
    acceptedInput: 'private_content',
    mayDiagnose: false,
    mayProducePopulationCounts: false,
    externalRouteImplemented: false,
  },
  {
    operation: 'prepare_disclosure_copy',
    purpose: 'Create a separate, purpose-specific candidate disclosure representation.',
    acceptedInput: 'private_content',
    mayDiagnose: false,
    mayProducePopulationCounts: false,
    externalRouteImplemented: false,
  },
  {
    operation: 'describe_recurring_themes',
    purpose: 'Describe themes in selected records for the owner to consider.',
    acceptedInput: 'record_references',
    mayDiagnose: false,
    mayProducePopulationCounts: false,
    externalRouteImplemented: false,
  },
  {
    operation: 'map_support_categories',
    purpose: 'Map reviewed descriptions to support categories without asserting a diagnosis.',
    acceptedInput: 'disclosure_copy',
    mayDiagnose: false,
    mayProducePopulationCounts: false,
    externalRouteImplemented: false,
  },
] as const;

export type RecordProvenance =
  | { kind: 'owner_authored'; ownerId: string }
  | { kind: 'companion_contribution'; companionId: string; ownerId: string; contributionId: string }
  | { kind: 'starter_content'; seedId: string };

export type RecordClassification = 'ordinary' | 'private' | 'evidence';

/** Starter content can be useful editable content, but is never evidence. */
export function isEvidenceEligible(provenance: RecordProvenance, classification: RecordClassification): boolean {
  return classification === 'evidence' && (provenance.kind === 'owner_authored' || provenance.kind === 'companion_contribution');
}

export type DisclosureReviewStatus = 'pending_review' | 'approved_for_purpose' | 'requires_redaction' | 'unable_to_assess';

export type DisclosureReview = {
  status: DisclosureReviewStatus;
  purpose: string;
  recipientId: string;
  policyId: string;
  reviewedContentSha256: string;
  reviewedSnapshotSha256: string;
  reviewer: 'owner' | 'local_review_process';
  reviewedAt: string;
  /** Records what was reviewed; does not claim complete PII detection. */
  notes?: string;
};

export type DisclosureCopy = {
  kind: 'disclosure_copy';
  snapshotId: string;
  sourceRevisions: readonly { recordId: string; revisionId: string }[];
  purpose: string;
  recipientId: string;
  text: string;
  contentSha256: string;
  snapshotSha256: string;
  review: DisclosureReview;
};

export type ReviewedRemotePolicy = {
  status: 'reviewed';
  policyId: string;
  allowedOperations: readonly PrivacyDecisionOperation[];
  allowedPurposes: readonly string[];
  allowedRecipients: readonly string[];
};

export type ExternalDecisionIntent = {
  operation: PrivacyDecisionOperation;
  input: DisclosureCopy;
  userAuthorised: boolean;
};

export type ExternalDecisionGate =
  | { allowed: true; operation: PrivacyDecisionOperation; purpose: string }
  | {
      allowed: false;
      reason: 'missing_policy' | 'operation_not_allowed' | 'purpose_not_allowed' | 'recipient_not_allowed' | 'no_user_authorisation' | 'review_not_approved' | 'purpose_mismatch' | 'recipient_mismatch' | 'policy_mismatch' | 'empty_disclosure' | 'invalid_snapshot' | 'disclosure_changed';
    };
