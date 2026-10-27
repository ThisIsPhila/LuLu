# Owner decision: Firebase free-allowance boundary

Date: 25 October 2026. Active until the owner explicitly changes it.

## Decision

Retain the existing Blaze plan, project `khora-lulu-2026`, Standard Firestore Native `(default)` in Johannesburg (`africa-south1`) and second-generation functions there. The owner uses Blaze for its included free allowances. A Blaze requirement is not itself a reason to downgrade, migrate, replace the passkey architecture or claim a bill has occurred.

Plan work to remain within included free allowances. Do not intentionally enable paid add-ons, charge-incurring usage, minimum idle capacity, larger capacity, additional resources or services without explaining the concrete expected cost/allowance implications and obtaining the owner's explicit decision. Existing approval of a feature is not permission to ignore this boundary. Do not change billing links/plans or create projects as a workaround.

## Required workflow

- Before any Firebase/associated Google Cloud resource mutation, read this decision and run `npm run guard:firebase` in this checkout. The check must pass; explain/fix a failure rather than bypassing hooks. A passing static check is not deployment approval or proof of free usage.
- Use the connected Firebase MCP/plugin first, as explicitly requested by the owner. Do not silently switch to direct Firebase CLI commands. Tool gaps must be stated plainly with a specific alternative proposed.
- Preserve existing hooks. Firebase configuration changes require review of service scope, region, runtime/resource limits, request/database usage, deployment artifact retention and separate add-on pricing. Reuse existing resources and make bounded deployments.
- Changes to the guard policy or an exception require an explicit owner decision, a recorded rationale and review alongside implementation. Never self-authorize an exception merely to make a failing hook pass.
- Keep actual billed charges, estimated charges, included allowances and unverified risk distinct. Never claim a zero bill without checking billing evidence. Budgets/alerts, request limits, zero minimum instances and maximum instance settings are not hard spending caps on Blaze.
- Prefer isolated local/emulator tests over repeated cloud deployments. Maintain zero minimum instances and the approved small runtime limits unless the owner approves otherwise.
- Failed artifact cleanup is an unresolved operational issue, not successful retention protection. Verify the live cleanup policy before marking it complete. Expiry fields on documents do not automatically delete them; managed TTL/backups/PITR and any new service require cost review before enabling.

## Scope and limits

Repository hooks and predeploy checks guard the reviewed local path. They cannot stop changes made in the cloud console, another checkout/tool, modified/bypassed hooks, or ongoing runtime traffic. The project remains on Blaze with potential overage billing. No infrastructure was changed as part of recording this decision.

This decision corrects the earlier proposed Spark downgrade; that downgrade was not confirmed or applied. Formal SDD progression remains paused; relevant security, verification and preservation duties still apply.

## Owner-approved bounded privacy demo activation

Date: 26 October 2026. The owner approved the main web app and existing Johannesburg API deployment to the configured LuLu domain, binding the project Secret Manager value `OPENAI_API_KEY` to the existing API only, selecting `PRIVACY_PROVIDER=openai_decisions` (`gpt-6-luna`), and enabling reviewed-text Decisions requests with a maximum of 20 requests per UTC day. Up to three synthetic verification calls are included within that 20-request allowance. The owner explicitly allowed Firebase/Google Cloud CLI use because the connected Firebase integration was unavailable.

The owner created the Secret Manager entry `OPENAI_API_KEY` in project `khora-lulu-2026`. The agent must verify secret metadata/version state without reading its payload. The value is injected only by the function's narrow Secret Manager binding; never copy it from a local environment variable or print it. Only deploy Hosting and the existing `api` function. Do not deploy the currently changed Firestore rules or Auth configuration under this approval. The 20-request/day quota is an operational request limit, not a hard monetary cap. OpenAI Decisions is billed according to its current token pricing; Google Cloud/Blaze remains subject to included allowances and overage billing. Record actual charges only after checking billing evidence.

The approved function-secret guard exception is limited to the literal binding `secrets: ['OPENAI_API_KEY']`; no other names or dynamic secret lists are permitted.

## Hosting boundary clarified by owner

Only the main application is deployed to Firebase Hosting. The interactive frame/demo, independent historical prototype and internal document/media review pages remain local development tools. Do not publish them or add hosted preview/demo routes without a new owner instruction. Database mock content is fictional starter content copied once into each signed-in account as ordinary private/unprotected editable entries; it is not a shared read-only journal or a replacement for protected mode. Preserve user changes and deletions across sign-in/device changes.
