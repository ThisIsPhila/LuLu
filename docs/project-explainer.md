# LuLu — project explainer

For teammates and their coding agents. Updated 23 October 2026. This explains the current direction; it is not an approved implementation specification. Read [current project memory](../.sdd/memory/project-context.md) and the active phase before starting work.

## The problem and intended experience

Someone in an unsafe situation may need to preserve a private account of events or find support without visibly advertising that need. LuLu is intended to be a useful everyday companion or utility with deliberate access to a protected personal space. The exact ordinary utility and access gesture are still open.

Within the protected space, the proposed experience includes incident records, supporting material, a chronology and relevant support information. Users control disclosure. AI assistance does not automatically send records to others or escalate incidents.

LuLu is Team KHÔRA's entry in the FNB App of the Year Hackathon 2026, under **Safer communities and gender-based violence response**. The team began as a solo entry and is now collaborating. Repository collaboration and Sonke team membership are separate steps.

## Intended privacy architecture

The design direction is to process raw identifying information locally, before storage outside the device or cloud AI calls:

1. A user deliberately enters a passkey-gated protected session.
2. Local processing identifies sensitive information and substitutes stable entity references.
3. An encrypted local mapping connects entity IDs, aliases and actual identifying details. Identity must not depend on alias spelling.
4. Intended cloud-visible records and model requests contain scrubbed material. An authorised local view can restore identifying details or display aliases.
5. Leaving the protected space ends its session. Exact timeout, backgrounding, key custody and recovery behaviour require design.

This is an intended boundary, not a guarantee already implemented. A name replacement alone does not anonymise a narrative. Dates, relationships, locations, attachments and metadata can still identify someone. Local detection quality, review, device-only saving and supported input types remain open decisions.

Passkeys authenticate access; they do not by themselves encrypt records. Encryption, key storage, recovery and session authority require separate contracts. Restoring original keys/mappings is different from manually relabelling surviving pseudonymous records. Admin access must not imply access to decrypted identity mappings.

## AI role

**OpenAI Decisions API** is the intended tool for fast bounded classifications, such as a second-pass risk check on material already scrubbed locally. It returns predicates, choices or scores. It is not the local privacy boundary, a text-span replacement engine or a general narrative-generation API. Its exact LuLu questions, thresholds, fallback behaviour and evaluation cases remain undecided.

Official reference: https://developers.openai.com/api/docs/guides/decisions

Do not adopt a cloud-first shortcut without an explicit architecture decision and an accurate description of the resulting privacy limitations.

## Product and implementation boundaries

- Customer-facing web app and separate admin web app are the intended surfaces, backed by shared services.
- The hackathon demo prioritises web; future mobile clients are considered. Capacitor, Firebase, TypeScript monorepo layout and Cloudflare-managed hosting/subdomains are candidates, not approved stack decisions.
- Confessions is a separate existing product. Its inspected code supplies evidence of passkey-based pseudonymous identity and cross-device continuation, not proof of an encrypted LuLu vault. Do not copy its entire application, connect user identities across products or assume its archive specifications describe current code.
- The privacy capability could later become a separate KHÔRA offering. That business is outside the hackathon delivery; proprietary internals must not be published merely to explain this project.
- Confessions' visual design is not automatically LuLu's design. LuLu design direction is still forthcoming.

## What exists today

The private GitHub repository, SDD core, security-oriented templates, agent entry points and project memory exist. The optional local SDD visual workspace has been installed and verified on the initial developer's machine. No product code, approved first specification or final application stack exists at this checkpoint.

The visual workspace is development tooling, not LuLu's runtime UI. Its derived dashboards do not replace specifications, evidence or human approval. A running instance on one laptop is not available on another laptop automatically.

## Hackathon deliverables

The programme inspected on 23 October lists:

| Checkpoint | When |
|---|---|
| Team profile and progress update | Friday 23 October; progress before midnight |
| Security/SSDLC update | Saturday 24 October, 12:00–12:30 |
| 20-second HustleWindow pitch | Saturday 24 October, 13:30 |
| Lean Business Canvas | Sunday 25 October, 12:00–12:30 |
| Final app, slides, repository link and demo access | Monday 26 October, 23:59 |

Times are recorded as South African event times. Check live organiser notices for changes. Older dashboard text says noon for the video; the detailed programme and team upload control say 13:30. Mentor support is scheduled for 23–25 October. Do not treat this historical table as a live schedule monitor.

## Where to go next

- [Contributor workflow](../CONTRIBUTING.md): getting started, coordinating agents and submitting changes.
- [AGENTS.md](../AGENTS.md): agent entry point; Claude Code also reads the pointer in CLAUDE.md.
- [Project context](../.sdd/memory/project-context.md): decisions and reconciled source limits.
- [Architecture thinking](../.sdd/memory/archive/context/2026-10-23-privacy-architecture-direction.md): original working direction, not an approved spec.
- [SDD onboarding](../.sdd/AGENT_ONBOARDING.md): canonical specification and execution workflow.

The next owner input is architecture/design direction. Contributions can review assumptions and propose alternatives, but must not silently turn these ideas into approved scope.
