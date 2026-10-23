# File Placement Rules

## Purpose
Keep specs and project documentation cleanly separated so agents and humans can find the right artifacts.

## Rules
- **All SDD specs live in `.sdd/specs/`**.
  - Requirements, design, tasks, and spec artifacts must be created under `.sdd/specs/...`.
- **Project documentation lives in `docs/`** (user guides, architecture notes, runbooks).
  - Do not place `requirements.md`, `design.md`, or `tasks.md` inside `docs/`.
- **Templates live in `.sdd/templates/` only.**

## Quick Checks
- If a file is named `requirements.md`, `design.md`, or `tasks.md`, it must be under `.sdd/specs/`.
- If a file is in `docs/` and reads like a spec, move it to `.sdd/specs/` and link to it from `docs/` if needed.

## Suggested Tooling
Run:
```bash
bash scripts/scan-strays.sh
```
