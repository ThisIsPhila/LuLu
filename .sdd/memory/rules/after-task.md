# After Task Rules

## Purpose
These rules ensure every task ends with verified quality, updated documentation, and complete traceability.

## Completion Sequence (Follow In Order)

### Step 1: Verify Code Quality Gates

Run all checks in non-interactive mode. Stop immediately if any fail.

```bash
# Example checks - adjust for your stack
npm run lint
npm run build
npm run test
```

If the work touched a shared package/module, ensure it builds in isolation.

### Step 2: Record the Task Summary

Create `memory/completed-tasks/task-[PHASE]-[NUMBER]-summary.md` using this template.

```markdown
# Task {PHASE}-{NUMBER} Summary: {Task Title}

Completed: {DATE}
Status: COMPLETE

## Overview
- Scope: {One paragraph of outcomes}
- Related Requirement: {Requirement reference}
- Related Design Section: {Document anchor}

## Deliverables
- [ ] Code: {key file paths}
- [ ] Tests: {test files touched}
- [ ] Documentation: {docs or specs updated}

## Test Evidence
- Lint: (pass)
- Build: (pass)
- Tests: (pass, {N} tests run)
```

### Step 3: Final Checklist

#### 1. Verification
- [ ] Run all tests (unit + integration).
- [ ] Manual check of the feature (if applicable).

#### 2. Documentation
- [ ] Mark task as `[x]` in `tasks.md`.
- [ ] Update `memory/current-state/progress.md`.

#### 3. Cleanup
- [ ] Remove unused branches.
- [ ] Merge to `main`/`dev`.

#### 4. Handoff
- [ ] Create a brief "Work Done" summary.
- [ ] Note next steps for the next agent/session.

### Step 4: Final Communication

Send a completion message to the user that includes:
- Task status and summary link.
- Key tests executed.
- Any remaining risks or follow-up actions.

## ⚠️ Common Violations (PREVENTION)

### ❌ VIOLATION 1: Incomplete Documentation
**Prevention:** Step 2 is MANDATORY.

### ❌ VIOLATION 2: Skipping Tests
**Prevention:** Step 1 requires ALL test categories.

### ❌ VIOLATION 3: Automatic Next Task
**Prevention:** Always wait for user approval before starting the next task.
