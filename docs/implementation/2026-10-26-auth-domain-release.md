# Authentication and development entry — 26 October 2026

Main application: https://lulu.thisisphila.co.za/  
Firebase project: `khora-lulu-2026` (existing project and billing plan retained).

## Live authentication release

- Firebase Hosting reports the custom domain active and ownership verified; HTTPS serves LuLu.
- Firebase Authentication authorizes the custom domain. Email/password and Google providers are enabled.
- The Johannesburg API accepts the custom-domain origin; live CORS preflight returned 204 with the correct origin.
- Live synthetic email/password account creation, returning sign-in and the LuLu session exchange passed.
- Live synthetic WebAuthn registration, returning sign-in, application session and private step-up passed on the custom domain.
- Both temporary test accounts and all seven scoped test documents were removed and verified absent. No real user records were used.
- Google interactive sign-in exposed `redirect_uri_mismatch`. Product Implementation on Luna High added and read back the missing `https://khora-lulu-2026.web.app/__/auth/handler` callback on the existing OAuth client. Interactive Google/native acceptance remains open because the in-app browser could not connect to accounts.google.com.
- Function container images now have a verified 14-day cleanup policy in `africa-south1`. This limits accumulation; it is not a spending cap.

## Entry behavior

Login is the default entry. **Onboarding** opens the fourteen-screen flow explicitly. Local Vite development on loopback addresses has an **Open development app** button with a separate browser-local fictional journal. The development identity, storage adapter and entry callback are removed from production builds. Server authorization and Firebase rules are unchanged.

Local private UI uses its own local development identity and encrypted stores, with a local timed unlock for development. It cannot access a real account’s records. This is a development convenience, not evidence of production authentication.

## Verification boundary

The main app build and package exclusion check passed. Browser review confirmed the local entry button opens the main app with three ordinary fictional records. The login-first main-app release is published, and its Onboarding button opens the fourteen-screen flow explicitly. Local browser entry and production login/optional-onboarding navigation were verified. The production JavaScript excludes the development identity, local journal adapter and bypass button. Full owner-device acceptance of the broader journal/private/mobile experience remains open.
