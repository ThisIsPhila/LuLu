# Phone readiness — 25 October 2026

Owner requested hosted phone testing, database-backed samples separated from personal records, and existing branding. Two Luna High agents implemented sample data/rules and App integration; parent reviewed query behavior, found a rules-not-filters failure, and requested a manifest plus individual-get contract. Revised isolated rules tests pass seven cases. Mapper tests pass two cases; domain tests pass16, device encryption2, guard tests10. Hosted app build passes. The old root entry fixture was removed; historical independent demo code remains local and unchanged.

Created exactly three synthetic records plus one manifest via Firebase MCP create-only preconditions. No personal records/credentials were altered. Guard passed before cloud writes/deployment. Firebase MCP published Firestore rules and Hosting version c351fa4f01598219 on the existing site. The current frame is included at /demo/, with correct hosted logo URL and no legacy/private document links. No new cloud services, billing changes or project moves.

Actual native passkey sign-in/token exchange and authenticated phone save/reopen require owner testing; not represented as completed. The internal library remains local pending the owner's answer about restricted hosting. Artifact cleanup and billing usage remain the previously recorded operational follow-ups.

Evidence under ../../evidence/phone-testing/; instructions in docs/operations/phone-testing.md. Formal phase progression remains paused.
