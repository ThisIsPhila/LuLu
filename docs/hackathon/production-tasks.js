window.productionTasks = {
  "updated": "26 October 2026",
  "source": "../product/2026-10-25-task-status.md",
  "sections": [
    {
      "id": "verified",
      "title": "Implemented and verified",
      "summary": "Implementation or live evidence is recorded. This does not imply owner acceptance of the full product.",
      "tasks": [
        {
          "title": "Main app hosting and sign-in",
          "status": "Verified live",
          "detail": "Only the main app is hosted. Passkey registration and returning sign-in passed an isolated live test; the owner confirms native sign-in works.",
          "next": "Latest sign-in experience is live; refresh the app to receive it.",
          "done": true
        },
        {
          "title": "Open the journal after sign-in",
          "status": "Implemented and live",
          "detail": "Verified authentication now opens the journal directly. Sign out is in the account menu.",
          "next": "No separate continuation screen is required.",
          "done": true
        },
        {
          "title": "Owner-scoped ordinary journal",
          "status": "Implemented",
          "detail": "Cloud save, load, add and same-ID edit/reclassification are implemented with owner and record-shape checks. Existing composer Options select Journal/Story, export a whitelisted saved-source JSON copy, and confirm deletion of one ordinary entry. Eight local emulator cases cover write/delete scope and denial paths; two export whitelist tests pass.",
          "next": "Verify the existing Options flow and ordinary entry lifecycle on the owner’s device; this slice is local and not deployed.",
          "done": true
        },
        {
          "title": "Editable starter entries",
          "status": "Implemented and tested",
          "detail": "Three fictional starter entries are copied once into each account as ordinary editable entries. Existing edits and deletions are preserved across sign-ins.",
          "next": "Confirm the owner’s account experience on device.",
          "done": true
        },
        {
          "title": "Firebase configuration guardrails",
          "status": "Implemented and checked",
          "detail": "Local staged-change and pre-deploy checks limit unintended Firebase configuration changes. They are not a spending cap.",
          "next": "Artifact cleanup and actual usage remain operational follow-ups.",
          "done": true
        },
        {
          "title": "Product goal and flows",
          "status": "Documented",
          "detail": "The consolidated product direction, user flows and data responsibilities are recorded alongside implementation.",
          "next": "Keep the goal and progress tracker aligned as features are delivered.",
          "done": true
        },
        {
          "title": "Branding and logo",
          "status": "Implemented and live",
          "detail": "The main app uses the selected logo and branding assets.",
          "next": "Continue the page-by-page visual and accessibility refinements separately.",
          "done": true
        }
      ]
    },
    {
      "id": "acceptance",
      "title": "Implemented; acceptance or follow-up remains",
      "summary": "These capabilities exist in the current implementation, with device checks, product controls, or additional evidence still outstanding.",
      "tasks": [
        {
          "title": "Private text records",
          "status": "Implemented · device check pending",
          "detail": "Encrypted local save, list, reopen and original-text retention are integrated.",
          "next": "On a native phone, check capture, save, reopen, lock and storage-failure behaviour. Optional per-record backup restore requires the same account and file passphrase; it is not automatic or account recovery.",
          "done": false
        },
        {
          "title": "Record revisions and history",
          "status": "Implemented · phone and lifecycle checks remain",
          "detail": "Appended revisions, local integrity checks, readable export, scoped deletion and encrypted per-record backup/restore are integrated.",
          "next": "Verify on native phones; ordinary/cloud lifecycle, scheduled retention, and stronger evidence/media lifecycle remain open.",
          "done": false
        },
        {
          "title": "Paragraph privacy",
          "status": "Implemented · device check pending",
          "detail": "A paragraph can be revealed or edited while other paragraphs stay concealed; preview/history reveal is explicit.",
          "next": "Check the target-device interaction and assess contextual scrubbing.",
          "done": false
        },
        {
          "title": "Private entry and exit",
          "status": "Implemented · device check pending",
          "detail": "Passkey step-up, private writing, quick exit and Escape/background/expiry cleanup are integrated. Save is explicit; unsaved drafts are not durable autosaves.",
          "next": "Check draft behaviour, keyboard use, interruption and concealment on phone.",
          "done": false
        },
        {
          "title": "Privacy transformation",
          "status": "Partial",
          "detail": "Configured entity replacements and narrative distancing are implemented.",
          "next": "Add broader personal/contextual risk detection, correction continuity and language-specific quality evaluation.",
          "done": false
        },
        {
          "title": "Trusted contacts",
          "status": "Partial",
          "detail": "Names and phone numbers are encrypted before cloud storage, with an encryption key held in the browser. Explicit phone links are available.",
          "next": "Implement invitations, authenticated sharing and permission enforcement.",
          "done": false
        },
        {
          "title": "Disclosure and companion contracts",
          "status": "Partial",
          "detail": "Typed local scope, source/revision/purpose and permission-policy functions exist.",
          "next": "Add user-facing disclosure review, recipients, key delivery, revocation and audit integration.",
          "done": false
        },
        {
          "title": "Search and library",
          "status": "Existing surface · boundaries need validation",
          "detail": "Local Home/Leaves search and type filters work across titles, writing and tags. Protected records are excluded from ordinary lists, counts and matches; synthetic browser and 60 focused regression tests pass.",
          "next": "Verify authenticated phone journeys and complete useful notes, tasks and settings flows within the established UI.",
          "done": false
        },
        {
          "title": "Authentication diagnostics and recovery",
          "status": "Server code tested · not published",
          "detail": "Safe server diagnostics and post-registration recovery code are tested. The client recovery UI is included in the latest app; server changes remain unpublished.",
          "next": "Decide deliberately whether the diagnostic code is required in a later release.",
          "done": false
        }
      ]
    },
    {
      "id": "planned",
      "title": "Planned work and open follow-ups",
      "summary": "Remaining product work, decisions and operations. Status labels identify which items are planned, open or later; later goals have not been dropped.",
      "tasks": [
        {
          "title": "Complete owner-device acceptance",
          "status": "Next",
          "detail": "Check ordinary edits, private save/reopen/history, quick exit and record isolation on the owner’s phone.",
          "next": "Record results and limitations after the device journey.",
          "done": false
        },
        {
          "title": "Durable urgent capture",
          "status": "Implemented locally; phone acceptance pending",
          "detail": "Encrypted versioned autosave/recovery, atomic save, conflict/quota retry and lost-acknowledgement handling pass local tests. Only completed autosaves are recoverable.",
          "next": "Verify authenticated device restart, storage pressure and interruption behavior; no offline unlock or key recovery is implied.",
          "done": false
        },
        {
          "title": "Offline startup and private capture",
          "status": "Static shell local; offline authorization pending",
          "detail": "Production app-shell caching is implemented; existing screens loaded with the local origin server stopped. Nine worker tests and sixty regressions pass. Records/auth/API responses are excluded; no layout changes.",
          "next": "Implement prior online device/account provisioning and fresh local cryptographic verification for offline capture; keep server authentication intact. Deployment and phone tests remain pending.",
          "done": false
        },
        {
          "title": "Image, camera and audio capture",
          "status": "Private capture local; hardware acceptance pending",
          "detail": "Private image picker/camera hint and microphone capture save encrypted exact-byte originals. Existing record list supports concealed reopen/reveal; stop/exit cleanup and quota rollback/retry are implemented.93 focused tests and synthetic image save/reload/reveal/exit pass.",
          "next": "Verify native camera/microphone/codecs and authenticated phones; implement ordinary attachments and text/media association. No deployment or backup is claimed.",
          "done": false
        },
        {
          "title": "Export, deletion, retention and recovery",
          "status": "Local export/deletion and per-record encrypted backup implemented; acceptance pending",
          "detail": "Existing private journal flow exports readable copies, confirms scoped local deletion, and backs up/restores one saved text history or media original in a password-encrypted file. Restore is same-account, re-encrypts with the current device key and never overwrites conflicting IDs. Ordinary composer options now export a whitelisted saved-source copy and delete one owner-scoped ordinary entry after acknowledgement; local emulator and export tests pass. Private backup still excludes drafts, unsaved edits, the whole vault, passkeys and device keys.",
          "next": "Verify both flows on native phones; scheduled retention and broader cloud lifecycle remain open. This ordinary-actions slice is local and not deployed.",
          "done": false
        },
        {
          "title": "Direct and indirect risk detection",
          "status": "Planned",
          "detail": "Local PII/context-risk detection, editable concealment and redacted disclosure copies.",
          "next": "Evaluate quality; do not claim complete anonymisation.",
          "done": false
        },
        {
          "title": "Decisions API integration",
          "status": "Planned",
          "detail": "Approved API operations through the privacy/disclosure boundary, with evaluations and cost authorization.",
          "next": "No provider transport is currently implemented.",
          "done": false
        },
        {
          "title": "Companion access",
          "status": "Planned",
          "detail": "Invitations and acceptance, separate view/contribute/voice/backup permissions, statements, audit and revocation.",
          "next": "Enforce and verify each permission independently.",
          "done": false
        },
        {
          "title": "Opt-in Trails",
          "status": "Planned",
          "detail": "Time-bounded location capture with separate active/history recipient permissions.",
          "next": "Define consent, retention and recipient boundaries.",
          "done": false
        },
        {
          "title": "Verified support directory",
          "status": "Planned",
          "detail": "Maintained support directory and explicit contact/referral flows; professional integration is separate from a phone link.",
          "next": "Verify each resource and provide a clear user-controlled contact action.",
          "done": false
        },
        {
          "title": "South African languages",
          "status": "Planned",
          "detail": "Interface languages, mixed-language processing, translation/transcription and original-language preservation by operation.",
          "next": "Evaluate with representative language examples.",
          "done": false
        },
        {
          "title": "Notes, tasks, settings and visual/accessibility work",
          "status": "Planned",
          "detail": "Complete ordinary organisation flows and the latest page-by-page visual, accessibility and responsive work.",
          "next": "Follow the current owner design direction and verify touch, keyboard and narrow/wide layouts.",
          "done": false
        },
        {
          "title": "Daily mock content",
          "status": "Open decision",
          "detail": "Resolve daily mock-content behaviour against one-time editable starters before adding generation or a scheduler.",
          "next": "Keep generated content out of evidence and statistics.",
          "done": false
        },
        {
          "title": "Artifact cleanup and actual usage",
          "status": "Operational follow-up",
          "detail": "Verify live artifact cleanup and actual usage/billing; guardrails do not establish a zero bill or working retention policy.",
          "next": "Record observed operational evidence.",
          "done": false
        },
        {
          "title": "Later extensions",
          "status": "Later",
          "detail": "Verified professional access, governed genuine aggregate research and platform-supported alternate native app icons.",
          "next": "No invented statistics, diagnosis or emergency-dispatch claims.",
          "done": false
        }
      ]
    }
  ]
};
