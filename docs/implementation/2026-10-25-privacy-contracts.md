# Privacy domain contracts — 25 October 2026

Status: local contracts implemented; not integrated with UI, storage, model services, or backend.

## Intent and boundaries

`src/domain/privacy/` defines independent TypeScript contracts for typed decision operations, a purpose-specific external-processing gate, paragraph concealment projections, record provenance, and scoped companion permissions. These modules have no network, database, authentication, encryption, or persistence code. They do not change the journal's stored content.

The typed LuLu operations describe product responsibilities, not Decisions API endpoint or output names. Operation contracts prohibit diagnoses and population counts. No model, endpoint, schema, data source, or integration is configured here. The external decision function returns only an authorization result and fails closed when the reviewed policy, permitted operation, purpose-specific review, or user authorization is absent.

## Privacy and evidence boundaries

- Remote decision inputs are typed as a separate `DisclosureCopy`; original private content is not accepted by the external gate. The prepared copy binds a snapshot ID, source record revision references, purpose, recipient, text hash, and a canonical snapshot hash over those values.
- Review approval binds the same text and snapshot hashes, purpose, recipient, and reviewed policy ID. The gate recomputes both hashes, checks the recipient and purpose against policy allow-lists, and requires the boolean `userAuthorised` to be exactly `true`. This is a policy precondition, not a claim that the text is safe or fully scrubbed.
- No regex or other detector is represented as complete PII protection. Local assessment can miss direct identifiers, contextual clues, language variants, or combinations that permit re-identification.
- Ordinary authored content, owner-authored evidence, attributed companion contributions, and starter content have distinct classification/provenance fields. Starter content is never evidence eligible, even if a caller labels it as evidence.
- Companion access is deny-by-default, scoped to explicit resource IDs, independently permissioned, expiring when configured, and revoked by the grant state. A companion statement is a separate attributed contribution value; it does not mutate an owner's source record.
- Concealed paragraph projections omit source text from both display and accessibility text. They default to concealed until the caller confirms an unlocked session; revealing another paragraph conceals the previous paragraph. The original paragraph values are unchanged. A caller still must ensure hidden text is not exposed through previews, search, notifications, logs, or other surfaces.
- Companion grants include both owner and companion identity. Access checks reject invalid or future grant times, invalid expiry/revocation timestamps, grants outside their validity interval, revoked grants, and owner or resource scope mismatches.

## Tests and evidence limits

`src/domain/privacy/privacy.test.ts` covers allowed and denied external-gate cases, immutable snapshot/review binding, strict authorization, starter/evidence separation, locked paragraph projection and paragraph-away concealment, companion owner/time/scope/revocation/expiry checks, and attributed companion contributions. Run the focused suite with:

```sh
node --experimental-strip-types --test src/domain/privacy/privacy.test.ts
```

Passing these unit tests verifies only the pure local contract logic. It does not verify cryptographic storage, detector accuracy, accessibility behavior in the application, UI concealment timing, Firestore rules, authentication, companion delivery, remote processing, or production security. Integration requires the vault and application owners to preserve these boundaries at every persistence, rendering, and network call site.
