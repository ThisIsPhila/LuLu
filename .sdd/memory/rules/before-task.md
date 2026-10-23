# Before Task Rules

## Purpose
Ensure the agent/developer has correct context and alignment before starting work.
This checklist must be effectively completed before writing any code.

## Checklist

### 1. Context Review (MANDATORY)
Before opening the editor, you **must**:

- [ ] **Review the current active spec:**
    - `.sdd/specs/active/[feature]/requirements.md`
    - `.sdd/specs/active/[feature]/design.md`
- [ ] **Review project context:**
    - `memory/project-overview.md` (High-level goal and scope)
    - `memory/progress-tracker.md` (Phase status)
- [ ] **Check the latest status:**
    - `memory/current-state/progress.md` (Active blockers/risks)
    - `memory/current-state/active-context.md` (Current focus)
- [ ] **Review Technical Decisions:**
    - `memory/technical-decisions.md` (Ensure no ADRs are violated)
- [ ] **Confirm spec naming convention:**
    - `memory/rules/spec-naming.md`
- [ ] **If monorepo coordination is used, review:**
    - `memory/rules/monorepo-governance.md`
    - `coordination/progress/current-phase-status.md`

### 2. Branch Management
**Naming convention:**
`feature/task-[phase]-[task]-[short-description]`

**Workflow:**
- [ ] Checkout `main` (or dev base).
- [ ] Pull latest changes.
- [ ] Create new branch.

### 3. Constitution & Principles Check
- [ ] **Article I - Security:** Ensure no secrets will be exposed.
- [ ] **Article II - Spec-Driven:** Confirm requirements/design are approved.
- [ ] **Article III - Test-First:** Have a plan for the first failing test.
- [ ] **Article IV - Boundaries:** Validate monorepo package boundaries are respected.
- [ ] **Article V - Blindness:** Confirm PII masking/encryption paths are defined.
- [ ] **Article VI - AI & Context:** Keep project context files updated.

### 4. Scope Confirmation
- [ ] Re-state the task goal from `tasks.md`.
- [ ] Identify dependencies.
- [ ] **Wait for approval** if this is a new large task.

---

## Starting Work Confirmation

Before implementation begins, post the following summary to the user:

```markdown
BEFORE-TASK CHECKLIST COMPLETE

Task: [Phase-Task ID and short description]
Branch: feature/task-[phase]-[task]-[slug]
Requirements: [Reviewed]
Design: [Reviewed]
Tasks Plan: [Validated]
Security/Constitution: [Checked]
Test Strategy: [Briefly outlined]
Blockers: [None | List blockers]

Ready to proceed with Task [ID]. Awaiting confirmation to START.
```

---

## DevSecOps Extension: Security Impact Assessment

Before starting implementation, confirm:

- [ ] Security impact assessed (data sensitivity, threat exposure)
- [ ] Authentication/authorization requirements identified
- [ ] PII handling path defined (masking/encryption)
- [ ] Dependency risk reviewed (known vulnerabilities)
