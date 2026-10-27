# Native passkey handoff repair — 2026-10-26

## Reported failure and comparison

Owner reported no passkey prompt on iPhone. Compared LuLu's native authentication, browser wrapper, hosted bridge and callback with Confessions' `src/lib/passkeys.ts`, `native-browser.ts` and `src/app/auth-bridge/page.tsx`.

Before the repair, a synthetic native login exchange could be created (HTTP 200), but the hosted `/native/exchange/options` request returned HTTP 500. SimpleWebAuthn authentication options include undefined `allowCredentials` and `extensions` fields. LuLu persisted the entire object as `challengeOptions`; Firestore rejects undefined values. Confessions does not cache that options object this way. This failed before WebAuthn could open a prompt.

A separate confirmed blocker followed successful authentication: native `/session` requests returned HTTP 403, `This origin is not allowed.` The origin gate omitted session restoration/completion, private lock and logout routes.

## Changes

- Persist the JSON representation of generated options, matching the browser payload and omitting undefined fields.
- Permit only the explicitly listed native handoff/session routes from `capacitor://localhost` and `https://localhost`. Browser WebAuthn ceremonies remain restricted to the existing trusted hosted origins.
- Keep hosted errors visible with retry and return controls. Callback URLs retain only the existing request binding and status, never tokens or private content.
- Offer an explicit switch between the existing app bridge hostname and public website hostname for passkeys enrolled on the other hostname. Reuse a challenge only on its original origin; switching generates a fresh origin-bound challenge and supersedes the previous ID.
- Add `scripts/verify-native-auth-live.mjs` for repeatable, guarded live checks. It creates only transient login challenge/exchange records, cancels each exchange in `finally`, and never creates an account or reads a personal passkey.

## Evidence

- Functions TypeScript build passed; all 15 backend tests passed, including real generated option serialization and native origin security regressions.
- Main app/hosted build and mobile package checks passed (36 files; development fixture paths excluded).
- Existing `lulu:api` in `africa-south1` successfully deployed to `khora-lulu-2026`. First attempt failed on a Google API connection before upload; retry succeeded.
- Live script passed for both native origins: hosted options HTTP 200, expected RP ID on each hostname, same-origin challenge reuse, fresh challenge on origin change, superseded completion HTTP 409, unverified redemption HTTP 409, cancellation HTTP 200, native unauthenticated session HTTP 401 with matching CORS header, native WebAuthn and untrusted origins HTTP 403.
- Hosting release completed successfully. A live fetch of `/native-auth-bridge` resolved `/assets/NativeAuthBridge-V8p51wF9.js` and confirmed the released retry, return and alternative trusted-host controls.

## Acceptance limits

No personal passkey was exercised by the automated checks. After deployment, the owner retried on iPhone and confirmed the passkey prompt and return to the journal worked: “Done, it worked.” This is owner-reported iPhone acceptance; Android passkey acceptance and journal edit/restart persistence were not established by this check. Existing native installs request the hosted bridge at runtime; these server/bridge changes required no native binary rebuild.
