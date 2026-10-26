# Local private image and audio capture

Private writing supports local image selection (with a mobile environment-camera hint) and explicit microphone recording. Both reuse the existing writing-card tools and private record list. Captures save as separate immutable originals; text drafts and revision history remain separate. To inspect saved media, open Private writing, select its record and choose Reveal media. Conceal or Quick exit releases playback and object URLs.

Exact selected bytes/browser-encoded recording bytes and metadata are encrypted in IndexedDB. Maximum25 MiB per item; microphone stop is scheduled after about60 seconds. Failed storage supports retry while the page stays open. Leaving discards an unfinished recording; an uncommitted capture may be lost on interruption. Original file names, device time and approximate elapsed recording duration are metadata, not verified evidence of when or how an event happened.

No cloud/media/model transport or backup is configured. Browser-held keys are not passkey-derived; loss of browser data can lose records. Native codec/preview support varies; an unreadable preview does not change the encrypted original. Ordinary attachments and media/text revision association remain open.

Local verification:93 focused tests, hosted main-only build and Firebase guard pass. Synthetic image picker/save/reload/reveal/conceal/exit was observed with actual components. Native camera, microphone, phone and authenticated app acceptance remain pending. No deployment. Detailed assessment/evidence: `.sdd/reports/private-media/2026-10-26-review.md`, `.sdd/evidence/private-media/`.
