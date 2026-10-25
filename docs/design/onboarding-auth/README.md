# LuLu onboarding and passkey direction — 24 October 2026

Status: design proposal and local visual prototype; not an implemented authentication system or approved backend. [Preview](preview.html). Owner chose **sign in before entering LuLu** on 24 October.

## Journey and screens

1. **First visit / Welcome.** A calm editorial cover with the real LuLu wordmark, one sentence about writing, and two clear choices: “Begin with LuLu” and “I already have an account.” No privacy or encryption claim before those features exist.
2. **Orientation.** Two short, skippable panels: “A place for your words” (Journal and Stories), then “Your pace, your choice” (ordinary writing and deliberate protected writing). Progress and Back/Skip must work by keyboard and touch. Avoid a long questionnaire or sensitive disclosure during setup.
3. **Create access.** “Create your passkey” is primary. Explain that the browser/device handles Face ID, Touch ID, a device PIN, or a security key; LuLu never receives the biometric. An optional email for recovery can be collected only when the recovery path actually exists and is disclosed. Do not invent an in-app four-digit PIN as a passkey fallback.
4. **Returning sign-in.** “Continue with passkey” is primary, with a quiet “Need help signing in?” route. Prefer discoverable credentials so the user does not have to type an identifier first. Allow another device/security key through the browser's native passkey chooser.
5. **States.** Loading; unsupported browser/context; user cancellation (return to ready without error alarm); credential absent; expired challenge; verification failure; network outage; account recovery; success. Never switch to the app on a timer or a client-side boolean. Only a verified server session may enter.
6. **Inside LuLu.** App sign-in and protected-writing step-up are distinct. The latter requires recent server-verified user presence and separate authorization. Signing in does not decrypt or unlock protected mappings. A clearly reachable sign-out closes the app session and protected state.

The [local preview](preview.html) shows Welcome, two first-run orientation steps, create-access and returning sign-in in an interactive mobile canvas. Its controls are visual navigation only; they do not authenticate.

## Visual fit

Use the current transparent brand logo from `public/media/brand/`, the brand kit's paper `#F7F2E9`, sand `#D9CABC`, stone `#B6AEA1`, sage `#AAB09B`, and charcoal `#242421`, with real material imagery and editorial serif headlines. The revised preview uses [a generated journal still life](journal-still-life.jpg) and [a generated writing image](journal-writing.jpg) as original, text-free project assets informed by the brand sheets. The photography is a design asset, not proof of functionality. Keep the system passkey prompt native; the LuLu page sets context before the prompt and handles the result afterward. Safe-area spacing keeps controls clear of the camera and home indicator. Use reduced-motion preferences for transitions.

21st.dev options inspected in the owner's logged-in account: [Onboarding Dialog](https://21st.dev/@patrick-xin/components/onboarding-dialog) is MIT but adds Motion and Embla for a two-panel journey; [Minimal Welcome Onboarding](https://21st.dev/@ziegfiroyt/components/onboarding3) is MIT but depends on Next.js; [Onboarding / Welcome Screen](https://21st.dev/@ravikatiyar162/components/onboarding-welcome-screen) has an unknown license and Framer Motion dependency; [Passkey Sign In](https://21st.dev/@felipemenezes098/components/sign-in-4) is AGPL-3.0 and includes a password fallback. The [Phone Mockups 1](https://21st.dev/@solaceui/components/phone-mockups-1) component is MIT but auto-rotates screenshots, so it does not fit an interactive onboarding preview. No 21st component was installed or copied. The preview uses the project's existing `lucide-react` icons and a native progress control, and omits the custom-drawn phone bezel, passkey artwork, and key glyph. Owner-shared elements can be assessed against this flow before selection.

## Backend contract for implementation

Firebase Hosting already serves the prototype; it does not provide identity or a journal database. A viable route is server-verified WebAuthn with an authentication service, then a Firebase custom token for Firebase Auth and owner-scoped Firestore rules. This is a proposed route, not a selected or provisioned service. The server must own challenges and check origin, relying-party ID, user verification, credential signature, and challenge expiry. The browser must never be trusted to assert success. Store passkey **public** credential data, never private keys or biometrics. Use HTTPS on the final origin; localhost is permitted for development.

Proposed operations:

| Operation | Server responsibility | UI outcome |
| --- | --- | --- |
| `POST /auth/register/options` | Create short-lived challenge and registration options | Native create-passkey prompt |
| `POST /auth/register/verify` | Verify response, create user and credential atomically, issue app session | Enter LuLu |
| `POST /auth/login/options` | Create short-lived discoverable-credential challenge | Native passkey chooser |
| `POST /auth/login/verify` | Verify response, update counter, issue app session | Enter LuLu |
| `POST /auth/step-up/options` and `/verify` | Require active session and fresh user verification | Allow protected access only for a bounded session |
| `POST /auth/logout` | Revoke server session/token as applicable | Return to sign-in |
| Recovery and credential management | Prove account ownership; add/revoke credentials; preserve audit trail | Explain recovery and lost-device outcomes |

One user-scoped data model for review:

| Collection / record | Fields | Access rule |
| --- | --- | --- |
| `users/{uid}` | Created date, display preferences, recovery policy/version | Owner only |
| `users/{uid}/entries/{entryId}` | Kind, title, ordinary body, timestamps, tags, schema version | Owner only; validate shape and size |
| `users/{uid}/protectedEntries/{entryId}` | Opaque ciphertext, metadata minimized, key version | Owner plus protected-session authorization; ciphertext alone is not a complete privacy design |
| `users/{uid}/entities/{entityId}` | Alias and mapping payload, protection class, timestamps | Protected-only; prefer device-held or client-encrypted data after threat-model review |
| Server credential store | Credential ID, public key, user handle, counter, transports, backup state | Server only; never direct client reads |
| Server challenge/session store | Challenge hash/ID, expiry, used flag, session/step-up expiry | Server only; one-time use |

The ordinary/protected data split needs an explicit encryption and key-recovery decision before persisting sensitive mappings. Firestore owner rules prevent cross-user reads but do **not** by themselves provide end-to-end encryption or protected-mode authorization. Existing localStorage entries require a migration choice; do not silently upload them on first sign-in. Seed/demo content must never be mistaken for the user's private records.

## Security review and acceptance gates

- Threats: account takeover through recovery, replayed WebAuthn challenges, forged client success, stolen browser session, cross-user database reads, localStorage leakage, and metadata exposure through entry titles/tags.
- Verify registration and authentication on the server with one-time challenges, exact allowed origin/RP ID, required user verification for protected step-up, short expiry, rate limits, and session rotation. Test cancellation and lockout/recovery without losing ordinary drafts.
- Deny database access by default. Test rules with authenticated owner, other user, unauthenticated user, and protected-data paths. Server SDK access bypasses Firestore rules and needs separate authorization checks.
- Confirm a real passkey ceremony and a server session on local/test infrastructure, then test on the final HTTPS origin. Do not label simulated biometric animation as authentication.
- Decide account recovery, initial registration trust, multi-device credentials, protected-data encryption/key lifecycle, retention/deletion, and local draft migration before a production claim.

Sources: [MDN passkeys](https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys), [SimpleWebAuthn server guide](https://simplewebauthn.dev/docs/packages/server), [Firebase custom authentication](https://firebase.google.com/docs/auth/web/custom-auth), [Firestore security rules](https://firebase.google.com/docs/firestore/security/rules-conditions).
