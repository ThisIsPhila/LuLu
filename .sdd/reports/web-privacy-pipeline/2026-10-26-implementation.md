# Web privacy workflow — 26 October 2026

Owner requested implementation across layers with simultaneous Luna High delegation. Three GPT-6 Luna High agents implemented cloud processing, app workflow/contracts, and entity continuity. Parent integrated the layers, fixed runtime lifecycle cleanup, reviewed authority boundaries, and exercised the local browser using synthetic text. Formal SDD remains paused under the recorded owner exception. Reverse mapping: draft REQ-001.3–REQ-001.6; this is not formal phase approval.

## Delivered locally

- Main app Settings links model installation, browser storage status, prepare/unload and the actual scan workflow. The existing local-preview model cache can be copied with checksum verification.
- Original source highlights and replacement output remain separate. The view explicitly says Not processed before a successful run. Runtime proof identifies the actual model revision, WASM execution and measured inference duration.
- Model candidates include person, location, organisation, email, phone, date, time and relationship. Independent email/phone/time format recognisers are labelled separately; detection and aliases do not establish complete anonymity.
- Repeated exact normalized text/type pairs share an editable alias. Public demo mappings exist only in component memory; live private sessions persist mappings in encrypted IndexedDB using the existing per-owner device key. Lock/generation/account/dispose checks reject stale work and optimistic version checks reject concurrent replacement. This is exact matching, not semantic identity resolution; a changed detector label produces a separate type identity.
- Saved private text revisions can open the same scan view, bound to the saved revision and live vault session. Source text is cleared on private exit; saved originals are not overwritten. Scan results are previews, not automatically saved projections.
- Existing Johannesburg API has authenticated capability and reviewed-text contextual-risk endpoints. Selected OpenAI Decisions adapter fixes model gpt-6-luna, validates typed choices/confidence/probabilities and handles refusal as unknown. Any category explanation is fixed app copy; Responses remains an explicit optional adapter.
- Cloud requests require passkey private authority, explicit review/purpose and SHA-256/revision binding; unknown/raw fields are rejected. Client rechecks authority after token acquisition and before sending; server rechecks after the provider returns. There is no original/mapping transport or silent cloud fallback.
- Cloud input, output, timeout and concurrency are bounded. A Firestore transaction reserves from a global 20-per-UTC-day request ceiling in an existing _rateLimits document; upstream failures count. A separate five-per-session process-local burst ceiling remains. These are request limits, not a total monetary cap.

## Verification and remaining boundary

Build/packaging, focused client/library/processor/format tests, Functions tests and Firebase guard pass; final browser observations are in ../../evidence/web-privacy-pipeline/. Provider tests use fake transport. The direct app model runs in the browser; no native inference is required. Actual authenticated private-record and live cloud-provider journeys remain unverified. Long-document chunking, multilingual quality and calibrated recall/precision remain open.

No release or secret binding was applied. The default provider is disabled. The exact server-secret binding and narrow required guard change are prepared in functions/privacy-secret-binding-proposal.md; current resource limits and guard policy remain intact. Official domain deployment and provider use require the separate owner decision required by .sdd/memory/governance/2026-10-25-firebase-cost-boundary.md. Firebase mutation tools were not available among this session's tools; CLI must not be silently substituted.

Official provider contract and configuration: docs/technical/cloud-processing-2026-10-26.md. Earlier status saying Decisions could not be verified was incorrect and was corrected against the official guide/reference in this turn. No real provider calls were used to make that correction.
