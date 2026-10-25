window.productionTasks = {
  "updated": "25 October 2026",
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
          "next": "Latest sign-in experience is live; refresh the app to receive it."
        },
        {
          "title": "Open the journal after sign-in",
          "status": "Implemented and live",
          "detail": "Verified authentication now opens the journal directly. Sign out is in the account menu.",
          "next": "No separate continuation screen is required."
        },
        {
          "title": "Owner-scoped ordinary journal",
          "status": "Implemented",
          "detail": "Cloud save, load, add and same-ID edit are implemented with owner and record-shape checks.",
          "next": "Continue acceptance on the owner’s device."
        },
        {
          "title": "Editable starter entries",
          "status": "Implemented and tested",
          "detail": "Three fictional starter entries are copied once into each account as ordinary editable entries. Existing edits and deletions are preserved across sign-ins.",
          "next": "Confirm the owner’s account experience on device."
        },
        {
          "title": "Firebase configuration guardrails",
          "status": "Implemented and checked",
          "detail": "Local staged-change and pre-deploy checks limit unintended Firebase configuration changes. They are not a spending cap.",
          "next": "Artifact cleanup and actual usage remain operational follow-ups."
        },
        {
          "title": "Product goal and flows",
          "status": "Documented",
          "detail": "The consolidated product direction, user flows and data responsibilities are recorded alongside implementation.",
          "next": "Keep the goal and progress tracker aligned as features are delivered."
        },
        {
          "title": "Branding and logo",
          "status": "Implemented and live",
          "detail": "The main app uses the selected logo and branding assets.",
          "next": "Continue the page-by-page visual and accessibility refinements separately."
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
          "next": "On a native phone, check capture, save, reopen, lock and storage-failure behaviour. Browser data loss can mean loss of access; cross-device recovery is not implied."
        },
        {
          "title": "Record revisions and history",
          "status": "Implemented · controls remain",
          "detail": "Appended revisions and source relationships are present; local integrity/session checks exist.",
          "next": "Add export, deletion and retention controls, plus stronger evidence metadata and media lifecycle."
        },
        {
          "title": "Paragraph privacy",
          "status": "Implemented · device check pending",
          "detail": "A paragraph can be revealed or edited while other paragraphs stay concealed; preview/history reveal is explicit.",
          "next": "Check the target-device interaction and assess contextual scrubbing."
        },
        {
          "title": "Private entry and exit",
          "status": "Implemented · device check pending",
          "detail": "Passkey step-up, private writing, quick exit and Escape/background/expiry cleanup are integrated. Save is explicit; unsaved drafts are not durable autosaves.",
          "next": "Check draft behaviour, keyboard use, interruption and concealment on phone."
        },
        {
          "title": "Privacy transformation",
          "status": "Partial",
          "detail": "Configured entity replacements and narrative distancing are implemented.",
          "next": "Add broader personal/contextual risk detection, correction continuity and language-specific quality evaluation."
        },
        {
          "title": "Trusted contacts",
          "status": "Partial",
          "detail": "Names and phone numbers are encrypted before cloud storage, with an encryption key held in the browser. Explicit phone links are available.",
          "next": "Implement invitations, authenticated sharing and permission enforcement."
        },
        {
          "title": "Disclosure and companion contracts",
          "status": "Partial",
          "detail": "Typed local scope, source/revision/purpose and permission-policy functions exist.",
          "next": "Add user-facing disclosure review, recipients, key delivery, revocation and audit integration."
        },
        {
          "title": "Search and library",
          "status": "Existing surface · boundaries need validation",
          "detail": "Browse, search and filter surfaces exist.",
          "next": "Validate ordinary/private record boundaries and complete useful notes, tasks and settings flows."
        },
        {
          "title": "Authentication diagnostics and recovery",
          "status": "Server code tested · not published",
          "detail": "Safe server diagnostics and post-registration recovery code are tested. The client recovery UI is included in the latest app; server changes remain unpublished.",
          "next": "Decide deliberately whether the diagnostic code is required in a later release."
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
          "next": "Record results and limitations after the device journey."
        },
        {
          "title": "Durable urgent capture",
          "status": "Planned",
          "detail": "Reliable autosave/restart behaviour, storage-quota errors and interrupted-operation handling.",
          "next": "Design and verify recovery from interruption and low storage."
        },
        {
          "title": "Offline startup and private capture",
          "status": "Planned",
          "detail": "App startup and a deliberately designed offline unlock/capture path; browser persistence alone is insufficient.",
          "next": "Define supported offline behaviours and key boundaries."
        },
        {
          "title": "Image, camera and audio capture",
          "status": "Planned",
          "detail": "Exact-byte storage, metadata and predictable stop/save/exit behaviour for media.",
          "next": "Implement and verify synthetic capture and retrieval."
        },
        {
          "title": "Export, deletion, retention and recovery",
          "status": "Planned",
          "detail": "Private-record export, deletion/retention controls, encrypted backup, recovery and tested restore/cross-device key transfer.",
          "next": "Define the key lifecycle and test restore before claiming recovery."
        },
        {
          "title": "Direct and indirect risk detection",
          "status": "Planned",
          "detail": "Local PII/context-risk detection, editable concealment and redacted disclosure copies.",
          "next": "Evaluate quality; do not claim complete anonymisation."
        },
        {
          "title": "Decisions API integration",
          "status": "Planned",
          "detail": "Approved API operations through the privacy/disclosure boundary, with evaluations and cost authorization.",
          "next": "No provider transport is currently implemented."
        },
        {
          "title": "Companion access",
          "status": "Planned",
          "detail": "Invitations and acceptance, separate view/contribute/voice/backup permissions, statements, audit and revocation.",
          "next": "Enforce and verify each permission independently."
        },
        {
          "title": "Opt-in Trails",
          "status": "Planned",
          "detail": "Time-bounded location capture with separate active/history recipient permissions.",
          "next": "Define consent, retention and recipient boundaries."
        },
        {
          "title": "Verified support directory",
          "status": "Planned",
          "detail": "Maintained support directory and explicit contact/referral flows; professional integration is separate from a phone link.",
          "next": "Verify each resource and provide a clear user-controlled contact action."
        },
        {
          "title": "South African languages",
          "status": "Planned",
          "detail": "Interface languages, mixed-language processing, translation/transcription and original-language preservation by operation.",
          "next": "Evaluate with representative language examples."
        },
        {
          "title": "Notes, tasks, settings and visual/accessibility work",
          "status": "Planned",
          "detail": "Complete ordinary organisation flows and the latest page-by-page visual, accessibility and responsive work.",
          "next": "Follow the current owner design direction and verify touch, keyboard and narrow/wide layouts."
        },
        {
          "title": "Daily mock content",
          "status": "Open decision",
          "detail": "Resolve daily mock-content behaviour against one-time editable starters before adding generation or a scheduler.",
          "next": "Keep generated content out of evidence and statistics."
        },
        {
          "title": "Artifact cleanup and actual usage",
          "status": "Operational follow-up",
          "detail": "Verify live artifact cleanup and actual usage/billing; guardrails do not establish a zero bill or working retention policy.",
          "next": "Record observed operational evidence."
        },
        {
          "title": "Later extensions",
          "status": "Later",
          "detail": "Verified professional access, governed genuine aggregate research and platform-supported alternate native app icons.",
          "next": "No invented statistics, diagnosis or emergency-dispatch claims."
        }
      ]
    }
  ]
};
