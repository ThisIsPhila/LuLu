# LuLu — project explainer

For teammates and their coding agents. Updated 23 October 2026. This explains the current direction; it is not an approved implementation specification. Read [current project memory](../.sdd/memory/project-context.md) and the active phase before starting work.

## The intended experience

**Write normally; LuLu handles the concealed representation naturally.** A person journals in ordinary language. LuLu recognises people, places, times, relationships and revealing context, then transforms them into a coherent private narrative. Subtle visual indicators show associations as they develop; the writer can correct them in place without approving every transformation.

For example, David visiting a home at a particular time could appear as “Person A/John came to the Nest at Blue Moon.” The goal extends beyond name replacement: preserve the meaning and relationships while concealing real-world references. The author can retrieve records through their original intent and words without memorising the transformed wording. Changing an alias preserves its underlying associations.

The everyday outer app is deliberately undecided: storybook/writing, notes, tasks or another authentic utility. A deliberate concealed interaction opens the protected experience using a passkey when required, without a conventional sign-in journey. Leaving ends protected access.

LuLu is Team KHÔRA's FNB AOTY Hackathon 2026 entry for safer communities and GBV response. The team now collaborates across Codex and Claude Code.

## Current vision and engineering approach

Read [the owner’s corrected product vision](../.sdd/memory/product-vision.md). It replaces incompatible framing in earlier architecture/handoffs. Approach the hackathon optimistically: choose a practical route to an impressive, coherent demonstration of this experience, then refine it using evidence.

Logical capabilities include natural writing/feedback, entity continuity, device-controlled private mappings, protected access, contextual transformation, decisions, synchronised records and administration. They are not a prescribed list of separate services.

Local/edge transformation before the next layer needs the content is the target. The first demo's processing placement, sequencing, models and trade-offs remain engineering choices. **OpenAI Decisions API** is selected for demo decisions, one service among others; it is not synonymous with cloud storage or the whole privacy engine. Its exact role is not yet prescribed.

Customer and separate admin web applications are intended. Web is the demonstration priority, with iOS/Android anticipated. Firebase, Capacitor, a TypeScript monorepo and Cloudflare subdomains are candidates, not adopted decisions. Design discussion comes next.

## Useful foundations

Confessions supplies real passkey-first identity and multi-device experience. Draw on inspected code where useful; LuLu has its own interaction model. Distinguish authentication from encryption/key custody as engineering details are designed. Stable entities should survive alias changes; continued device access and human re-association offer different recovery experiences to explore.

The privacy capability may eventually become a reusable KHÔRA product. Building that standalone business is not this hackathon deliverable. Preserve proprietary boundaries when sharing public demonstration material.

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
- [Current product vision](../.sdd/memory/product-vision.md): owner-supplied replacement; earlier handoffs are historical context only.
- [SDD onboarding](../.sdd/AGENT_ONBOARDING.md): canonical specification and execution workflow.

The next owner input is architecture/design direction. Contributions can review assumptions and propose alternatives, but must not silently turn these ideas into approved scope.
