# Proposed Resend activation

Prepared: 27 October 2026.

Scope: Existing Johannesburg `lulu:api` only, no new function or database. Bind existing Secret Manager `RESEND_API_KEY` alongside the existing `OPENAI_API_KEY`, and set `ACCOUNT_ALERTS_START_MS` to the agreed deployment cutoff. Change the guard policy `functionSecretNames` from `["OPENAI_API_KEY"]` to `["OPENAI_API_KEY", "RESEND_API_KEY"]`; retain literal-array verification and all other limits. This requires the owner decision under `.sdd/memory/governance/2026-10-25-firebase-cost-boundary.md` before the policy or live resource changes.

The existing backend now records new accounts when their first app session is issued. It queues one branded email to lulu@thisisphila.co.za; a failed attempt retries on later sign-ins and does not prevent sign-in. A Firestore emulator test covers retry and duplicate avoidance. This is not an independent account-create event: accounts that never complete an app session are not detected. Failed notifications cannot retry without later sign-ins. No usage alert, billing integration, delivery guarantee or scheduled worker is implemented.

The current `functions/src/index.ts` contains other prepared functionality, including cloud privacy/chat; deploying the whole existing function publishes that code as well. Account notifications use Firestore reads/writes, Secret Manager and Resend usage. No hard spending cap exists. The Resend account's actual plan and limits have not been verified.
