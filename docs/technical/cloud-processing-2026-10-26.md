# Cloud privacy understanding boundary

Status: implemented locally, disabled by default; no API secret or cloud deployment configured.

## What this adds

The existing authenticated Firebase Functions API has two routes:

| Route | Request | Authority | Result |
| --- | --- | --- | --- |
| `POST /api/privacy/capability` | `{}` | Signed-in LuLu session | Provider name, enabled state, accepted input type and 4,000-character limit |
| `POST /api/privacy/understand` | `{text, revision, sha256, purpose, reviewed:true}` | Signed-in session with active passkey/private authority | Advisory structured decision from the configured provider |

The Firebase Bearer ID token is the existing session token. The understanding request checks both the passkey claim and live private-session expiry before inference, then checks private authority again before returning a result. The API rejects unknown fields, including `originalText` or `raw`, requires a lowercase SHA-256 digest of the exact UTF-8 reviewed text, and bounds text, revision and purpose sizes. Only that reviewed text and the declared purpose are sent to a provider. Text, hashes, revisions, purposes, prompts, tokens and provider replies are not written to Firestore or logged. API diagnostics remain fixed route/stage metadata.

The provider result contains `provider`, `model`, `decision` (`low`, `review`, `high`, or `unknown`), the exact `{revision,sha256,purpose}` binding, and `advisory:true`. Decisions responses also contain `confidence` and a fixed app-authored `explanation`; it is not model rationale. A provider refusal maps to `unknown` with `confidence:null` and fixed text explaining the refusal. Responses results retain a separately validated bounded `rationale`. Neither result is an automatic allow/block decision, verified anonymisation, or a replacement for human review.

## Provider choice and configuration

The selected provider is OpenAI Decisions. The official [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) and [create decision reference](https://developers.openai.com/api/reference/resources/decisions/methods/create) document `POST /v1/decisions`, the typed `choice` question/answer contract, and `gpt-6-luna` as the only supported model. The request asks for one choice among `low`, `review`, `high`, and `unknown`, then validates the returned question name, type, choice, confidence, and four-value probability distribution. A refusal becomes `unknown`. The Decisions API returns a typed choice rather than prose; any explanatory sentence in the app is fixed local copy and is clearly not model reasoning.

An optional Responses adapter remains for future use as `openai_responses`, using a selected compatible model and structured outputs. It is not the default or current selected provider. Both adapters accept only the exact reviewed pseudonymised text and stated purpose.

Default configuration is disabled. In local emulator/dev environments, the current code can use an explicitly configured `PRIVACY_PROVIDER` and `OPENAI_API_KEY`; the key must be injected through an uncommitted local environment/secret. On deployed Functions, the current source has no Secret Manager binding, so it cannot make live provider calls until the future binding proposal is approved and applied. Enable only after owner review of provider, model, data sharing and likely usage cost, plus an explicit guard-policy update:

```text
PRIVACY_PROVIDER=openai_decisions
OPENAI_API_KEY=<server-only secret>
```

Decisions fixes the model to `gpt-6-luna`. To choose the optional Responses adapter instead, set `PRIVACY_PROVIDER=openai_responses` and `OPENAI_RESPONSES_MODEL` to an explicitly selected compatible model.

`functions/privacy-secret-binding-proposal.md` is a proposal only. It shows the exact `secrets: ['OPENAI_API_KEY']` binding and provider wiring for the existing function, plus the narrowly scoped Firebase guard allowance that would be needed. It is not applied. Do not apply it until the owner approves the external disclosure/cost and secret binding and the guard policy update is reviewed. Never place a live key in this file, `.env` committed to version control, client code, or request logs. Missing key, unknown provider names and invalid configuration all report `provider: disabled`. This checkout has not created or mutated any secret. A future opt-in sequence is: approve the provider/data-sharing/cost boundary; review and authorize the bounded guard-policy change; create the secret through the approved connected Firebase workflow; apply the secret binding proposal; set provider/model deployment environment; then request deployment authorization. No deployment is authorized by this implementation.

The Decisions request contains one developer instruction, one user message containing the declared purpose and reviewed text, and one named choice question. No conversation state or tools are used. The user's text is sent only after client review and local pseudonymisation. OpenAI Decisions is a cloud transfer; enabling it needs a deliberate data-sharing/cost decision. The request's purpose is sent along with the reviewed text. The official guide currently lists `gpt-6-luna` input pricing at $0.10 per million uncached tokens and says output tokens are not charged; this is pricing evidence checked on 26 October 2026, not a usage forecast or spending cap.

## Capacity, failures and limitations

The API reuses the existing second-generation function in `africa-south1`, 256 MiB, maximum two instances, zero minimum instances, concurrency 10 and 30-second timeout. The outer request parser caps JSON at 24 KB; this route caps reviewed text at 4,000 characters / 12 KB UTF-8. Provider requests time out after eight seconds. When a provider is enabled, a Firestore transaction reserves one of at most 20 calls per UTC day in the existing `_rateLimits` collection using the single `privacy-demo-daily` document. It stores only the UTC day, count and update timestamp; no text, purpose or review hash. Failed upstream requests consume their reservation. A separate process-local ceiling allows five inference requests per session per fifteen minutes as a burst safeguard. The daily quota bounds this demo's request volume, but it is not a monetary spending cap; the free-allowance/cost boundary still applies.

Authentication failure, stale private authority, invalid contract/hash, rate limiting, absent provider, upstream failure and malformed model output fail closed. No raw-text fallback exists. In particular, the endpoint cannot independently prove that the caller truly pseudonymised the input; it validates the explicit review attestation and exact hash/revision binding. A model may miss indirect identifiers or return an incorrect risk decision. Do not use this result to claim anonymity or make high-impact decisions.

## Local verification

Tests use a fake HTTP transport and synthetic text; no paid/live provider request or secret is used. This is local source/build evidence only. Deployment, secret creation, owner/provider choice and authenticated production acceptance remain pending.
