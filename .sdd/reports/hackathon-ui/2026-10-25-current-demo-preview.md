# Current app preview route correction

Date: 2026-10-25

## Cause

`/demo/` loaded the preserved `demo/src/` React prototype. The current responsive app loads from root `src/` at `/`, so the framed demo could remain visually stale even when the product UI changed.

## Change

- `/demo/` now frames the current app at `/` in mobile and desktop widths.
- The preserved prototype remains available at `/demo/legacy.html` with its source and storage key intact.
- Demo build includes both routes. `dev:demo` now serves from the repository root on port 5174 so the frame can reach the current app.
- Route documentation updated in `demo/README.md` and the root README.

## Evidence

- Opened `/demo/` locally and confirmed its iframe exposes the current app home with the Journal and Stories collection covers.
- Selected Desktop; its control changed to pressed and the frame resized.
- Opened `/demo/legacy.html` and confirmed it still exposes the old independent prototype.
- `npm run build:demo` passed, producing both HTML routes.
- Desktop visual proof: `.sdd/evidence/hackathon-ui/2026-10-25-current-demo-desktop.png`.

The frame previews the current app on a local server; this is not a deployment. A standalone `dist/demo/` preview still requires the current app to be served at its parent site path.
