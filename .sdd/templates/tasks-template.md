# [Phase N] — [Phase Name] — Tasks

**Status:** DRAFT
**Requirements:** Approved [date/marker]
**Design:** Approved [date/marker]
**Execution authority:** Not granted

Only top-level task lines carry lifecycle checkboxes.

## Task plan

- [ ] **[T[N].1]** [Outcome-oriented task name]
  - **Objective and requirements:** Observable result and REQ-[N].x links.
  - **Design references:** Decisions and sections implemented.
  - **Implementation and owned outputs:** Concrete behavior, boundaries, state transitions, and outputs.
  - **Owned paths:** Existing paths and explicitly proposed new paths.
  - **Dependencies and inputs:** Prior tasks, services, schemas, decisions, and external authority.
  - **Positive and negative verification:** Success inputs/results plus failures that must fail closed.
  - **Acceptance evidence:** `.sdd/evidence/phase-[N]/...` with tree, environment, timestamp, result, and limitations.
  - **No-go conditions and handoff:** What blocks completion and the exact downstream contract.

- [ ] **[T[N].2]** [Second outcome-oriented task name]
  - **Objective and requirements:** Observable result and REQ-[N].y links.
  - **Design references:** Decisions and sections implemented.
  - **Implementation and owned outputs:** Concrete behavior, boundaries, state transitions, and outputs.
  - **Owned paths:** Existing paths and explicitly proposed new paths.
  - **Dependencies and inputs:** T[N].1 plus services, schemas, decisions, and external authority.
  - **Positive and negative verification:** Success inputs/results plus failures that must fail closed.
  - **Acceptance evidence:** `.sdd/evidence/phase-[N]/...` with tree, environment, timestamp, result, and limitations.
  - **No-go conditions and handoff:** What blocks completion and the exact downstream contract.

## Dependency map

```text
T[N].1 → T[N].2 → T[N].3
```

## Traceability

| Requirement | Design decision | Tasks | Verification | Evidence home |
|---|---|---|---|---|
| REQ-[N].x | [section] | T[N].1 | [check] | `.sdd/evidence/phase-[N]/...` |

## Completion criteria

Every task and applicable positive/negative check passes on the exact assessed tree; state, specs, evidence, and reports agree; remote claims have remote observations; residual risks and downstream ownership are explicit; and the owner records acceptance.
