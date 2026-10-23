# GitHub Copilot Instructions (SDD)

Use `AGENTS.md` as the canonical instruction file for this repository.

Before implementation, always apply `.sdd/AGENT_ONBOARDING.md`, `.sdd/constitution.md` (or `.sdd/memory/constitutional-framework.md` on legacy setups), and `.sdd/memory/rules/*`.

## Required Workflow

- No code without approved spec artifacts (`requirements.md`, `design.md`, `tasks.md`).
- Run phase sprint hooks (`bash .sdd/scripts/phase.sh start <phase>`, `task <id> done/doing`, and `finish`) to execute active phase sprints.
- Keep all spec artifacts under `.sdd/specs/`.
- Keep project documentation in `docs/`.
