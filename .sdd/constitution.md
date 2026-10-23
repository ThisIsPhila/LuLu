# Project SDD Constitution

**Status:** Active
**Version:** 2.0
**Effective:** [installation date]

## 1. Authority and truth

The owner sets scope and may grant a written, bounded exception. System instructions, this constitution, approved phase documents, and repository evidence govern in that order. An exception changes only what it names.

Claims describe the revision and environment actually observed. Local verification, deployment, authenticated verification, owner acceptance, publication, merge, and external mutation are distinct states. Missing evidence is pending or blocked, never inferred success.

## 2. Specification-driven work

Implementation requires traceable requirements, design, and tasks. Normal progression is requirements → design → tasks → execution → verification → owner acceptance. Exceptions live in `.sdd/memory/governance/`.

Authoring is not execution authority. A checked task requires its implementation and stated evidence on the exact assessed tree. Phase completion additionally requires reconciled state, cleared no-go conditions, and owner acceptance.

## 3. Artifact boundary

- Specs and traceability: `.sdd/specs/`
- Raw verification: `.sdd/evidence/<phase>/`
- Audits and closeout reports: `.sdd/reports/<phase>/`
- Current lifecycle state: `.sdd/memory/current-state/`
- Owner exceptions: `.sdd/memory/governance/`
- Historical thresholds/context: `.sdd/memory/archive/`

`docs/` is for product, API, operator, and user documentation—not authoritative SDD status or evidence. Root agent files point here and do not duplicate policy.

## 4. Project invariants

Define durable project-specific product, data, deployment, identity, and safety boundaries here. Profiles may append universal discipline; they must not invent product facts.

## 5. Security, privacy, testing, and operability

Designs identify trust boundaries, data classification, failure modes, negative cases, recovery, accessibility, observability, and environment separation. Secrets remain outside version control. Applicable tests run deterministically against the exact tree. Evidence records procedure, revision, environment, timestamp, result, and limitations.

## 6. Preservation and change control

Preserve hooks, history, user work, project rules, and archived phases. Framework upgrades are conservative and report conflicts rather than overwriting project meaning. Constitution changes require owner authority, a version/date change, a rationale in `.sdd/reports/`, and corresponding tooling/template updates.

---

## Amendment: Security-First Development

**Principle:** All changes must be evaluated for security impact before implementation.

**Requirements:**
1. Threat modeling is mandatory for design phase
2. Security checklist must be completed before task execution
3. Dependencies must be scanned for vulnerabilities
4. Secrets must never be committed to version control

**Enforcement:** Agents must refuse to proceed without security review.
