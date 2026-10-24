# Journal core slice — 24 October 2026

Authorized by the functionality delegation and the hackathon SDD pause. Phase 001 remains an unapproved draft. Session scope is domain/hooks/services and focused tests, with no UI/demo/manifests/shared-status edits, commits, pushes or external mutations.

## Initial audit

Baseline d26477e; initial working tree clean. App used unvalidated array storage and swallowed writes, resurrected sample entries after deleting everything, reset entity aliases on reload, and kept independent state outside the existing hook. Library's person filter hard-coded an original name. Original bodies and mappings are plaintext and the passkey is simulated. No backend/provider was selected.

## Delivered and reverse traceability

REQ-001.2: validated snapshot, stable entity catalogue, explicit source-preserving global alias correction, protected original-term retrieval, and deterministic non-cascading replacement. REQ-001.4: explicit local plaintext boundary and UI-only access flag; no authentication/encryption claim. REQ-001.5: backwards-compatible domain imports and isolated reusable storage adapter/hook. REQ-001.6: synthetic migration, corruption, failure, correction and retrieval tests. This records implementation correspondence, not prior phase approval.

Security review: assets are entries, original bodies and entity mappings. Risks include data loss on malformed/quota/unavailable storage, unintended alias cascades and source search outside protected UI state. Mitigations implemented are schema/ID validation, no overwrite of unreadable or future-version data, observable write results, source-position replacement and explicit retrieval flag. Browser storage remains readable to same-origin script/browser access. No secrets or dependencies added. Production dependency audit was attempted but failed because registry.npmjs.org could not resolve (environment failure); no clean dependency-audit claim.

## Verification and limits

All 15 root domain/core tests pass; TypeScript and app production build pass. Raw evidence is in ../../evidence/hackathon-functionality/. Tested locally using synthetic records only. No browser acceptance or deployment performed. Demo source unchanged. App shell integration is pending: existing persistence calls benefit from validation/empty preservation, but the current shell ignores their result and does not yet consume the correction/retrieval hook. Wiring and precise API limits are documented in ../../../docs/implementation/journal-core.md.

Next slice: coordinate shell/error/search wiring, capture source titles and explicit revision/mention identities, support per-mention mistaken-identity correction and add cross-tab conflict detection. Real protected storage/key custody and authentication need an explicit product/architecture decision before implementation. No immutable evidence or confidentiality guarantees are asserted.
