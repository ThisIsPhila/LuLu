# Future OpenAI secret binding proposal

Status: proposal only. Do not apply before owner approval of provider disclosure/cost and an explicit Firebase guard-policy update.

## Existing function change

On the existing `api` function only, the literal options change would be:

```diff
-export const api = onRequest({region: 'africa-south1', memory: '256MiB', maxInstances: 2, minInstances: 0, concurrency: 10, timeoutSeconds: 30, invoker: 'public'}, async (request, response) => {
+export const api = onRequest({region: 'africa-south1', memory: '256MiB', maxInstances: 2, minInstances: 0, concurrency: 10, timeoutSeconds: 30, invoker: 'public', secrets: ['OPENAI_API_KEY']}, async (request, response) => {
```

The current provider lookups already accept a server-injected `OPENAI_API_KEY`. The deployed function needs the secret binding above before that key is available securely. Select `PRIVACY_PROVIDER=openai_decisions` for the fixed `gpt-6-luna` Decisions model. The optional `openai_responses` provider also requires an explicit `OPENAI_RESPONSES_MODEL`. The default remains disabled. Reuse the existing API function; the proposed Secret Manager secret is an additional resource requiring the owner's cost decision.

## Required guard-policy change

The guard must narrowly allow the `secrets` function option only when its value is exactly `['OPENAI_API_KEY']`. It must continue rejecting dynamic expressions, other secret names, or additional secret bindings. This requires a dedicated array-literal check in `scripts/firebase-guard.mjs`; simply adding `secrets` to the generic option allowlist is insufficient because the current guard intentionally rejects non-scalar values. The imports allowlist and all current region, memory, instance, concurrency, timeout, invoker, function-export, predeploy and project checks remain unchanged.

This proposal does not modify the guard, secret store, deployment environment or live Functions service.
