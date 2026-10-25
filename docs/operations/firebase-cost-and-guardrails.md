# Firebase services and cost guardrails

The owner chose to keep the existing Blaze project `khora-lulu-2026`, with Standard Firestore and the second-generation `api` function in Johannesburg (`africa-south1`). Free/no-cost usage is permitted. This choice does not authorize changing the billing plan, migrating projects, or adding paid-only features.

## What can incur cost

Blaze is pay-as-you-go: eligible no-cost usage still applies, and usage beyond a product's allowance can be billed. The Firebase pricing page has the current allowances and rates. Hosting traffic and stored data, Firestore operations and stored data, function compute and network usage, and retained build artifacts are among the service usage to monitor. Do not treat the free allowance as a spend cap.

The function has `minInstances: 0`, `maxInstances: 2`, `memory: 256MiB`, a 30-second timeout and concurrency 10. These bound some function capacity and resource settings. They do not bound total requests, database activity, Hosting traffic, or charges. Firebase budget alerts notify; they do not stop usage. A hard spending guarantee cannot be enforced by this repository's local checks. The guard does not change billing or create spend caps.

The Firebase backend report records that deployment artifact cleanup-policy setup failed and remains outstanding. Until cleanup is verified, deployment artifacts may be retained and can add storage usage. See [backend implementation status](../implementation/backend-2026-10-25.md).

## Local guard and review path

`npm run guard:firebase` checks the checked-in Firebase project alias and service keys, Hosting site, auth providers, configured Firestore rule/index files, deployment hooks, function codebase/runtime, exported trigger types, Firebase Admin service imports and function region/resource options. The pre-commit gate reads the staged versions of the project alias, Firebase config, guard policy/exceptions and function source so unstaged edits cannot mask what is being committed. Firebase predeploy hooks for Hosting, Firestore, Functions and Auth check the current working files; Functions keep their existing TypeScript build hook after the guard. Function options are parsed as TypeScript and unknown keys or dynamic values fail closed.

The guard compares local configuration with the reviewed allowlist in `.sdd/memory/governance/firebase-guard-policy.json`. It can compare the Firebase CLI's active project during deploy, but it cannot inspect live console settings. Firestore's database location is provisioned in the Firebase project and is not represented in this `firebase.json`; verify its live location in the Firebase console before changing or recreating it. This check makes no claim that cloud state was queried.

If a real requirement needs a policy change, the project owner must first approve that exact change. Then update the allowlist and record the owner's decision in `.sdd/memory/governance/` with rationale and evidence. If a narrow temporary exception is needed, add an exact finding/value entry to `.sdd/memory/governance/firebase-guard-exceptions.json` only after owner review; include `reviewedBy: "project-owner"`, `reviewedAt`, `reviewReference`, a rationale and an expiry. The guard reports every accepted exception visibly, rejects expired or stale entries, and does not treat arbitrary text as approval. The file itself cannot prove who authored it.

This is a local review gate, not a security boundary: repository hooks can be bypassed, API/console changes do not run them, and static source checks can miss dynamic changes. Review changes to the allowlist, exception file, scripts and hooks carefully. No hook can guarantee zero charges on Blaze.

## Verification limits

Positive and negative local fixtures are in `tests/firebase-guard.test.mjs`. Running those checks demonstrates the guard's behavior against the supplied local inputs only; it does not deploy resources, inspect billing, verify cloud cleanup, or establish a hard cost limit.

References: [Firebase pricing plans](https://firebase.google.com/pricing), [Firebase CLI predeploy hooks](https://firebase.google.com/docs/cli#predeploy_and_postdeploy_hooks), [Firebase budget alerts and spend caps](https://firebase.google.com/docs/projects/billing/budget-alerts).

## Main-app-only publication

Owner clarification: only `dist/app` is hosted. Interactive previews, old demo snapshots, and the internal review library stay local. `build:hosted` builds the main app and verifies that development-only folders are absent; the Firebase guard also rejects another public directory or development-only output before deployment. The earlier hosted preview was a mistaken interpretation and is removed in the corrected release.
