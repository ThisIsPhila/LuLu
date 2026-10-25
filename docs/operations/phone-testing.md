# Phone testing

Only the main application is hosted: https://khora-lulu-2026.web.app/ . Open it in the phone browser, not localhost. The interactive frame, historical prototype and internal document/media review library are local development tools and must never be included in Firebase Hosting output.

1. Begin with LuLu and create a passkey using the phone's native prompt, or sign in using an existing LuLu passkey. Successful verification opens the journal immediately; no second Continue action.
2. The journal starts with three fictional ordinary entries copied from Firestore into your account once. These are private to your account, editable, and not protected-mode records. There is no shared read-only Sample journal selector.
3. Open one entry, choose Edit, change its title/text and save. It must remain the same entry without creating a duplicate. Add a new ordinary entry too.
4. Refresh and sign in again with the same account; edits and additions should return from Firestore. On another supported device, use the same account/passkey; ordinary records are cloud-backed.
5. Protected mode remains separate: verify the passkey, use fictional test content, save and reopen in the same browser, then close private mode and confirm the original is hidden. Device-key recovery/cross-device private-original transfer is not implemented.

## Database separation

The source template remains at `demoCatalogues/johannesburg-v1` with three fictional template documents beneath `entries/`. It is not a second user-facing journal. At account startup, `ensureStarterEntries` atomically copies missing templates into `users/{uid}/entries/starter-johannesburg-v1-*`, with `protected:false`, and writes a one-time marker at `users/{uid}/starterCatalogues/johannesburg-v1`.

The marker prevents concurrent sign-ins from duplicating templates and prevents later sign-ins from resetting edits or restoring deleted starters. Existing colliding records are preserved. After copying, the owner can edit ordinary entries normally; changes never modify the source templates or another account. No mock content is hard-coded as a fallback in the active app. Failed initialization is visible with a retry action.

Owner-only journal rules apply to the starter copies exactly as to other ordinary entries. `users/{uid}/private/{id}` remains a separate encrypted-source/contacts boundary requiring recent private verification. The marker is owner-readable/create-only and strictly validated. Generated content must remain distinguishable for future evidence/analytics work; its provenance is available through the stable starter IDs/marker.

## Verification and limits

Local emulator tests exercise real initialization and editing transactions, including concurrent sign-ins, edit/deletion preservation and preexisting-record preservation. Live native-device passkey/token exchange and phone save/reopen still require owner testing. Some broader product functionality remains in development.

Blaze remains unchanged for its included free allowances. Read Firebase cost guardrails before resource changes. No additional project/site/database/function or billing change is required for these ordinary starters.

Sign out is in the existing home-avatar Account menu. There is no permanent sign-out rail/panel. Private-writing quick exit remains available while private mode is active.
