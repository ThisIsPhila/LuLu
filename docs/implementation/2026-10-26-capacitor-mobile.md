# Capacitor mobile implementation (2026-10-26)

## Scope delivered in source

LuLu now has Capacitor 8 iOS and Android shells around the existing React/Vite app. The shell loads the local `dist/app` bundle; no production `server.url` is configured. `build:app` packages only the application, while `native:sync`, `native:ios`, and `native:android` provide repeatable native workflows. The package verifier rejects demo, review, documentation, and fixture content from the app bundle. Web mode retains its offline-shell registration; native mode skips service-worker registration.

Platform adapters cover runtime detection, app lifecycle, external system browser, deep links (including launch URLs), passkey exchange, camera, and audio. Native background and Android back actions call the existing private-session exit path. Native passkey flows use a LuLu hosted bridge and request-bound short-lived exchange; the hosted origin remains the WebAuthn RP origin. Exchange responses are redeemed inside the app and callback URLs contain only the exchange identity, state, operation, and result status.

The native key adapter uses protected platform storage for newly created key material while retaining pre-existing IndexedDB keys and record semantics. Encrypted private records and drafts continue to live in IndexedDB; this does not make the records themselves Keychain/Keystore stored. Camera and audio adapters are connected to the existing capture/vault paths.

## Build evidence

- `npm run build:app` completed and package verification passed. Vite reported the existing large-chunk advisory.
- `npm run native:sync` completed and synced the iOS and Android Capacitor projects and plugins.
- `npm --prefix functions run build` completed; `npm --prefix functions test` passed all 12 tests, including native-exchange policy checks.
- The focused private media, durable capture, private draft/autosave, and offline-shell tests passed (65 tests).
- Android debug APK build completed using JDK 21 and the project Gradle wrapper (`BUILD SUCCESSFUL`).
- Initial iOS generic device and simulator builds passed but startup rendered blank. That startup defect was subsequently repaired by explicit native Firebase Auth initialization and iOS localStorage auth persistence. The updated app rendered onboarding on the physical iPhone 13 Pro Max twice, including a cold relaunch, and on the iPhone 18 Pro simulator. See `.sdd/reports/ios-startup/2026-10-26-fix.md` and `.sdd/evidence/ios-startup/`. Authenticated journal persistence remains pending.

## Runtime and release gates

The ordinary authenticated mobile journey (sign in, account-owned Firestore journal load, create/edit, restart, and persistence check) has not been demonstrated. The app build contains the client bridge, but its backend exchange routes and hosted bridge page are local changes and are not live. No deployment was performed.

To enable hosted authentication, build the app with `npm run build:app`, publish `dist/app` to the existing Firebase Hosting site `khora-lulu-2026` (its canonical bridge URL is `https://khora-lulu-2026.web.app/native-auth-bridge`), and deploy the updated `functions` codebase `lulu` to the same Firebase project. Keep WebAuthn on the existing trusted hosted origin; do not add Capacitor origins to the WebAuthn allowlist. Validate the bridge and deployed exchange routes with a test account before treating the mobile sign-in journey as complete.

Native identifiers are `org.khora.lulu` for both shells and `org.khora.lulu.auth` for the iOS callback URL scheme; Android handles `lulu://auth-callback`. iOS distribution needs the owner's Apple Developer team, bundle-ID registration/capabilities, and signing profile. Android release distribution needs the owner's signing keystore, alias, and passwords configured outside the repository. No signing credentials or hosted changes were made.

Android native compilation is verified, but the available `Medium_Phone_API_36.0` AVD is not runnable because its Android system image is incomplete (no `system.img`), and no physical Android device was attached. Native WebView journal and private-storage isolation therefore still need device/emulator verification. Camera/audio are source-integrated but also need device-level capture/recovery verification.

## Security review note

The root production dependency audit found three moderate advisories in transitive Capacitor CLI `xcode`/`uuid` dependencies and no high-severity finding; npm's proposed fix requires downgrading Capacitor CLI, so no forced downgrade was applied. The Functions production dependency audit reported zero vulnerabilities.
