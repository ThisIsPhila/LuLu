<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/media/brand/lulu-wordmark-white.png">
    <img src="public/media/brand/lulu-wordmark-black.png" alt="LuLu" width="190">
  </picture>
</p>

<h1 align="center">Your story. Your safety. Your choice.</h1>
<p align="center"><strong>A journal and storybook for everyday writing and protected personal documentation.</strong></p>
<p align="center">
  <a href="https://lulu.thisisphila.co.za/"><strong>Try the live web demo</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/ThisIsPhila/LuLu/releases/tag/android-ios-preview-2026-10-27">Download mobile previews</a>
  &nbsp;·&nbsp;
  <a href="#experience-lulu">Explore the experience</a>
  &nbsp;·&nbsp;
  <a href="#availability-and-platforms">Platforms</a>
  &nbsp;·&nbsp;
  <a href="#behind-the-project">Project library</a>
</p>

---

## Meet LuLu

![LuLu onboarding design reference showing the welcome and personalisation screens](docs/design/resources/2026-10-26-onboarding/01-personalise-screens-01-03.png)

Sometimes the first step is simply writing something down.

LuLu is a **journal and storybook for everyday writing and protected personal documentation**. You can capture a thought, save an important moment and return to an ordinary journal. When something needs greater privacy, LuLu's protected-writing experience is designed to help preserve it without requiring you to decide immediately whether to disclose it or seek help.

The wider vision connects **capture → preservation → understanding → choice → support**: one continuous experience for people who may not yet know what to call what they're experiencing, what their options are, or when they will feel ready to act.

Created by **Team KHÔRA** for the **FNB App of the Year Hackathon 2026**, addressing the challenge **Safer communities and gender-based violence (GBV) response**.

> **Our principle:** The person owns their story. Original records should remain theirs; interpretation, sharing and seeking support should happen on their terms.

## Experience LuLu

### For the demo, start with the live web app

