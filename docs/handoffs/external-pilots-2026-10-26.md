# External desktop pilot findings — 2026-10-26

## Kimi screen-coverage review

- Prepared LuLu Kimi session was an existing completed project overview; composer was empty.
- Visible composer model: **Kimi K3.1 Pro**. No rate-limit or unavailable notice was visible. No model or plan was changed.
- No review prompt was submitted. The Kimi window was readable, but subsequent input actions returned `noWindowsAvailable`; the prompt did not appear in the composer and there was no visible acknowledgment. No output file was created.
- Intended bounded prompt (not sent): compare `docs/product/2026-10-25-product-direction.md` and `docs/product/2026-10-25-task-status.md` with `docs/design/screen-plan-2026-10-26.md` and `docs/design/component-review-2026-10-25.md`; identify missing screens/states/flow gaps, distinguish roadmap status and product requirements from optional design suggestions; save only `docs/design/reviews/2026-10-26-screen-coverage-kimi.md`; no shared UI/framework/spec edits, images, dependencies, tests, app runs, services/cloud, or commit/push/publish/deploy.

## OpenCode passkey retrospective

- Prepared session was **LuLu Hackathon - SDD**. Completed result shows **Nemotron 3 Ultra Free** and says all three artifacts were created in `.sdd/specs/backlog/phase-000-passkey-auth-bounded-sessions/`.
- Result is strong for a bounded retrospective draft: requirement/design/task artifacts are explicitly marked retrospective, unapproved, and without execution authority; source/evidence mapping, open uncertainties, unchecked tasks, SDD lifecycle compliance, and no-code/no-tests/no-commit/no-push/no-deploy boundaries are recorded. No phase execution or other follow-up task was started.
- One concrete accuracy correction identified against `src/services/vault/localVault.ts`: `requirements.md` REQ-000.5 says LocalVault instances are “cryptographically bound” to the owner **and session generation**. Owner identity is used for key lookup/AAD, while `generation` and `isUnlocked` are runtime authorization guards; the session generation itself is not cryptographically encoded. The same requirements document elsewhere correctly says the local vault key is not passkey-bound.
- A single focused revision prompt was prepared but not transmitted: reword only that REQ-000.5 assertion (and directly dependent wording within the existing Phase 000 draft, if any) to distinguish owner encryption/key lookup from runtime generation authorization; preserve scope, status, dates, evidence, and all other paths; run no code/tests/hooks/Graphify/app and do not commit/push/deploy.
- OpenCode composer remained empty after input attempts, so there was no visible acknowledgment and no revision was submitted. The retrospective draft remains ready for parent review with the terminology correction noted above.

## Changed files

- This handoff note only: `docs/handoffs/external-pilots-2026-10-26.md`.
- No external pilot output or revision was created.
