# AI Agent Onboarding Protocol

Welcome, Agent. You are now working within an **SDD (Spec-Driven Development) Framework**.
Your primary goal is to be helpful while strictly adhering to the project's structure and rules.

If this repo also contains `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gemini/GEMINI.md`, or `.github/copilot-instructions.md`, treat them as entrypoints that delegate to this file. This file is the canonical SDD workflow reference.

## Phase 0: Initialization (First Run)

**IF** the `.sdd/` directory does not exist yet (whether this is a new project or an existing one adopting SDD):

1.  **Run the Setup Script**: Execute `bash scripts/setup.sh`.
2.  **Verify Structure**: Ensure `.sdd/` created with `memory`, `specs`, and `templates`.
3.  **Self-Register**: Log your presence in `memory/current-state/active-context.md`.

---

## Phase 1: Context Acquisition

Before writing a single line of code or suggesting a plan, you MUST perform the following steps to ground yourself in the project reality.

### Step 1: Framework Recognition
You are in a repo that uses the `.sdd/` directory. This is your brain.
1.  Read `.sdd/memory/project-overview.md` to understand the high-level goal.
2.  Read `.sdd/memory/progress-tracker.md` to see where we are.
3.  Read `.sdd/constitution.md` to understand the non-negotiable rules.
4.  Read `.sdd/memory/rules/spec-naming.md` to follow the required spec folder naming convention.
5.  If monorepo coordination exists, read:
    - `.sdd/memory/rules/monorepo-governance.md`
    - `.sdd/coordination/progress/current-phase-status.md`
6.  If the root `skills/` directory exists, read only the relevant `SKILL.md` files for the current task.

### Step 2: Codebase Reconnaissance
If the memory files are empty or sparse, you must fill the gaps yourself:
1.  **Identify Tech Stack**: Look for `package.json`, `go.mod`, `Cargo.toml`, `requirements.txt`, etc.
2.  **Map Structure**: Run `ls -R` (limit depth if necessary) or use directory listing tools to understand the layout.
3.  **Check Conventions**: Look for existing patterns in the code. How are functions named? Where are tests located?

### Step 3: Self-Registration
If you have write access to `.sdd/memory/current-state/active-context.md` (or equivalent), log your session start and what task you are picking up.

---

## Phase 2: Workflow Adherence

### The Golden Rule
**No Code Without Spec.**
- If the user asks for a feature, check if a spec exists in `.sdd/specs/active/`.
- If NO spec exists, your first job is to help the user create one using the templates in `.sdd/templates/`.

### The Spec Lifecycle (Sequential)
**Condition**: You MUST create specs in this exact order. Do NOT create multiple files at once.

**Spec Folder Rule (Mandatory)**:
- Specs MUST live in `.sdd/specs/{active,archive,backlog}/` under a folder that matches the naming convention in `memory/rules/spec-naming.md`.
- For monorepos, keep root coordination artifacts updated in `.sdd/coordination/`.

1.  **Create (`phase.sh new`)**:
    - Run `bash .sdd/scripts/phase.sh new <phase-name>`.
    - This creates only `requirements.md` from the canonical template.
    - Review it with the user, then run `bash .sdd/scripts/phase.sh approve requirements` only after explicit approval.

2.  **Design**:
    - Approving requirements scaffolds `design.md`; no manual copying is needed.
    - Review it with the user, then run `bash .sdd/scripts/phase.sh approve design` only after explicit approval.

3.  **Tasks**:
    - Approving design scaffolds `tasks.md` with stable task IDs such as `T003.1`.
    - Ensure only high-level tasks have checkboxes.
    - Review it with the user, then run `bash .sdd/scripts/phase.sh approve tasks` only after explicit approval.
    - `phase.sh start` is a hard gate and refuses any phase missing these typed approvals.

4.  **Execute Phase Sprint (Task by Task)**:
    When instructed to work on an approved spec/phase, you MUST follow these automated steps:
    *   **Startup Hook**: Initialize the phase branch and register active context by running:
        ```bash
        bash .sdd/scripts/phase.sh start <phase-name>
        ```
        Then, post the printed `BEFORE-TASK CHECKLIST COMPLETE` block directly to the user and wait for approval.
    *   **Development Hook**: For each checkbox item you implement:
        - Mark the task in-progress: `bash .sdd/scripts/phase.sh task <task_id> doing`
        - Implement code, self-test, and commit locally. Make small commits referencing the requirement (e.g. `feat: add database validation (REQ-1.2)`).
        - Mark the task complete: `bash .sdd/scripts/phase.sh task <task_id> done`
        - Check progress anytime: `bash .sdd/scripts/phase.sh status`
    *   **Completion Hook**: Once all tasks are checked, verify codebase structure and validation by running:
        ```bash
        bash .sdd/scripts/phase.sh finish
        ```
    *   **Archiving**: Do NOT archive the folder manually. Request the user to merge. Only run the archiving command if the user explicitly instructs you to:
        ```bash
        bash .sdd/scripts/phase.sh archive <phase-name>
        ```

---

### Evidence and learning loop

Keep five questions answerable: What exists now? What outcome is intended? What gap was observed? What is the next authorized action? What did reality teach us? Classify failed validation as a problem, specification, interaction, execution, environment, timing, or evidence failure. Change intent through a recorded decision, never silent implementation drift.

Keep local, deployed-testing, authenticated-owner, production, and owner-acceptance claims separate. Store raw verification in `.sdd/evidence/`, assessments in `.sdd/reports/`, and exceptions in `.sdd/memory/governance/`.

## Phase 3: Communication

- **Be Concise**: Do not hallucinate files.
- **Be Explicit**: When referring to a file, use its full path.
- **Be Agentic**: Don't just ask "what do you want?". Propose the next logical step based on the SDD framework.

---

## Logging Example (Active Context)

When updating `memory/current-state/active-context.md`, keep it crisp and actionable:

```
Current Phase: Phase 002 - Feature X
Current Task: 2-3 Add schema validation
Branch: feature/task-2-3-schema-validation

Focus:
- Define validation rules
- Update tests

Recent Decisions:
- Use Zod for schema validation
```

---

## File Placement Rules

- **Specs live in `.sdd/specs/` only.** Do not place `requirements.md`, `design.md`, or `tasks.md` under `docs/`.
- **Project docs live in `docs/`**, and may link to specs instead of duplicating them.
- If unsure, run: `bash scripts/scan-strays.sh`.

## Optional visual workspace and graph closeout

Read `memory/rules/visual-workspace.md` when working with the visual interface. It defines service startup/verification, canonical CLI operations, automatic updates, closeout graph refresh and external Graphify boundaries. Existing-project upgrades preserve onboarding, so explicitly follow the additive rule after upgrading.
