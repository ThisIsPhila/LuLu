# Shared navigation and settings polish

- **Source baseline:** `2e863b615dc97c09d5cc0da58f576353bbe574cd` (local working tree contained other in-progress changes).
- **Environment:** Local LuLu app at `http://127.0.0.1:5173/`; existing Vite process responded with HTTP 200. Browser used the existing seeded local preview in dark mode.
- **Procedure:** Inspected Home, Reader, Compose and Profile & Settings at the default browser viewport. Scrolled Settings to confirm the header becomes a floating pill and no generic scrollbar is visible. Confirmed dark mode renders as a 42×24 pill switch and Choose photo uses a dark, coordinated surface. Used the logo to return Home, navigated Reader → Journal → Back, and Compose → Journal → Back; Back returned Home without reopening a blank transient route. Applied a temporary 390×844 viewport to inspect mobile header, Back/Menu controls, theme and notification-panel placement, then reset the viewport and left the browser on Home.
- **Result:** The shared header and contextual navigation were visible and operable on desktop and mobile; Reader and Compose do not show a duplicate local header; Write is absent from header navigation; scrolling remains available without a visible browser scrollbar. The notification panel fits within the mobile viewport.
- **Build:** `npm run build:app` passed, including TypeScript, Vite app build and mobile-package verification; output is in `build.txt`. Existing Framer Motion directive and large-chunk warnings remain.
- **Diff check:** `git diff --check` passed.
- **Scope:** Local source and preview only. No tests, deploy, OTA release, commit, push, account mutation, or production change.

## Follow-up: no lateral header motion and dark collection text — 29 October 2026

- The earlier width-anchor change still animated the header width. Replaced that with a fixed full-width header track and a fixed-width centered island surface that fades in/out. Computed desktop center stayed at `538.64px` through top, down and up states; the fixed content track stayed `760px`. At the 390×844 responsive override, the in-app viewport measured 354×767 CSS px and its track center stayed `177.27px` through top, down and up states. `width` is absent from the computed transition properties.
- Reproduced the Home Journal and Stories collection spreads in dark mode. Their metadata, excerpts and “Read entry” links used light-mode colors. Added dark overrides and verified computed colors of `rgb(197, 199, 187)`, `rgb(222, 219, 209)` and `rgb(215, 223, 202)` respectively. Opened individual Journal and Story entries; their reader text remained readable.
- Confirmed LuDock remains visible at the bottom of Home. The earlier statement that the visible dock had been removed was incorrect.
- `npm run build:app` passed; `git diff --check` passed; local preview returned HTTP 200. Vite development does not register the app service worker, and a full reload cleared the transient stale view. Browser viewport checks only; no physical native-device acceptance, deployment, OTA update, commit or push.

## Follow-up: remove shared-header haze, separate Back, and open the framed preview — 29 October 2026

- The shared header inherited the older `.stitch-topbar` frosted-glass backdrop. Removed its backdrop filter and full-width surface from the shared header in both themes; the compact floating island keeps its solid theme surface and vertical-only motion.
- Moved Back into a separate floating row beneath the header. The Reader content now scrolls inside the remaining viewport below that navigation area.
- Verified the framed preview route at `http://127.0.0.1:5173/demo/` (HTTP 200); it is the page with Mobile/Desktop preview controls. The app route `/` is not the framed demo. Opened the framed page and confirmed the embedded app/reader and Back control are present. This is a local preview, not a public deployment.
- `npm run build:app` passed, including TypeScript and mobile-package verification; `git diff --check` passed. Existing Framer Motion module-directive and large-chunk warnings remain. No deployment, OTA update, commit or push.

## Follow-up: standalone icon-only Back control — 29 October 2026

- Removed Back from `OrdinaryNavigationHeader` and rendered it as a sibling control in the app viewport. It is fixed below the header, so it does not consume header or page layout space.
- Removed the “Back” label and fill; the accessible ArrowLeft control now has a thin circular outline to contain the icon without adding a background.
- `npm run build:app` passed; `git diff --check` passed. The local framed preview was reopened at `http://127.0.0.1:5173/demo/` for the owner. No deployment, commit or push.

- The earlier preview tab was created as a temporary automation tab and was cleaned up at turn end. Reopened `/demo/` in a user-facing tab and marked it deliverable so it remains open after this turn.

## Follow-up: established Back control, movable Lu, and direct iPhone update — 29 October 2026

- Replaced the experimental outlined Back treatment with the existing `.topbar-circle-btn` style used by the app’s other icon controls. It remains an icon-only fixed sibling below the header and does not occupy page layout.
- Lu can be dragged only when he is outside LuDock. The undocked default is bottom-right with safe-area spacing; the position clamps to the visual viewport, seeks a clear space around visible fixed/sticky UI, and saves a user-moved position on the device. Docked Lu keeps the existing dock position and cannot be dragged independently.
- `npm run build:app` passed. `npx cap sync ios` copied the new app assets. `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'id=00008110-000204493CBA401E' -derivedDataPath /tmp/lulu-ios-device-build-20261029 build` succeeded; the built app signature verified.
- Installed and launched LuLu on the paired physical iPhone 13 Pro Max (UDID `00008110-000204493CBA401E`). `devicectl` confirms `org.khora.lulu`, version 1.1, build 13 replacing build 12. Direct install was used; no OTA or web deployment.
- Device install and launch were verified. The drag gesture has not yet been physically exercised on the handset. `git diff --check` passed.
