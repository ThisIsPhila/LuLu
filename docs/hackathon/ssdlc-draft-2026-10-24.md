# LuLu — SSDLC draft for owner review

24 October 2026. Revised around the intended product, architecture direction and security lifecycle. Proposed controls and planned tests are not claims of completed implementation. Owner will review, edit and submit.

## Security Requirements (Risk Assessment)

LuLu is being designed as an everyday journal and storybook with a discreet protected experience for documenting abuse, harassment and other difficult experiences. The security goal is to help people preserve their records, maintain continuity and choose when and how to seek support or disclose information. This includes users of all genders facing shared-device access, stigma or coercive control.

Our risk assessment prioritises original narratives, identifying details, private associations, supporting evidence and access/recovery material. The principal risks are unintended discovery, unauthorised disclosure, record alteration or loss, and loss of access when a device becomes unavailable.

The proposed requirements are protected access, device-controlled private associations, encryption with explicit key custody, data minimisation, discreet session exit, evidence integrity and user-controlled sharing. Ordinary journaling should remain useful without activating sensitive processing. Support/referral pathways should let users seek help without automatically disclosing their records. These requirements will guide implementation and verification throughout development.

## Threat Modelling & Design Review

Our design review will trace information across the ordinary journal, protected experience, device storage, synchronisation, AI processing, recovery and administration. Storage and AI services will be assessed separately, with an explicit account of what each can receive and access.

The intended privacy layer recognises people, places, times and contextual relationships and produces a coherent concealed narrative while preserving the author's ability to retrieve their original meaning. Private associations are intended to remain under device-side control. Concealment will complement authentication and cryptographic protection.

Threat scenarios will include access to an unlocked device, coerced access, exposed sessions or backups, malicious scripts, misconfigured permissions, revealing metadata and incorrect entity associations. Design responses include passkey-mediated protected access, session clearing on exit, minimal sensitive telemetry and separation of administrative privileges from private content. Original evidence and transformed representations will remain distinguishable. Recovery and authorised device access will be designed to support continuity without creating an unnoticed access route. Residual risks outside the app's control will be documented.

## Development (Secure coding practices)

We will develop LuLu using modular components and explicit boundaries between the journal interface, privacy processing, protected access, persistence, evidence handling and external services. This makes security responsibilities reviewable and allows processing methods to evolve without changing the user's writing experience.

Our spec-driven workflow will connect product requirements to design decisions, implementation tasks and verification evidence. Security-sensitive changes will receive review before integration. Practices will include input and model-output validation, safe rendering of user content, least-privilege authorisation, protected service credentials, dependency review and separation of development, test and deployment environments.

Sensitive narratives, private associations, keys and credentials must stay out of repositories, diagnostic logs and analytics. Attachment handling will include file validation, access controls and careful treatment of metadata and previews. Original records will be protected from accidental overwrite by narrative transformations. External AI output will be treated as untrusted data and will not grant access or trigger disclosure. Exact cryptographic and recovery mechanisms will be recorded as architecture decisions and verified during implementation.

## Security Testing

Our security test plan will follow the user's full journey: ordinary writing, protected access, contextual transformation, correction, saving, retrieval, exit, continuity and selective disclosure. Synthetic scenarios will cover both successful use and attempts to cross trust boundaries.

Testing will include unauthorised and cross-user access, session expiry, exit followed by back navigation or reload, and checks for sensitive content in storage, network traffic, logs, notifications and previews. Privacy-processing tests will examine missed identifiers, revealing context, incorrect associations, cross-entry consistency and correction without damage to the original record.

Evidence and continuity tests will cover original-versus-transformed records, attachment integrity, interrupted writes, device loss, authorised recovery and deletion behaviour. Integration checks will cover storage permissions, API authorisation, malicious inputs, secret exposure and dependencies. Results will identify the tested revision and environment, observed behaviour and unresolved findings. These are planned security checks; completion will be supported by recorded evidence rather than inferred from a working interface.

## Assessment & Secure Integration

We will assess LuLu against its central outcomes: discreet documentation, preserved meaning and evidence, dependable continuity and user control over disclosure. Integration decisions will be reviewed against the risk assessment and trust boundaries, with security findings feeding back into design and implementation.

Before release, the team will review data flows, encryption and key custody, protected-session behaviour, recovery, retention/deletion, least-privilege permissions and dependency findings. Cloud storage and AI processing will each require a clear purpose and minimum necessary data. Device-local processing is the intended direction for privacy transformation; any hosted processing used for the hackathon will have its data exposure and limitations explicitly documented.

Sharing and referral flows will require the user's deliberate choice of recipient and material. Original evidence, derived narratives and exports will have distinguishable provenance. The review will record verified controls, remaining risks, accountable follow-up and release decisions. High-impact unresolved exposure will be addressed before handling real sensitive records. This assessment describes the intended security lifecycle; implementation and test evidence will establish which controls are ready for use.
