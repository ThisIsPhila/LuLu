# Contributing to LuLu

This workflow is shared by human collaborators, Codex, Claude Code and other coding agents. No specific model or subscription is required. Repository files and reviewed changes provide shared context; private chat memory does not synchronise between agents.

## First checkout

After accepting the private GitHub invitation:

```sh
git clone https://github.com/ThisIsPhila/LuLu.git
cd LuLu
```

Read AGENTS.md, then the current product vision at `.sdd/memory/product-vision.md` and the linked project/SDD onboarding files. The current vision supersedes incompatible architecture/handoff framing; preserve engineering freedom for the demo instead of imposing old proposed workflows. Ask your agent to explain the current product, established decisions, open questions and its proposed contribution before changing anything. The file `docs/project-explainer.md` can also be shared on its own as a dated orientation; a fresh checkout is the current source.

Core SDD scripts, templates and skills are already tracked. Do not rerun setup on an existing checkout just to start contributing. Recreate missing empty directories if necessary, then install the existing local commit hook and validate:

```sh
mkdir -p .sdd/specs/active .sdd/specs/archive .sdd/specs/backlog
bash .sdd/scripts/hooks.sh status
bash .sdd/scripts/hooks.sh install
bash .sdd/scripts/doctor.sh
bash .sdd/scripts/skills.sh validate
```

Read hooks.sh output: preserve and chain an existing hook rather than replacing it. Node is needed for validation/graph tooling; use the framework's documented prerequisites. No LuLu application dependency installation or application start command exists yet.

The optional visual workspace is installed separately on each machine; follow README.md. It is not required to edit or review Markdown. Never share launch tokens, API keys, .env files, private incident material or real victim data in commits, PRs or agent transcripts.

## Before each session

1. Inspect `git status --short`, the current branch and recent commits. Preserve uncommitted work.
2. Fetch the remote when access is available. Update a clean main checkout with `git pull --ff-only`; do not reset or force-sync a dirty checkout. On a work branch, inspect changes from origin/main and integrate deliberately. If offline, state the last known revision and avoid claiming to be current.
3. Reread AGENTS.md, current context, project overview, progress, technical decisions, and the relevant active phase. Re-read changed files after a handoff or context reset.
4. Agree a task, owner, branch and file boundaries with the other contributor. Use a GitHub issue/task comment if available, or the human team channel. An agent does not get permission to message people or mutate external systems merely by reading this guide.
5. Use separate checkouts/worktrees for concurrent implementation. Coordinate edits to shared contracts, approval records, lockfiles, project-wide memory and the same spec. A local task claim is advisory; it cannot lock another person's checkout.

## Specifications and implementation

Follow `.sdd/AGENT_ONBOARDING.md` and `.sdd/constitution.md`; this guide does not grant approvals or override them. Requirements, design and tasks progress sequentially with explicit owner approval. Use the phase CLI for creation, approvals, start, task tracking and finish. Never mark an artifact approved because another agent drafted it or because its checkbox is checked.

The owner has not authorised the first specification yet. Historical handoffs, proposed directories and brainstorming remain context. Do not scaffold a product or select a stack from them.

For approved implementation, coordinate who owns the phase lifecycle. `phase.sh start` manages the phase branch; do not create conflicting lifecycle state from several agents. Use contributor work branches for scoped changes and integrate through review. Check the current CLI help before commands; never bypass gates to make a branch naming preference work.

## Review and GitHub

- Work on a descriptive branch and submit a pull request to main when authorised to publish the change. Do not push directly to main, force-push a collaborator's branch, merge or deploy without the appropriate human authority.
- Include the relevant requirement/task IDs for implementation, what changed, checks actually run and unresolved limits. Documentation-only onboarding work need not pretend to implement a product requirement.
- Request the other contributor's review for shared contracts and privacy/security changes. A PR or CI pass is not owner acceptance.
- Keep active specs and shared project context tracked in this private repository so other agents can read them. Do not copy the public framework repository's ignore rules for in-flight specs into LuLu.
- Before pushing, inspect the staged diff and ensure secrets, runtime state and proprietary material outside the authorised collaboration scope are excluded.
- Branch protection and required reviewers are not configured by this document; these are collaboration conventions until configured separately.

## Handoff at every stopping point

Update the task and relevant SDD evidence, then record a concise handoff in `.sdd/memory/current-state/handoffs/<contributor>-<topic>.md`. Separate handoff files reduce simultaneous edits to one global context file. Link consequential decisions from the shared context/decision record when integrated.

A handoff must state: author/agent, date, branch and assessed commit; scope and files changed; implementation and verification results separately; pending approvals, blockers and next action. Include exact test commands and failures. Do not claim another person's unmerged branch exists locally or report deployed behaviour from local tests.

Keep a single integration owner for the summary in active-context.md and progress-tracker.md at any given time. After reviewed integration, contributors refresh their checkouts and reread the updated context. This is how agents remain aligned across different tools and machines.

## Suggested first agent prompt

> Read AGENTS.md and follow its onboarding links. Read docs/project-explainer.md and CONTRIBUTING.md. Inspect Git status, recent commits, current SDD context and active phases. Explain what exists, what remains proposed, and the next authorised work. Do not infer approvals from historical documents. Coordinate a scoped branch/task before edits; preserve unrelated work and leave an evidence-based handoff.
