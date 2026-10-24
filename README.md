# LuLu

Private development workspace for Team KHÔRA’s FNB AOTY Hackathon 2026 project.

SDD is installed with the full-stack+devsecops profile. Start with AGENTS.md and .sdd/AGENT_ONBOARDING.md. A local React/TypeScript prototype is available. Phase 001 remains a draft; see the bounded prototype direction in .sdd/memory/governance/.

## Start here

New teammates: read [the project explainer](docs/project-explainer.md), then [contributor setup and coordination](CONTRIBUTING.md). Agents start at [AGENTS.md](AGENTS.md); Claude Code has a matching [CLAUDE.md](CLAUDE.md) pointer.

Read the [current product vision](.sdd/memory/product-vision.md) before older architecture handoffs; it supersedes incompatible framing. The first product specification has not been created. Architecture and design discussion is ongoing. The private repository contains the historical context files as well as the latest reconciled project memory.

## Local framework workspace

The ignored .sdd-framework clone supplies the optional visual interface. To restore it, clone https://github.com/ThisIsPhila/Spec-Driven-Development-Framework.git at revision 20642e42c9f63f4e93bfbc56c849eabc092ce787 into .sdd-framework, then run npm --prefix .sdd-framework/visual ci and npm --prefix .sdd-framework/visual run build.

Launch: npm --prefix .sdd-framework/visual run workspace -- --project "$PWD"

Keep the generated local launch credential private. Markdown in .sdd remains authoritative.

Apply `.sdd/evidence/setup/visual-security.patch` in the framework clone before installing dependencies to reproduce the local DOMPurify security correction.

## Run the app prototype

`npm install`, then `npm run dev` (local Vite server). `npm run build` checks TypeScript and builds; `npm test` verifies the demonstration transformer.

Ordinary journaling supports creation, reading, editing, search, filters, favorites and deletion with browser-local persistence. Protected writing is an explicitly labelled preview session with deterministic example/reference substitutions and perspective changes. It is not production authentication, general PII detection, encryption or OpenAI Decisions integration. Source text and mapping edits are session-only; concealed protected entries are saved locally. Use synthetic examples. Shared backend, admin and mobile builds remain future work.

## Work areas for teammates

- Product and current handoff: [.sdd/memory/current-state/active-context.md](.sdd/memory/current-state/active-context.md). Includes subsequent decisions and outstanding work.
- Architecture: [Phase 001 draft requirements](.sdd/specs/active/phase-001-architecture-foundation/requirements.md). Not yet approved for execution.
- Visual direction: [design references](docs/design/README.md). Mobile-first alignment and owner acceptance remain pending.
- Prototype: `src/components`, `src/domain`, and `src/hooks`; local verification in [.sdd/evidence/prototype/](.sdd/evidence/prototype/).
- Hackathon materials: [SSDLC draft](docs/hackathon/ssdlc-draft-2026-10-24.md). Describes intended security lifecycle, awaiting owner review/submission.

Commit subjects distinguish architecture drafts, design context, prototype implementation, hackathon materials and shared documentation. Commit bodies record scope and validation; a shared draft does not imply approval or completed implementation.
