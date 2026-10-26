# Native email and Google sign-in — 26 October 2026

## Implemented locally

The existing onboarding now offers passkey, email/password, and Google sign-in. Email/password uses Firebase Authentication directly and exchanges the verified Firebase identity for the same short-lived LuLu API session used by the journal. Google sign-in on native opens the trusted LuLu HTTPS bridge, uses Firebase redirect auth there, and returns only through the bound one-time exchange; no Firebase token appears in the app callback URL. Web keeps its Firebase email/password and Google popup flows. The hosted origin remains the WebAuthn RP origin, and private writing still requires passkey verification.

The local Firebase auth config enables email/password and keeps anonymous auth disabled. An owner-reviewed, expiring Firebase guard exception records that intentional provider change. Google OAuth metadata is not set in source because Firebase requires the project's chosen support email; enable Google in the existing Firebase Authentication settings with that address before release.

## Verification

- `npm run native:sync` built the app-only bundle, verified 24 app files, and synced iOS and Android.
- `npm --prefix functions run build` passed.
- `npm --prefix functions test` passed all 12 tests, including the Google exchange operation binding.
- `npm run guard:firebase` passed with the narrow email/password exception.
- Android debug build succeeded with JDK 21. The refreshed APK installed successfully on the connected Android device and launch command succeeded.
- Xcode built and signed the iOS debug app for the connected iPhone using the Apple team available on this Mac. The first install was rejected because the free developer profile already had three apps installed. After the owner removed multica, installation and launch both succeeded.

## Release and account limits

No Firebase Hosting, Functions, or Auth configuration was deployed. For live sign-in, configure Email/Password and Google in Firebase Authentication; choose the existing project's support email for Google's OAuth consent, then deploy the reviewed hosted bridge and `lulu` Functions changes to `khora-lulu-2026`. Google is handled on the trusted hosted origin, so no Android SHA fingerprint or iOS Google URL scheme is needed for this relay.

`org.khora.lulu` is the native app identifier in `capacitor.config.ts`; it is not an organization name or a deployment prerequisite. Xcode provisioned it successfully. The free-profile slot was released by the owner, and LuLu is now installed on the iPhone.

## Acceptance still pending

Live provider sign-in and account-owned Firestore load/write/restart on both devices remain unverified. Private unlock continues to require a passkey even when ordinary account access uses email or Google. Users who already have a passkey-only Firebase UID may need explicit account linking before another provider can address that same journal; this change does not merge identities by matching email.
