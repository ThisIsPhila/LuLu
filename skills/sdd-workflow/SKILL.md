---
name: sdd-workflow
description: Use this skill when a task should follow Spec-Driven Development with requirements, design, tasks, and memory updates.
---

# SDD Workflow Skill

Use this skill for feature work, refactors, and substantial bug fixes that should be tracked in `.sdd/`.

## Required Inputs

- The target spec folder under `.sdd/specs/{active,archive,backlog}/`
- Current task context from `.sdd/memory/current-state/`

## Workflow

1. **Before coding (Spec Creation)**:
   - Read `.sdd/AGENT_ONBOARDING.md`, `.sdd/constitution.md`, and relevant rules.
   - Create the phase with `bash .sdd/scripts/phase.sh new <phase-name>`.
   - Review and approve sequentially with `approve requirements`, `approve design`, then `approve tasks`; each approval scaffolds the next artifact.
   - Never record approval until the user explicitly approves that artifact.

2. **Phase Execution Sprint (Implementation)**:
   - Once all specs are approved, initialize the sprint by running the startup hook:
     ```bash
     bash .sdd/scripts/phase.sh start <phase-name>
     ```
   - Present the printed `BEFORE-TASK CHECKLIST COMPLETE` block to the user and wait for START confirmation.
   - For each task you work on:
     - Mark it in progress: `bash .sdd/scripts/phase.sh task <task_id> doing`.
     - Implement the task, test locally, and commit using conventional commit syntax referencing the requirement (e.g. `feat: implement validation (REQ-1.2)`).
     - Mark it done: `bash .sdd/scripts/phase.sh task <task_id> done`.
   - To check overall completion status, run:
     ```bash
     bash .sdd/scripts/phase.sh status
     ```

3. **Sprint Completion**:
   - Once all tasks are done, execute the finish hook to validate code quality and update progress:
     ```bash
     bash .sdd/scripts/phase.sh finish
     ```
   - Request the user to review/merge the branch. When approved, archive the phase if explicitly instructed:
     ```bash
     bash .sdd/scripts/phase.sh archive <phase-name>
     ```

## Guardrails

- Never write code without an approved spec.
- Never archive a spec folder unless explicitly instructed by the user.
- Do not create spec artifacts outside `.sdd/specs/`.
- Keep `docs/` for project documentation, not spec triplets.
- If you find stray spec files, run `bash .sdd/scripts/scan-strays.sh`.
- Reconcile current state, intended state, observed gap, next authorized action, and learning after verification.
- Classify failures before changing direction; revise intent only through a recorded decision or successor spec.
- Keep implementation, local verification, deployment, authenticated-owner verification, and owner acceptance distinct.
