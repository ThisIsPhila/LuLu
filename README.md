<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/media/brand/lulu-wordmark-white.png">
    <img src="public/media/brand/lulu-wordmark-black.png" alt="LuLu" width="190">
  </picture>
</p>

<h1 align="center">Your story. Your safety. Your choice.</h1>
<p align="center"><strong>An ordinary journal with an extraordinary purpose.</strong></p>
<p align="center">
  <a href="https://khora-lulu-2026.web.app/"><strong>Open LuLu</strong></a>
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

LuLu brings **everyday journalling and protected personal documentation** into one familiar space. You can capture a thought, save an important moment and return to an ordinary journal. When something needs greater privacy, LuLu's protected-writing experience is designed to help preserve it without requiring you to decide immediately whether to disclose it or seek help.

The wider vision connects **capture → preservation → understanding → choice → support**: one continuous experience for people who may not yet know what to call what they're experiencing, what their options are, or when they will feel ready to act.

Created by **Team KHÔRA** for the **FNB App of the Year Hackathon 2026**, addressing the challenge **Safer communities and gender-based violence (GBV) response**.

> **Our principle:** The person owns their story. Original records should remain theirs; interpretation, sharing and seeking support should happen on their terms.

## Experience LuLu

### Start with the live application

**[Launch LuLu in your browser](https://khora-lulu-2026.web.app/)**

The web release is the quickest way to explore the *currently deployed* experience. The application uses real device/browser passkey authentication; there is no shared demo password.

| Step | What to do | What you'll see |
| --- | --- | --- |
| **1. Create your space** | Register or sign in with a passkey. | A device/browser authentication prompt, followed by your account-owned space. |
| **2. Explore the journal** | Open ordinary journal entries, edit one and save. | Three fictional starter entries are initially added to new accounts; they can be edited. |
| **3. Explore Stories** | Navigate to **Stories** in the ordinary experience. | A familiar, everyday writing surface. |
| **4. Explore protected writing** | In a version exposing **Private** or **Write privately**, select that entry point. | Protected access is separate from signing in. Availability varies by release; see below. |

**Important:** The live Firebase Hosting release and newer repository source are not identical. The currently documented hosted release is confirmed for passkey access and the account-owned ordinary journal; the newer encrypted local private-writing implementation has been exercised in local testing but has **not** been verified as part of that hosted release. This README distinguishes them rather than presenting planned functionality as live.

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
| Passkey registration and sign-in | **Available** | Available |
| Account-owned ordinary journal (Firestore) | **Available** | Available |
| Three editable fictional starter entries | **Available** | Available |
| Encrypted browser-local private text and media | Not verified in hosted release | Implemented; locally tested |
| Private drafts, revisions and autosave | Not verified in hosted release | Implemented; locally tested |
| Image/audio private attachments; export and deletion | Not verified in hosted release | Implemented; locally tested |
| Password-encrypted per-record backup/restore | Not verified in hosted release | Implemented; locally tested |
| Configured substitutions and narrative distancing | Hosted availability unverified | Implemented |
| General contextual PII screening / OpenAI Decisions API integration | Not available | Planned |
| Companion permissions and evidence sharing | Not available | Planned |
| Safety Trails / live location sharing | Not available | Planned |
| Verified professional portal and referrals | Not available | Planned |

**Privacy implementation note.** In the newer source, private originals and media are encrypted using AES-GCM in browser IndexedDB. The vault's key resides in browser storage and is **not cryptographically bound to the passkey**. Clearing browser data may destroy access unless an appropriate backup exists. Full offline unlock, cross-device recovery and native-device security acceptance are not yet established. Older cloud-backed protected records use a separate legacy read path.

For detailed and dated engineering evidence, see the [implementation tracker](docs/product/2026-10-25-task-status.md) and [Capacitor mobile report](docs/implementation/2026-10-26-capacitor-mobile.md).

## Availability and platforms

| Platform | How to access | Status |
| --- | --- | --- |
| **Web** | **[Open the live app](https://khora-lulu-2026.web.app/)** | Hosted release available. |
| **PWA** | Install from a supported browser when offered. | Installability and offline behaviour must still be validated before publishing installation instructions. |
| **Android** | Capacitor 8 Android project in source. | Builds have succeeded; no device-accepted APK download is currently published. |
| **iOS** | Capacitor 8 iOS project in source. | Simulator black-screen issue and device acceptance remain outstanding; no IPA/TestFlight link published. |

APK and iOS installation links will appear here **after** testable, signed builds exist. A successful project build alone is not evidence of a working mobile release.

## Behind the project

LuLu's repository includes an **interactive HTML documentation library** showing how the product was researched, designed and developed. It is useful for judges who want to inspect more than the final interface.

Explore **Documents** for the business canvas, SSDLC/security assessment, onboarding flow and screen plan; **Media** for the brand kit, logos and design boards; and **Tasks** for production progress and dated reports.

**[Open the project library HTML](docs/hackathon/review.html)** · **[Design resources](docs/design/README.md)**

For the full interactive reader, run `npm run dev` and visit **[localhost:5173/docs/hackathon/review.html#canvas](http://127.0.0.1:5173/docs/hackathon/review.html#canvas)**. The browser-based reader is a **local project workspace**, not a separate public deployment. The screenshots and design boards illustrate design intent; they should not be interpreted as proof that every illustrated feature is in the live build.

## How it's built

LuLu uses **React, TypeScript and Vite** for the app; **WebAuthn/passkeys**, a custom verification backend and **Firebase Authentication** for account access; **Firestore** for account-owned ordinary journal entries; and a separate **AES-GCM encrypted IndexedDB vault** for newer browser-local private records. **Capacitor 8** packages the web application into Android and iOS projects.

The application deliberately distinguishes ordinary account data, original protected records and derived or selectively disclosed content. The proposed Decisions API layer, companion sharing and support integrations are subsequent development work, not dependencies hidden inside the current deployed release.

## Run from source

Requirements: Node.js and npm, plus configured development environment credentials for the relevant Firebase functionality.

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

To review newer private-record functionality in the current source, sign in, select **Private** or **Write privately**, create and reopen a protected record, and test **Quick exit**. Local behaviour should not be assumed to match the hosted version.

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
