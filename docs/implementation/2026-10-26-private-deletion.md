# Local private deletion

Open a saved record in Private writing, choose its deletion action, review the exact scope, acknowledge it and explicitly confirm. Text deletion removes the original, all saved versions and linked recovery drafts from this browser. Media deletion removes the original binary/metadata pair. Cancellation does nothing; unsaved editor changes must be saved/reopened before preparing text deletion.

Changed records/drafts require a fresh confirmation. Deletion does not remove cloud records, downloaded exports, unrelated records or device encryption keys. It is permanent within this local feature; no restore/backup is configured yet.

118 focused tests and hosted build/main-only packaging/Firebase guard pass. Synthetic browser confirmation/cancel/exit was checked without clicking permanent deletion; actual atomic removal/rollback tests used fake IndexedDB. Phone/owner acceptance pending. No deployment. Assessment: `.sdd/reports/private-lifecycle/2026-10-26-review.md`.
