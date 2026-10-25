# Mobile onboarding layout review

Date: 2026-10-25. Local route: `/demo/` framing current `/` at 390px.

The mobile onboarding uses a flexible image cover above a bottom-anchored content/action panel. The real white LuLu wordmark is larger, right-positioned, softly shadowed and padded below the safe area. The introduction uses the cover image instead of repeating a large photo in the panel. The returning sign-in cover can shrink to leave room for its longer form. Short screens may scroll rather than clipping controls.

Correction in the same local session: the initial pass moved all mobile copy and actions to right alignment. The owner rejected that broad interpretation. Text, orientation content and footnotes have been restored to left alignment; primary and secondary actions are centred. The white logo retains its requested clearance and position. The corrected state is the one to review.

Browser review confirmed Welcome, orientation, create-passkey and returning sign-in at the 390px review width. The primary action and footer are visible on those screens. The original pass is captured at `.sdd/evidence/hackathon-ui/2026-10-25-mobile-onboarding-layout.png`; the corrected alignment is captured at `.sdd/evidence/hackathon-ui/2026-10-25-mobile-alignment-restored.png`. `npm run build:app` and `git diff --check` passed after the correction. The build retains an existing large JavaScript chunk advisory.

This is local visual verification, not a physical phone or passkey ceremony. Browser safe-area emulation at a specific camera cutout was unavailable; the CSS uses `env(safe-area-inset-top)` plus clearance. No cloud deployment was made.
