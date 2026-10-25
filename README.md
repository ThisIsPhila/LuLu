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

Main responsive app: `http://127.0.0.1:5173/` (root `src/`, no demo toolbar or phone frame).

Current app in a responsive review frame: `http://127.0.0.1:5173/demo/` (loads root `src/`; see [demo notes](demo/README.md)). The old independent snapshot is at `http://127.0.0.1:5173/demo/legacy.html` (`demo/src/`). Separate build commands: `npm run build:app` → `dist/app/`, `npm run build:demo` → `dist/demo/`. `npm run build` builds both without combining their output. `npm run dev:demo` serves these same routes on port 5174. The frame and current app share browser storage; the old snapshot retains its separate storage key. The app still inherits the existing local feature implementation; separating it is not a claim that all planned capabilities are complete. The latest warm/tactile design references are in [design resources](docs/design/README.md); visual integration is next.

The current implementation includes local journal screens, deterministic example/reference substitutions and perspective changes. The newer interactive implementation is preserved in the demo and provides the starting components for the separate app. Its passkey interaction is simulated, and its entry model can persist original text in browser storage. Use synthetic data; production authentication, encryption, backend and AI integration remain separate implementation work. The latest separation changes packaging and layout, not those underlying capabilities.

## Work areas for teammates

- Product and current handoff: [.sdd/memory/current-state/active-context.md](.sdd/memory/current-state/active-context.md). Includes subsequent decisions and outstanding work.
- Architecture: [Phase 001 draft requirements](.sdd/specs/active/phase-001-architecture-foundation/requirements.md). Not yet approved for execution.
- Visual direction: [design references](docs/design/README.md). Mobile-first alignment and owner acceptance remain pending.
- Prototype: `src/components`, `src/domain`, and `src/hooks`; local verification in [.sdd/evidence/prototype/](.sdd/evidence/prototype/).
- Hackathon materials: [SSDLC draft](docs/hackathon/ssdlc-draft-2026-10-24.md). Describes intended security lifecycle, awaiting owner review/submission.

Commit subjects distinguish architecture drafts, design context, prototype implementation, hackathon materials and shared documentation. Commit bodies record scope and validation; a shared draft does not imply approval or completed implementation.
