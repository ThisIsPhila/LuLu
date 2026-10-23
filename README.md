# LuLu

Private development workspace for Team KHÔRA’s FNB AOTY Hackathon 2026 project.

SDD is installed with the full-stack+devsecops profile. Start with AGENTS.md and .sdd/AGENT_ONBOARDING.md. No application stack or first specification has been approved.

## Start here

New teammates: read [the project explainer](docs/project-explainer.md), then [contributor setup and coordination](CONTRIBUTING.md). Agents start at [AGENTS.md](AGENTS.md); Claude Code has a matching [CLAUDE.md](CLAUDE.md) pointer.

Read the [current product vision](.sdd/memory/product-vision.md) before older architecture handoffs; it supersedes incompatible framing. The first product specification has not been created. Architecture and design discussion is ongoing. The private repository contains the historical context files as well as the latest reconciled project memory.

## Local framework workspace

The ignored .sdd-framework clone supplies the optional visual interface. To restore it, clone https://github.com/ThisIsPhila/Spec-Driven-Development-Framework.git at revision 20642e42c9f63f4e93bfbc56c849eabc092ce787 into .sdd-framework, then run npm --prefix .sdd-framework/visual ci and npm --prefix .sdd-framework/visual run build.

Launch: npm --prefix .sdd-framework/visual run workspace -- --project "$PWD"

Keep the generated local launch credential private. Markdown in .sdd remains authoritative.

Apply `.sdd/evidence/setup/visual-security.patch` in the framework clone before installing dependencies to reproduce the local DOMPurify security correction.
