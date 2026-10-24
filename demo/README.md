# Preserved interactive demo

Open `/demo/` on the local Vite server. This is the interactive framed implementation captured before separating the actual web app. It retains the mobile/desktop preview toggle, phone shell and demo controls.

Its entry, components, styles and domain code live under `demo/src/`. The main responsive app lives under root `src/` and opens at `/`. Neither application imports the other's implementation. Both use the repository's React/Vite dependencies. `npm run build:app` outputs only the product to `dist/app/`; `npm run build:demo` outputs only the demo to `dist/demo/`. `npm run build` checks TypeScript and builds both. `npm run dev:demo` serves the demo independently on port 5174.

The demo keeps the existing `lulu.prototype.entries.v2` browser-storage key. The app uses `lulu.app.entries.v1`. Existing demo entries are left intact; app edits and demo resets do not overwrite one another. Both are local implementations with synthetic seed data, not production security or cloud integrations.

This intentional snapshot allows the app's design to evolve independently. Copy a fix deliberately when it should apply to both; do not silently couple their UI or state again. No per-page `/test` routing is introduced in this separation.