**[Open the live LuLu web app](https://lulu.thisisphila.co.za/)**

This is the recommended way for judges and reviewers to try LuLu. It opens in a browser and does not require installing a native app. The web release uses device/browser passkeys or the configured account sign-in; there is no shared demo password.

| Step | What to do | What you'll see |
| --- | --- | --- |
| **1. Create your space** | Register or sign in with a passkey or email/password; Google is configured with its corrected OAuth callback. | A device/browser authentication prompt, followed by your account-owned space. |
| **2. Explore the journal** | Open ordinary journal entries, edit one and save. | Three fictional starter entries are initially added to new accounts; they can be edited. |
| **3. Explore Stories** | Navigate to **Stories** in the ordinary experience. | A familiar, everyday writing surface. |
| **4. Explore protected writing** | In a version exposing **Private** or **Write privately**, select that entry point. | Protected access is separate from signing in. Availability varies by release; see below. |

**Release update — 26 October:** The web app is hosted at the custom domain. Login opens directly and **Onboarding** is optional. Live synthetic email/password and passkey registration, returning sign-in and application-session tests passed, including private passkey step-up; both temporary accounts and seven test documents were removed. Product Implementation corrected the missing Google OAuth callback; interactive Google/native acceptance remains open. Broader private/mobile work is still local and needs owner-device acceptance. See the [release verification](docs/implementation/2026-10-26-auth-domain-release.md).

### The experience we're building

| | The interaction | Why it matters |
| --- | --- | --- |
| **Everyday writing** | Write, edit and organise familiar journal entries. | LuLu is useful as an ordinary writing app, not just as an emergency tool. |
| **Private writing** | Enter a separate protected space for sensitive records. | A person can document something without committing to report it. |
| **Capture and preserve** | Keep text and supporting image/audio material with an entry. | Their original account and supporting information can be preserved. |
| **Conceal and return** | Use privacy controls and quick exit where implemented. | Private material is not left visibly open during ordinary use. |
| **Understand options** | Future privacy-aware interpretation and contextual information. | Help the user explore possible concerns and appropriate options without diagnosing. |
| **Choose support** | Future selective sharing with companions and verified services. | Move forward only when and how the user chooses. |

## What works today

Rather than treating a design concept, a local implementation and a deployed release as equivalent, we track each separately.

| Capability | Live hosted web app | Current repository source |
| --- | --- | --- |
| Passkey registration and sign-in | **Available · live synthetic check passed** | Available |
| Email/password registration and sign-in | **Available · live synthetic check passed** | Available |
| Google sign-in | Callback corrected; interactive acceptance pending | Implemented |
| Optional onboarding | **Available from login** | Fourteen-screen flow |
| Account-owned ordinary journal (Firestore) | **Available** | Available |
| Three editable fictional starter entries | **Available** | Available |
| Encrypted browser-local private text and media | Not in the current deployed web release | Implemented locally; device acceptance pending |
| Private drafts, revisions and autosave | Not in the current deployed web release | Implemented locally; device acceptance pending |
| Image/audio private attachments; export and deletion | Not in the current deployed web release | Implemented locally; device acceptance pending |
| Password-encrypted per-record backup/restore | Not in the current deployed web release | Implemented locally; device acceptance pending |
| Configured substitutions and narrative distancing | Not in the current deployed web release | Limited implementation; broader detection remains planned |
| General contextual PII screening / OpenAI Decisions API integration | Not available | Planned |
| Companion permissions and evidence sharing | Not available | Planned |
| Safety Trails / live location sharing | Not available | Planned |
| Verified professional portal and referrals | Not available | Planned |

**Privacy implementation note.** In the newer source, private originals and media are encrypted using AES-GCM in browser IndexedDB. The vault's key resides in browser storage and is **not cryptographically bound to the passkey**. Clearing browser data may destroy access unless an appropriate backup exists. Full offline unlock, cross-device recovery and native-device security acceptance are not yet established. Older cloud-backed protected records use a separate legacy read path.

For detailed and dated engineering evidence, see the [implementation tracker](docs/product/2026-10-25-task-status.md) and [Capacitor mobile report](docs/implementation/2026-10-26-capacitor-mobile.md).

## Availability and platforms

| Platform | How to access | Status |
| --- | --- | --- |
| **Web** | **[Open the live demo](https://lulu.thisisphila.co.za/)** | Recommended for demos and reviews; hosted release available. |
| **PWA install** | Not available yet; use the regular web link above. | LuLu does not currently provide a web manifest/install prompt. Offline account access and private-vault recovery are not guaranteed. |
| **Android** | [Download the development APK](https://github.com/ThisIsPhila/LuLu/releases/download/android-ios-preview-2026-10-27/LuLu-Android-preview.apk). | Debug-signed preview for Android 7.0 or later; not a Play Store release. |
| **iOS** | [Download the registered-device iPhone build](https://github.com/ThisIsPhila/LuLu/releases/download/android-ios-preview-2026-10-27/LuLu-iOS-registered-device.zip). | Development build for the already registered iPhone, installed from a Mac with Xcode. No TestFlight or App Store download is available. |

### Download and install a mobile preview

The [mobile preview release](https://github.com/ThisIsPhila/LuLu/releases/tag/android-ios-preview-2026-10-27) contains both packages and [SHA-256 checksums](https://github.com/ThisIsPhila/LuLu/releases/download/android-ios-preview-2026-10-27/SHA256SUMS.txt). This repository is private, so you must sign in to a GitHub account with access to download them. The previews were built from the local development working tree on 27 October 2026, including changes not yet committed to GitHub main; the release tag identifies the main-branch baseline, not an exact source snapshot of these packages.

**Android:** Download the APK on the phone, open it from Downloads, allow your browser or file manager to install apps when Android asks, and tap **Install**. The APK is version 1.0, build 1, signed with the development debug certificate. If Android reports an incompatible signature with an existing LuLu installation, preserve any local records before changing or removing that installation. This is a development preview; the full journal edit and restart journey has not yet been accepted on a device.

**iPhone:** The ZIP contains `App.app` signed for the existing registered development iPhone; it is not an IPA or a TestFlight link and cannot be installed on an arbitrary iPhone. On a Mac with Xcode, connect and trust that registered phone, enable Developer Mode, then run:

```bash
unzip LuLu-iOS-registered-device.zip -d lulu-ios
xcrun devicectl list devices
xcrun devicectl device install app --device "<device-identifier>" lulu-ios/App.app
```

Replace `<device-identifier>` with the identifier shown for the registered iPhone. The included development provisioning profile expires **2 November 2026 at 05:22 UTC**; installation and launch after that require a renewed profile and rebuilt package. For a wider iPhone beta, [Apple TestFlight](https://developer.apple.com/testflight/) requires an App Store Connect build and tester setup. iPhone passkey sign-in was confirmed on the owner's device; full journal edit and restart persistence remains to be verified.

The optional privacy model can be downloaded separately in the app under **Settings → On-device privacy model**. It requires roughly 192 MB and is stored in the app's WebView storage. It is an experimental English entity detector, and its download and inference have not yet been verified on these mobile builds.

### Build a mobile version from source

These steps are for developers with the platform toolchain. For a demo, use the **live web app** above.

```bash
npm install
npm run native:sync
```

- **Android:** install Android Studio, the Android SDK and JDK 21, connect a physical Android device with developer debugging enabled, then run `npm run native:open:android`. Select the device in Android Studio and run the `app` configuration. A separate release signing key is required for a production APK/AAB.
- **iOS:** on macOS, install Xcode, connect an iPhone, then run `npm run native:open:ios`. Select a signing team and the connected device in Xcode, then run the app. Apple signing is required before distributing an IPA or TestFlight build.

The downloadable builds above are development previews. No Play Store, TestFlight or App Store release has been published.

## Behind the project

LuLu's repository includes an **interactive HTML documentation library** showing how the product was researched, designed and developed. It is useful for judges who want to inspect more than the final interface.

Explore **Documents** for the business canvas, SSDLC/security assessment, onboarding flow and screen plan; **Media** for the brand kit, logos and design boards; and **Tasks** for production progress and dated reports.

**[Open the project library HTML](docs/hackathon/review.html)** · **[Design resources](docs/design/README.md)**

For the full interactive reader, run `npm run dev` and visit **[localhost:5173/docs/hackathon/review.html#canvas](http://127.0.0.1:5173/docs/hackathon/review.html#canvas)**. The browser-based reader is a **local project workspace**, not a separate public deployment. The screenshots and design boards illustrate design intent; they should not be interpreted as proof that every illustrated feature is in the live build.

## How it's built

LuLu uses **React, TypeScript and Vite** for the app; **WebAuthn/passkeys**, a custom verification backend and **Firebase Authentication** for account access; **Firestore** for account-owned ordinary journal entries; and a separate **AES-GCM encrypted IndexedDB vault** for newer browser-local private records. **Capacitor 8** packages the web application into Android and iOS projects.

The application deliberately distinguishes ordinary account data, original protected records and derived or selectively disclosed content. The proposed Decisions API layer, companion sharing and support integrations are subsequent development work, not dependencies hidden inside the current deployed release.

## Run from source

Requirements: Node.js and npm. Local Vite development provides an **Open development app** button with a separate fictional journal saved in browser storage. Production and native builds retain real authentication; the local bypass is removed from production output.

```bash
npm install
npm run dev
```

| Address | Purpose |
| --- | --- |
| `http://127.0.0.1:5173/` | Current responsive application |
| `http://127.0.0.1:5173/demo/` | Interactive local frame for the main application |
| `http://127.0.0.1:5173/demo/legacy.html` | Independent historical prototype, not the current app |
| `http://127.0.0.1:5173/docs/hackathon/review.html#canvas` | Interactive project documentation library |

To review private-record functionality in local development, click **Open development app**, select **Private** or **Write privately**, create and reopen a protected record, and test **Quick exit**. The local workspace has its own identity and records and grants no access to a Firebase account. Use **Onboarding** from login to develop that flow separately.

### Builds and checks

```bash
npm run build          # type-check and build app/demo outputs
npm test               # run project tests
npm run build:hosted   # prepare hosted app output; does not deploy
npm run native:sync    # build and sync Capacitor platforms
npm run native:android # Android native build workflow
npm run native:ios     # iOS native build workflow
```

Native workflows require their platform toolchains. The mobile status is documented in the [mobile report](docs/implementation/2026-10-26-capacitor-mobile.md).

---

<p align="center"><strong>LuLu · Team KHÔRA</strong><br>FNB App of the Year Hackathon 2026 · Safer communities and GBV response</p>
<p align="center"><em>Your story. Your safety. Your choice.</em></p>
