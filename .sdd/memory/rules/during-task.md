# During Task Rules

## Purpose
Maintain quality and traceability while coding.

## Checkpoint Protocol

### 1. Test-First (TDD)
- [ ] Write a failing test for the current unit of work.
- [ ] Run test to confirm it fails (RED).
- [ ] Implement minimum code to pass (GREEN).
- [ ] Refactor if needed.

### 2. Atomic Commits
- Format: `feat(scope): message [Task-ID]`
- Commit often, but ensure build passes.

### 3. Documentation
- Update `tasks.md` status to `In Progress` for current task.
- Update `memory/current-state/progress.md` with blockers or key updates.
- Update `progress-tracker.md` if significant progress or blockers occur.
- Ensure any spec artifacts are saved under `.sdd/specs/` (not `docs/`).

### 4. Stuck?
- If stuck > 15 mins, stop.
- Document the issue in `memory/issues.md` (or similar).
- Ask user for clarification.
