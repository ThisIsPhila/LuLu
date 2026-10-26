# Native authentication repair — 26 October 2026

## What was failing

The installed native UI used browser feature detection against the Capacitor WebView and disabled passkey actions when that WebView lacked WebAuthn. LuLu's native passkey design instead opens the trusted HTTPS bridge in the system browser. The WebAuthn ceremony stays in that bridge and follows Confessions' existing behavior.

The native Google relay runs on `khora-lulu-2026.web.app`, while its Firebase configuration pointed the redirect helper at `khora-lulu-2026.firebaseapp.com`. Firebase recommends using the hosting origin for redirect authentication on a `web.app` site to avoid Safari cross-origin storage restrictions. The local Firebase configuration now uses that same origin.

LuLu's native flow matches Confessions' Capacitor → system browser → hosted WebAuthn → app callback pattern while retaining LuLu's one-time exchange and stronger request/state/proof/operation binding. Email and Google use Firebase Authentication and exchange the verified identity for a LuLu Functions session.

## Verification and limits

The app bundle, Capacitor sync, Android debug build, signed iOS device build, Functions build, and Firebase guard passed. The rebuilt app was installed on both connected devices and launch commands succeeded. iOS rendered the onboarding journey; Android's WebView rendered its welcome screen, but the device was asleep at screenshot time and logs showed it had no internet connection. This is local build evidence only. No provider settings, hosted assets, or Functions were deployed, and no account creation or sign-in was performed.

The repository's latest recorded cloud-state evidence says the Auth provider configuration, hosted relay, and native exchange routes are local only. That explains why these methods can fail on the installed app: Email/Password may be disabled in deployed Firebase Auth, and native passkey/Google requests depend on the undeployed exchange routes and hosted bridge. Release the local Firebase Auth provider configuration (Email/Password and Google), the existing `lulu` Functions codebase, and the main-app Hosting site to project `khora-lulu-2026`. The Google redirect helper is `https://khora-lulu-2026.web.app/__/auth/handler`; Firebase documents that the default Hosting domain is authorized automatically.

After an authorized release, rebuild and install the native apps, then verify account creation/sign-in, Firestore journal read/write, and persistence after restart on both devices. Private writing remains passkey-gated.
