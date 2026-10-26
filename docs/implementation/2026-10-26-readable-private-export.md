# Readable private export

Open a saved local record in Private writing. Choose Export readable record (text) or Export original media, review the scope, then Download readable copy. Preparation alone does not download.

Text exports contain the saved original and all saved revisions in readable JSON, including source links, content and recorded digests. Unsaved draft edits are excluded. Media exports contain the exact original file bytes; app metadata is not bundled. Filenames are generic. Export time comes from the device clock.

These files are unencrypted. Anyone with a downloaded file can read it, and Quick exit cannot hide it. This is not an encrypted backup or a restore/key-recovery mechanism. Cancel or exit discards the prepared in-app copy; stored originals remain unchanged.

98 focused tests, hosted main-only build and Firebase guard pass. Actual-component synthetic text/image downloads were inspected; exported image bytes matched the original. Local records only; ordinary/legacy-cloud export and phone/native download acceptance remain pending. No deployment. Detailed evidence: `.sdd/evidence/private-export/`, assessment `.sdd/reports/private-export/2026-10-26-review.md`.
