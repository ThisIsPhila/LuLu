<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/media/brand/lulu-wordmark-white.png">
    <img src="public/media/brand/lulu-wordmark-black.png" alt="LuLu" width="180">
  </picture>
</p>

<h1 align="center">A journal for words that matter.</h1>

<p align="center">
  <a href="https://khora-lulu-2026.web.app/">Open the live LuLu app</a>
</p>

LuLu is Team KHÔRA’s FNB AOTY Hackathon 2026 project for safer communities and GBV response. It brings everyday journaling and private writing into one thoughtful experience, with room to preserve a person’s own words and choose what they keep protected.

![LuLu onboarding design reference showing the welcome and personalisation screens](docs/design/resources/2026-10-26-onboarding/01-personalise-screens-01-03.png)

*Onboarding design reference. This board illustrates the intended visual direction; it is not a screenshot of the live app or a claim that every pictured feature is implemented.*

## Try LuLu

**Live app:** [https://khora-lulu-2026.web.app/](https://khora-lulu-2026.web.app/)

1. Create an account or sign in with a passkey. The browser or device shows its real passkey prompt; there is no shared demo password or assessor account.
2. Explore the ordinary journal and Stories. New accounts receive three fictional starter entries that can be edited and saved to that account.
3. Use the app’s private-writing entry point to explore protected access where it is available in the deployed release. A passkey sign-in and private-access check are separate steps.

The live site hosts the main app only. Its last recorded Hosting release is `cf2ca69e213e14dd`; newer work in this repository is local source and should not be assumed to be live. The hosted app is the quickest way to assess passkey access and the account-owned ordinary journal. The current source also contains newer private-writing and mobile work described below.

For a walkthrough of the newer private-writing implementation, run the current source locally, sign in using the passkey flow, choose **Private** or **Write privately**, then save and reopen a private record and use **Quick exit**. That exercises browser-local storage in the current source; it is not a walkthrough of the last hosted release or physical-device acceptance.

## What’s in the project

| Area | Current state |
| --- | --- |
| Ordinary journal | Passkey registration/sign-in and an owner-scoped Firestore journal are deployed. Starter entries are fictional, editable, and copied into each account once. |
| Private writing | The current local source includes encrypted browser storage for private text, revisions, autosaved drafts, image/audio media, export, deletion, and password-encrypted per-record backup/restore. Newer work has local regression and synthetic-browser evidence; it has not been accepted on a physical phone or included in the last recorded Hosting release. |
| Privacy boundaries | Private originals and media use AES-GCM encryption in IndexedDB. The key is held by the browser and is not cryptographically bound to the passkey; losing or clearing browser data can mean losing access. This is not a complete offline unlock or account-recovery system. |
| Transformation | Configured entity substitutions and narrative distancing exist. General contextual/PII detection, Decisions API transport, real companion sharing, and Trails are not implemented. |
| Mobile | Capacitor 8 iOS and Android shells and platform adapters are in the repository. Builds succeeded, but the iOS simulator currently opens to a black screen; hosted bridge/function changes and authenticated device acceptance are still outstanding. |

Older cloud-backed protected records retain their existing read path; they are distinct from newer browser-local private records. Local implementation, hosted behavior, and physical-device acceptance are tracked separately in the [implementation status](docs/product/2026-10-25-task-status.md) and the dated [mobile report](docs/implementation/2026-10-26-capacitor-mobile.md). The wider product direction includes safer documentation, evidence continuity, selective disclosure, and support; the features above are a partial implementation, not a claim that the full product is complete.

## Architecture

The main app is React and TypeScript, built with Vite. A custom WebAuthn backend verifies passkeys and establishes Firebase Auth sessions; Firestore stores account-owned ordinary journal entries. Private originals use a separate encrypted local vault. Capacitor 8 wraps the same app for iOS and Android. The local app, hosted release, and native shells have different verification status; see the table above before treating a source feature as available in production.

## Run the app locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open these local routes:

| Route | What it opens |
| --- | --- |
| `http://127.0.0.1:5173/` | Main responsive app (`src/`) |
| `http://127.0.0.1:5173/demo/` | Local interactive frame around the main app |
| `http://127.0.0.1:5173/demo/legacy.html` | Independent historical prototype (`demo/src/`) |
| [`http://127.0.0.1:5173/docs/hackathon/review.html#canvas`](http://127.0.0.1:5173/docs/hackathon/review.html#canvas) | Internal Documents library (canvas; use its navigation for SSDLC, onboarding, and screen plan) |

In the internal library, use **Documents** for the canvas, SSDLC, onboarding, and screen plan; **Media** for brand and design references; and **Tasks → Production progress** or **Sunday progress update** for implementation and submission status. Its task checkboxes are a local review aid, not live project telemetry. The frame, historical prototype, and library are local-only and are not included in the hosted app. On GitHub, the library link opens its HTML source; run the local server to use its interactive reader.

### Read and review

With the local server running, these links open the formatted reader directly:

| For | Open |
| --- | --- |
| Business and security assessment | [Business canvas](http://127.0.0.1:5173/docs/hackathon/review.html#canvas) · [SSDLC](http://127.0.0.1:5173/docs/hackathon/review.html#ssdlc) |
| Experience and design | [Onboarding flow](http://127.0.0.1:5173/docs/hackathon/review.html#onboarding-flow) · [Screen plan](http://127.0.0.1:5173/docs/hackathon/review.html#screen-plan) |
| Visual resources | [Brand kit and components](http://127.0.0.1:5173/docs/hackathon/review.html#media-brand) · [Logos](http://127.0.0.1:5173/docs/hackathon/review.html#media-logos) · [Onboarding boards](http://127.0.0.1:5173/docs/hackathon/review.html#media-onboarding) |
| Delivery progress | [Production checklist](http://127.0.0.1:5173/docs/hackathon/review.html#tasks-production) · [Sunday update](http://127.0.0.1:5173/docs/hackathon/review.html#progress-sunday) |

Useful package scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and build the main app and demo outputs |
| `npm run build:app` / `npm run build:demo` | Build either output separately |
| `npm run build:hosted` | Package the main app for Firebase Hosting; does not deploy |
| `npm test` / `npm run test:demo` | Run the app and historical-prototype transformer tests |
| `npm run guard:firebase` | Check Firebase configuration guardrails |
| `npm run native:sync` | Build the app and sync Capacitor projects |
| `npm run native:ios` / `npm run native:android` | Build a native project |

## Project map

- [Product explainer](docs/project-explainer.md) and [current product direction](docs/product/2026-10-25-product-direction.md)
- [Implementation tracker](docs/product/2026-10-25-task-status.md)
- [Design references and assets](docs/design/README.md)
- [Firebase cost and configuration guardrails](docs/operations/firebase-cost-and-guardrails.md)
- Application: `src/`; independent historical prototype: `demo/src/`
- Firebase Functions: `functions/`; configuration and access rules: `firebase.json`, `firestore.rules`

### For contributors

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Project and agent entry points are [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), and [GEMINI.md](GEMINI.md). Formal SDD phase progression is paused for hackathon delivery; Phase 001 remains an unapproved draft. The owner’s [pause decision](.sdd/memory/governance/2026-10-24-hackathon-sdd-pause.md) explains the current working mode. Local authoring does not authorize deployment or other external changes.

<details>
<summary>Optional: restore the visual SDD workspace</summary>

The visual workspace is optional. Markdown in `.sdd/` remains authoritative. To restore the ignored framework clone at its recorded revision, apply the project’s local security patch before installing dependencies:

```sh
git clone https://github.com/ThisIsPhila/Spec-Driven-Development-Framework.git .sdd-framework
git -C .sdd-framework checkout 20642e42c9f63f4e93bfbc56c849eabc092ce787
git -C .sdd-framework apply ../.sdd/evidence/setup/visual-security.patch
npm --prefix .sdd-framework/visual ci
npm --prefix .sdd-framework/visual run build
npm --prefix .sdd-framework/visual run workspace -- --project "$PWD"
```

Keep the generated local launch credential private.
</details>
