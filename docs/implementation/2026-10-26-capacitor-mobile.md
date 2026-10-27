# Capacitor mobile implementation (2026-10-26)

> Later evidence on 26 October supersedes the installation limitations below: an Android debug build completed, and a signed build installed and launched on the physical iPhone. The owner also confirmed the iPhone passkey prompt returned to the journal after the hosted passkey repair. These checks do not establish account-owned journal create/edit/restart persistence or a releasable mobile package. New email/password and Google/provider changes remain separate; see the current progress assessment and native-auth reports.

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

The complete authenticated mobile journey (sign in, account-owned Firestore journal load, create/edit, restart, and persistence check) has not been demonstrated. The iPhone passkey prompt and return to the app were confirmed after the hosted bridge repair; ordinary journal persistence still needs device acceptance. No public mobile release package is available.

Hosted authentication uses the existing LuLu web origin and native passkey bridge. Keep WebAuthn on the trusted hosted origin; do not add Capacitor origins to the WebAuthn allowlist. Treat passkey return, journal data access, and record persistence as separate acceptance checks.

Native identifiers are `org.khora.lulu` for both shells and `org.khora.lulu.auth` for the iOS callback URL scheme; Android handles `lulu://auth-callback`. iOS distribution needs the owner's Apple Developer team, bundle-ID registration/capabilities, and signing profile. Android release distribution needs the owner's signing keystore, alias, and passwords configured outside the repository. No signing credentials or hosted changes were made.

Android native compilation is verified, but no physical Android journal/authentication journey is recorded. Native WebView journal, private-storage isolation and camera/audio capture/recovery still need real-device verification.

## Security review note

The root production dependency audit found three moderate advisories in transitive Capacitor CLI `xcode`/`uuid` dependencies and no high-severity finding; npm's proposed fix requires downgrading Capacitor CLI, so no forced downgrade was applied. The Functions production dependency audit reported zero vulnerabilities.
