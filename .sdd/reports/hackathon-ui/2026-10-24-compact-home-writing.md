# Owner-directed compact home and writing layout

Implemented 24 October 2026 under the active build-first exception.

- Removed the home Protected category, vault status/enclave label, and distinctive protected-entry badges. Journal and Stories now use reusable compact stacks that expand through semantic buttons with aria-expanded and aria-controls. Reading an entry remains a separate action after expansion. Existing reflection, logo and navigation retained; vault entrance retained per owner direction.
- Home search searches visible title/body text instead of routing to the removed Protected filter.
- Composer now places the editable natural text in a bottom dock, with transformed text and an expandable representation ledger above. Preview text derives from the input. The alternate protected-writing surface also has an editable bottom input.
- Headers respect viewport safe-area insets; writing-header branding sits alongside the back control rather than centred. VisualViewport resize/scroll keeps writing within the keyboard-visible area.

Verification: TypeScript and Vite app build passed. Browser observed stacks closed by default and Journal expanding to three entry buttons. Firebase MCP deployment job 1792867145857 succeeded; Hosting version 869a7827d1480502. Live site loaded the new home. In the live composer, synthetic input “David visited my place.” updated the preview to “John visited Blue Moon.” without saving. Captures under .sdd/evidence/firebase-hosting/compact-home.png and keyboard-first-composer.png.

Limits: safe-area and VisualViewport behavior implemented, but a physical iPhone keyboard/notch was not available for verification. Existing sample names/dates, demonstration security labels elsewhere, backend integration, and transformation-language quality remain outside this visual correction. Preserved framed demo was not modified.
