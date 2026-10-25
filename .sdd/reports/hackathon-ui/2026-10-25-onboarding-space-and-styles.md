# Onboarding spacing and style scope

Date: 2026-10-25. Local implementation; no deployment.

The app uses a component architecture: `AuthBoundary` owns authenticated access, `OnboardingAuth` owns onboarding UI state, and its internal `Orientation` and `PasskeyAction` parts render the step content. The product has global base/layout styles in `src/styles.css` and `src/app-layout.css`. This pass moved onboarding-specific rules next to the component as `src/components/OnboardingAuth.css` and updated its import. Its selectors remain scoped to `.onboarding-auth` and `oa-` classes.

The lower mobile panel previously had `min-height: 57svh` and flexible blank space between the introduction and actions. It now sizes to content while the image cover grows to fill remaining viewport height. The actions and footnote follow the copy with deliberate spacing. Left-aligned copy and centred action labels are preserved. On desktop, the footer no longer uses an auto margin that pushed it to the bottom of the panel; the content group is vertically centred. The orientation section can shrink so its footer remains visible.

Verified by browser review at the 390px mobile frame and desktop frame: Welcome, mobile orientation, mobile returning sign-in, desktop Welcome, desktop orientation and desktop returning sign-in. Evidence: `.sdd/evidence/hackathon-ui/2026-10-25-mobile-onboarding-spacing.png` and `2026-10-25-desktop-onboarding-spacing.png`. `npm run build:app` and `git diff --check` passed. Physical phone safe-area behavior and real passkey completion were not tested in this layout pass.
