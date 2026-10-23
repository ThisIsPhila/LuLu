> Historical context. Where framing differs, the current [product vision](../../product-vision.md) supersedes this document. Do not promote historical proposals into current technical decisions.

# LuLu privacy architecture — updated idea and decision record
Date: 23 October 2026
Status: Working direction for product discussion, NOT a completed specification or claim of implementation.

## What the user has clarified
LuLu is being designed as a customer-facing web application and a separate admin web application, with future iOS/Android clients (Capacitor under consideration), backed by shared application services. The hackathon demonstration prioritises the web app while keeping mobile support in the codebase. Firebase is a familiar candidate for data/auth/hosting services and Cloudflare-managed subdomains under thisisphila.co.za are contemplated. TypeScript monorepo and SDD organisation are proposals; exact repo decisions remain to be made. Design will be discussed later.

LuLu needs a discreet or protected operation that the user deliberately activates. The protected flow should request a passkey only at the moment it is activated, without requiring a conventional signed-in account experience. Closing the flow terminates its protected session. Do not assume passkeys alone encrypt the user's data: passkey authentication, key management, short-lived authorisation and encryption are separate implementation components.

The central privacy principle: raw identifying information is handled on the user's device, while stored records and external-model requests should contain stable pseudonymous references rather than identifying data. Example: the user writes 'David ...', locally associates David with an alias such as 'John' or an internal person ID, and the remotely stored record uses only the pseudonym/token. Encrypted local mappings can restore real identities for the authorised user. The user should also be able to choose whether to display a pseudonym or real identity while in the protected session. All input channels, including attachments, image/audio metadata and contextual disclosures, eventually require the same privacy boundary; these capabilities are still under discussion.

The intended AI component is **OpenAI Decisions API** for quick bounded PII-risk decisions and classifications. The user wishes to avoid referring to a previously considered technology at all in future project specifications. OpenAI Decisions is cloud-hosted, so the privacy stage that prevents direct exposure must execute locally before any API request. A small on-device model, deterministic PII detector or hybrid local pipeline is being considered; suitability and accuracy are open questions. Decisions can act as a second-pass risk classifier on already-scrubbed material. Its predicate/choice/score outputs do not directly supply full text spans for replacement; local detection/extraction and substitution require their own design. The cloud service is not itself the privacy boundary.

The user is evaluating two paths for the demo: (a) demonstrate local-first scrubbing with an inexpensive local method then cloud decision on scrubbed inputs; (b) if a cloud-assisted shortcut is used, disclose accurately that this is a prototype of the intended privacy property. No path is final yet.

## Data decomposition
- Clean record: chronology, narrative, references to stable person/entity IDs, with no intentionally retained direct identifiers in cloud-visible text.
- Private mapping vault: ID -> user-defined alias -> real-world identity or details; encrypted and ordinarily device-resident. Entity identity should not depend on alias spelling.
- Authority: explicit passkey-gated protected session; privileged reveal operations; terminate session on exit. Consider inactivity, backgrounding and screenshots for mobile.
- Separate backup/recovery authority: multiple trusted enrolled devices or encrypted backup/recovery method, potentially drawing from Confessions experience. Details and key-recovery mechanism are not yet specified.

## Recovery modes under exploration
A. Cryptographic recovery: another enrolled device / key recovery restores original encrypted mapping. The conversation establishes that the user built a multi-device passkey-based synchronisation capability for Confessions, but not how its internal secret-sharing/encryption works; verify actual code rather than inventing it.
B. Semantic reconstruction: if only the scrubbed records survive, user can relabel Person A locally based on surviving contextual cues. This is not equivalent to recovering original encryption keys or lost secrets, and cannot guarantee accurate identity reconstruction. It must not automatically resolve or assert a real-world identity.

## Threat and reliability considerations
- Redacting a person's name alone does not ensure anonymisation: combinations of events, exact dates, positions, locations, identifiers and attachments may still reveal identity.
- Strict local-only privacy and cloud model processing of original text are mutually incompatible for the same data path. API data-control options such as eligible Zero Data Retention may reduce exposure but do not make transmitted data remain on-device.
- False negatives in local PII detection matter. Support conservative defaults, visible review before upload, ability to save sensitive originals locally without synchronising, and an explicit choice to keep an entry device-only when confidence is low.
- Storing nothing in the cloud but scrubbed content and keeping mappings on devices creates hard recovery trade-offs: once the last mapping and its decryptable backup are lost, the original mapping is lost.
- Application passkeys support access but must not be assumed to directly encrypt/decrypt arbitrary mappings without a deliberately engineered cryptographic key architecture.

## Product separation
LuLu is a product/use case for a privacy capability. The user sees the privacy layer as potentially becoming an independent KHÔRA offering or service later, with reusable identity/secret-mapping boundaries and possible connections to multiple auth systems. This standalone business/product is an architectural direction, not in the hackathon scope. Avoid exposing proprietary mechanics in public application materials.

## Suggested component boundaries (architecture proposal)
- apps/web: customer-facing web demo; optionally basis for Capacitor mobile shell
- apps/admin: separate admin application with backend-enforced roles
- apps/mobile: native bridge/wrapper later, sharing core logic
- packages/core: domain entities and scrubbed record schemas
- packages/privacy-client: local PII detector, pseudonymisation, encrypted mappings, reveal/relock logic
- packages/auth: passkey orchestration and temporary protected access
- packages/contracts: shared validation/types
- services/backend: persistence, server-authorised operations and OpenAI Decisions client, receiving only scrubbed data in the intended architecture
- specs/: the user's Spec-Driven Development Framework artefacts (not a runtime dependency)
These paths are recommendations, not existing repo structure.

## Open decisions for product requirements
- Exactly what the ordinary/decoy-facing experience does and how secret mode is invoked
- Which types of content LuLu stores and which fields remain solely on device
- Pseudonymisation accuracy requirements, model sizes, on-device runtimes and offline behaviour
- Per-record confidence/approval flow and whether local device-only saving is supported
- Recovery hierarchy and opt-in encrypted backup policy
- Passkey user verification, cryptographic key wrapping and loss-of-all-devices policy
- Precise admin access limits: admins must not automatically receive decrypted private identity mappings
- Cloud API permissions, eligible data-retention controls, audit and deletion policy
- Final monorepo deployment/platform choices

## Confirmed vs exploratory
Confirmed user statements: existing Confessions passkey/cross-device experience; LuLu should have short-lived passkey-gated protected sessions, local PII maps and scrubbed cloud records as its intended product behaviour; separate customer/admin web surfaces and mobile support; OpenAI Decisions API as intended cloud decision tool; future potential independent privacy service.
Exploratory: specific local model and quality, end-to-end key protocol, automatic identity recovery from context, exact client/backend deployment, exact admin workflows and every other uninspected implementation detail.

This document reflects the conversation, not an inspection of the LuLu repository. The user previously reported that a separate Work agent found LuLu's directory empty; this handoff does not independently verify that observation.
