# LuLu

LuLu is Team KHÔRA’s FNB AOTY Hackathon 2026 project: a private journal for safer communities and GBV response. The main web app is live at [khora-lulu-2026.web.app](https://khora-lulu-2026.web.app/).

The last recorded Firebase Hosting release is `cf2ca69e213e14dd`. The current repository may contain later local source changes; those are not represented as live until separately deployed. Only the main app is hosted.

## What works today

- Real WebAuthn/passkey registration and sign-in with Firebase sessions. The owner confirmed native sign-in; successful sign-in opens the journal directly, and Sign out is in the avatar menu.
- An owner-scoped ordinary journal with three fictional starter entries copied once per account. Starters are editable, ordinary private/unprotected entries; edits and deletions are preserved.
- Private text writing with encrypted local originals and revisions, explicit save and paragraph-at-a-time concealment. Older cloud-backed protected records retain their existing read path.

Private originals and media are encrypted in browser-held IndexedDB storage; the key is not cryptographically bound to the passkey, and clearing browser data can lose access. Encrypted draft autosave/restart recovery, append-only revisions, local image/audio capture, scoped export/deletion, and password-encrypted per-record backup/restore are implemented locally. These records are not stored in Keychain/Keystore, and native device acceptance remains pending. Full-vault recovery, cross-device key sharing, private offline unlock, external model processing, companion sharing, and Trails are not implemented. See the [implementation snapshot](docs/implementation/2026-10-25-project-snapshot.md) and [current task status](docs/product/2026-10-25-task-status.md) for evidence and remaining work.

Capacitor 8 iOS/Android shells and a hosted passkey relay are implemented locally. The simulator currently launches to a black screen, and the new relay/Functions changes are not deployed, so native sign-in and journal persistence are not yet verified. See the [mobile implementation and release checklist](docs/implementation/2026-10-26-capacitor-mobile.md).

Firebase project `khora-lulu-2026` remains on Blaze with Firestore and Functions in Johannesburg (`africa-south1`). The project uses included free allowances where available; they are not a hard spending cap. Local guardrails are not billing controls. Live deployment-artifact cleanup and actual billing usage remain unverified. See [Firebase cost and guardrails](docs/operations/firebase-cost-and-guardrails.md).

## Run locally

Install dependencies with `npm install`, then start Vite with `npm run dev`.

- `http://127.0.0.1:5173/` — main responsive app (`src/`)
- `http://127.0.0.1:5173/demo/` — local responsive frame around the current main app
- `http://127.0.0.1:5173/demo/legacy.html` — independent historical prototype (`demo/src/`)
- `docs/hackathon/review.html` — internal document, media, and task review library; local only

The frame, legacy prototype, and review library are development tools and are not hosted.

Useful package scripts:

- `npm run build` — type-check and build the app and demo outputs
- `npm run build:app` / `npm run build:demo` — build either output separately
- `npm run build:hosted` — package the main app for Hosting; does not deploy
- `npm run native:sync` — build the app bundle and sync Capacitor projects
- `npm run native:ios` / `npm run native:android` — build the corresponding native project
- `npm run native:open:ios` / `npm run native:open:android` — open the native project in Xcode or Android Studio
- `npm run dev:demo` — serve the same local preview routes on port 5174
- `npm test` / `npm run test:demo` — run the app and legacy transformer tests
- `npm run guard:firebase` — check the repository’s Firebase configuration guardrails
- `npm run test:firebase-guard` — run the guard regression tests

## Project map and contributor pointers

- Product direction and current handoff: [.sdd/memory/current-state/active-context.md](.sdd/memory/current-state/active-context.md)
- Product implementation and limits: [dated project snapshot](docs/implementation/2026-10-25-project-snapshot.md), [task status](docs/product/2026-10-25-task-status.md)
- App UI: `src/App.tsx`, `src/components/`
- Authentication and backend: `src/services/backend/`, `src/components/auth/`, `functions/src/`
- Journal and privacy logic: `src/domain/`, `src/services/vault/`, `src/services/privateCapture.ts`
- Firebase rules, hosting configuration, and guard: `firestore.rules`, `firebase.json`, `scripts/firebase-guard.mjs`
- Local review materials: `docs/hackathon/`

New teammates: read the [project explainer](docs/project-explainer.md), then [contributor setup and coordination](CONTRIBUTING.md). Agents start at [AGENTS.md](AGENTS.md); Claude Code has a matching [CLAUDE.md](CLAUDE.md) pointer.

## Coordinated desktop work

The existing **LuLu Product Implementation** chat handles web functionality and integration, using Luna High for suitable delegated work. Current native work still needs a visible app startup, deployed hosted authentication relay, and authenticated device verification before the ordinary journal milestone is accepted. Private native storage isolation and camera/audio recovery also need target-device checks. OpenCode Nemotron 3 Ultra is trialling one retrospective authentication spec; the owner confirms sending its prompt. Kimi is excluded from active assignments because its free-tier rate limits make availability unpredictable. See [pilot briefs and dispatch status](docs/handoffs/desktop-agent-pilots-2026-10-25.md) for ownership and review criteria.

## SDD and optional visual workspace

Formal SDD progression is paused by owner direction for hackathon delivery. Phase 001 Architecture Foundation remains an unapproved draft; implementation and later documentation do not imply phase approval. The framework, hooks, and evidence remain in place. See the [SDD pause decision](.sdd/memory/governance/2026-10-24-hackathon-sdd-pause.md).

The ignored `.sdd-framework` clone provides an optional visual interface. To restore it, clone `https://github.com/ThisIsPhila/Spec-Driven-Development-Framework.git` at revision `20642e42c9f63f4e93bfbc56c849eabc092ce787` into `.sdd-framework`. Apply `.sdd/evidence/setup/visual-security.patch` in that clone before installing dependencies to reproduce the local DOMPurify security correction, then run:

```sh
npm --prefix .sdd-framework/visual ci
npm --prefix .sdd-framework/visual run build
npm --prefix .sdd-framework/visual run workspace -- --project "$PWD"
```

Keep the generated local launch credential private; Markdown in `.sdd/` remains authoritative.
