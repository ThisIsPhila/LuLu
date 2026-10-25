# Current app preview and legacy snapshot

Open `/demo/` on the local Vite server to see the **current app** from `/` inside a mobile or desktop frame. The frame loads the root app directly, so changes under root `src/` appear without copying UI code. It shares the current site's browser storage.

The earlier independent prototype remains at `/demo/legacy.html`. Its source stays under `demo/src/`, including its original toolbar and local `lulu.prototype.entries.v2` storage. It is a historical snapshot and does not follow changes to root `src/`.

`npm run dev` and `npm run dev:demo` both serve the repository root; the latter uses port 5174. Visit `/demo/` on either server for the current preview, or `/demo/legacy.html` for the snapshot. `npm run build:demo` builds both preview pages into `dist/demo/`. The current-app frame needs the root product app served at the parent path. `npm run build:app` builds only the root product to `dist/app/`; Firebase Hosting uses that output and does not publish the demo.

The preview does not imply that authentication, database, or protected storage are implemented. Use synthetic entries until those capabilities are in place.
