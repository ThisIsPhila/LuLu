# Onboarding visual consistency pass

Date: 2026-10-25. Local implementation; no deployment.

The earlier spacing review missed screen-to-screen differences. Desktop used a black logo while mobile used a white one, the first introduction used a second image on desktop, and cover captions appeared on different screens by viewport. Sign-in also had a decorative passkey card that create-passkey lacked. The security note appeared before passkeys were introduced, and sign-in showed an inactive help control when no help action was supplied.

`OnboardingAuth` now uses one white brand asset with a soft shadow on both sizes. The first introduction uses its writing photograph as the shared cover image. The cover caption appears on Welcome only. Create and sign-in use the same content structure and actions. The security note appears on those authentication screens only. The introduction uses the header back control, and sign-in help is rendered only when its action exists. These rules remain in the component stylesheet.

Reviewed Welcome, both introduction steps, create-passkey, and sign-in in the current mobile preview; reviewed the same desktop flow, including the desktop sign-in view after the changes. Saved screenshots: `.sdd/evidence/hackathon-ui/2026-10-25-mobile-signin-consistency.png` and `.sdd/evidence/hackathon-ui/2026-10-25-desktop-signin-consistency.png`. `npm run build:app` and `git diff --check` passed. The build reports the existing large bundle warning. Real passkey completion and physical-device safe areas were outside this visual pass.

## Light primary action correction

The owner questioned the solid charcoal primary buttons and directed the onboarding toward whites. Changed the shared `.oa-primary` component rule to a warm ivory gradient with dark ink text, a soft stone edge and material shadow. Hover and press states retain the light surface. This applies to Welcome, orientation, create-passkey, sign-in and the success action without changing the app-wide button styles. The project-specific LuLu design references in `docs/design/README.md` and the brand kit govern this choice; the generic `design-direction` skill describes a different product and is not a LuLu source of authority.

Reviewed the live sign-in action in 390px mobile and desktop frames. Evidence: `.sdd/evidence/hackathon-ui/2026-10-25-mobile-ivory-button.png` and `.sdd/evidence/hackathon-ui/2026-10-25-desktop-ivory-button.png`. `npm run build:app` and `git diff --check` passed after the CSS change. No real passkey ceremony was invoked.
