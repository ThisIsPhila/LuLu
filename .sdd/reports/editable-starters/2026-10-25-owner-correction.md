# Ordinary starter entries and hosting correction

Owner clarification supersedes the shared read-only sample UI and published frame. Only main app is deployed. Local previews and internal review materials remain preserved locally.

Two Luna High agents implemented one-time per-account template copying, ordinary updates and UI integration. Parent reviewed and hardened marker schemas and hosting-output guards. Template source is the existing Firestore catalogue; user copies are ordinary owner-private unprotected records. Same-ID edits preserve kind, creation time and protection state. New records use normal personal save. Protected records are not silently edited/demoted through the ordinary editor.

A transaction creates only missing starter records and a create-only owner marker. Emulator tests cover concurrent initialization, edited/deleted records on repeat initialization, existing ID collisions, cross-user marker access, invalid marker schema and immutable marker updates/deletes. Eleven persistence/security tests and eleven Firebase guard tests pass; main-app build passes. No cloud mutation of existing user records was performed by the agent. Users initialize their own account through authenticated runtime operations.

Native phone passkey/token exchange and actual device acceptance remain pending owner testing. Source and documentation preserved for the new owner-requested Product Implementation chat; formal SDD remains paused. Deployment evidence is saved after completion under ../../evidence/editable-starters/.
