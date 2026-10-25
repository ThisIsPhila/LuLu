export type CompanionPermission =
  | { operation: 'view_record'; recordIds: readonly string[] }
  | { operation: 'receive_evidence'; evidenceIds: readonly string[] }
  | { operation: 'append_statement'; recordIds: readonly string[] }
  | { operation: 'receive_voice_note'; evidenceIds: readonly string[] }
  | { operation: 'view_active_trail'; trailIds: readonly string[] }
  | { operation: 'view_trail_history'; trailIds: readonly string[] }
  | { operation: 'hold_encrypted_backup'; recordIds: readonly string[] };

export type CompanionGrant = {
  companionId: string;
  ownerId: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  permissions: readonly CompanionPermission[];
};

export type CompanionAccessRequest = {
  companionId: string;
  ownerId: string;
  operation: CompanionPermission['operation'];
  resourceId: string;
  now: string;
};

/** Deny by default; each permission is independent and scoped to named IDs. */
export function canCompanionAccess(grant: CompanionGrant | null | undefined, request: CompanionAccessRequest): boolean {
  if (!grant || !grant.companionId || !grant.ownerId || !request.companionId || !request.ownerId) return false;
  if (grant.companionId !== request.companionId || grant.ownerId !== request.ownerId) return false;
  const nowMs = Date.parse(request.now);
  const grantedMs = Date.parse(grant.grantedAt);
  const expiresMs = grant.expiresAt !== undefined ? Date.parse(grant.expiresAt) : undefined;
  if (!Number.isFinite(nowMs) || !Number.isFinite(grantedMs) || nowMs < grantedMs) return false;
  if (grant.expiresAt !== undefined && (!Number.isFinite(expiresMs) || expiresMs! <= grantedMs || nowMs >= expiresMs!)) return false;
  if (grant.revokedAt !== undefined) {
    const revokedMs = Date.parse(grant.revokedAt);
    if (!Number.isFinite(revokedMs) || revokedMs > nowMs) return false;
    return false;
  }

  return grant.permissions.some(permission => {
    if (permission.operation !== request.operation) return false;
    const ids = 'recordIds' in permission ? permission.recordIds : 'evidenceIds' in permission ? permission.evidenceIds : permission.trailIds;
    return ids.includes(request.resourceId);
  });
}

export type CompanionStatement = {
  kind: 'companion_statement';
  contributionId: string;
  companionId: string;
  ownerId: string;
  recordId: string;
  createdAt: string;
  text: string;
};

/**
 * Build an attributed append-only contribution value. Callers persist it
 * separately; this function has no ability to replace or edit owner content.
 */
export function createCompanionStatement(input: CompanionStatement): CompanionStatement {
  return { ...input };
}
