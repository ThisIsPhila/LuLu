# App/demo isolation — 24 October 2026

Environment: local working tree, Vite at 127.0.0.1:5173. No deployment or owner acceptance claimed.

The existing uncommitted interactive source was copied before modification into demo/src. It keeps its phone frame, toolbar, controls and existing browser-storage key. Root src has an adaptive product shell, with the frame, toolbar component and frame/toolbar styles removed. Root and demo do not import one another. Main storage uses lulu.app.entries.v1; demo retains lulu.prototype.entries.v2. Existing demo records are not migrated or erased.

Verification: TypeScript and both Vite production builds pass. App output is dist/app and demo output is dist/demo. Both transformer suites pass (six tests each). Browser observed main home, editor and library without a frame or demo toolbar; observed preserved demo with one frame and one toolbar. At the observed 966px browser width, main library had no horizontal document overflow. Other device sizes and owner design acceptance remain unverified.

React review: stable matchMedia subscription through useSyncExternalStore, lazy journal initialization retained, responsive layout switching preserves coordinator state. No new API calls, credentials or authentication changes. Feature/security behaviour inherited from the interactive implementation has not been independently validated by this separation.

Six owner-supplied PNGs copied unmodified to docs/design/resources/2026-10-24-warm-tactile. Applying the new visual direction is subsequent work.
