window.productionTasks = {
  "updated": "26 October 2026",
  "source": "#current-progress",
  "sections": [
    {
      "id": "verified",
      "title": "Implemented and verified",
      "summary": "Implementation or live evidence is recorded. This does not imply owner acceptance of the full product.",
      "tasks": [
        {
          "title": "Main app hosting and sign-in",
          "status": "Deployed · email/passkey verified",
          "detail": "Main app is live at lulu.thisisphila.co.za. Synthetic email/password and passkey registration/login/session checks passed; passkey private step-up passed and test records were cleaned.",
          "next": "The missing Google callback is saved; interactive Google/native acceptance remains open.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Open the journal after sign-in",
          "status": "Implemented and live",
          "detail": "Verified authentication now opens the journal directly. Sign out is in the account menu.",
          "next": "No separate continuation screen is required.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Owner-scoped ordinary journal",
          "status": "Implemented",
          "detail": "Cloud save, load, add and same-ID edit/reclassification are implemented with owner and record-shape checks. Existing composer Options select Journal/Story, export a whitelisted saved-source JSON copy, and confirm deletion of one ordinary entry. Eight local emulator cases cover write/delete scope and denial paths; two export whitelist tests pass. Local synthetic browser review observed Story edit, saved-source download and scoped delete confirmation; no destructive browser click was made.",
          "next": "Verify the existing Options flow and ordinary entry lifecycle on the owner’s device; this source is released, while owner-device acceptance remains open.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Editable starter entries",
          "status": "Implemented and tested",
          "detail": "Three fictional starter entries are copied once into each account as ordinary editable entries. Existing edits and deletions are preserved across sign-ins.",
          "next": "Confirm the owner’s account experience on device.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Firebase configuration guardrails",
          "status": "Implemented and checked",
          "detail": "Existing staged/predeploy checks remain. The Johannesburg function artifact repository now deletes container images older than 14 days.",
          "next": "Monitor actual usage; guardrails and cleanup are not a hard spending cap.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Product goal and flows",
          "status": "Documented",
          "detail": "The consolidated product direction, user flows and data responsibilities are recorded alongside implementation.",
          "next": "Keep the goal and progress tracker aligned as features are delivered.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Branding and logo",
          "status": "Implemented and live",
          "detail": "The main app uses the selected logo and branding assets.",
          "next": "Continue the page-by-page visual and accessibility refinements separately.",
          "done": true,
          "state": "done"
        },
        {
          "title": "Build and install native debug packages",
          "status": "Recorded build, install and launch commands passed",
          "detail": "Capacitor iOS/Android shells and app-only bundle are present. Android debug install/launch commands passed; a signed LuLu app installed and launched on the physical iPhone after a free-profile slot was released.",
          "next": "Check the visible UI and complete the separate authenticated native journey; installation/process launch does not establish usable screens or feature acceptance.",
          "done": true,
          "state": "done"
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
          "done": false,
          "state": "verification"
        },
        {
          "title": "Record revisions and history",
          "status": "Implemented · phone and lifecycle checks remain",
          "detail": "Appended revisions, local integrity checks, readable export, scoped deletion and encrypted per-record backup/restore are integrated.",
          "next": "Verify on native phones; ordinary/cloud lifecycle, scheduled retention, and stronger evidence/media lifecycle remain open.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Paragraph privacy",
          "status": "Implemented · device check pending",
          "detail": "A paragraph can be revealed or edited while other paragraphs stay concealed; preview/history reveal is explicit.",
          "next": "Check the target-device interaction and assess contextual scrubbing.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Private entry and exit",
          "status": "Implemented · device check pending",
          "detail": "Passkey step-up, private writing, quick exit and Escape/background/expiry cleanup are integrated. Encrypted local autosave and restart recovery now exist; only completed snapshots are recoverable.",
          "next": "Check draft behaviour, keyboard use, interruption and concealment on phone.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Privacy transformation",
          "status": "Partial",
          "detail": "The private representation inspector now lists only user-configured references and saves confirmed changes in an owner/session-bound encrypted local store. Add/Change/Keep are staged until Confirm; the private composer draft stays mounted across the inspector route. Broader automatic recognition is not implemented; TypeScript passes and the manual app check remains pending.",
          "next": "Verify add/change/keep/persist and draft continuity in the working app; later evaluate broader risk detection, correction continuity and language-specific quality.",
          "done": false,
          "state": "partial"
        },
        {
          "title": "Trusted contacts",
          "status": "Partial",
          "detail": "Names and phone numbers are encrypted before cloud storage, with an encryption key held in the browser. Explicit phone links are available.",
          "next": "Implement invitations, authenticated sharing and permission enforcement.",
          "done": false,
          "state": "partial"
        },
        {
          "title": "Disclosure and companion contracts",
          "status": "Partial",
          "detail": "Typed local scope, source/revision/purpose and permission-policy functions exist.",
          "next": "Add user-facing disclosure review, recipients, key delivery, revocation and audit integration.",
          "done": false,
          "state": "partial"
        },
        {
          "title": "Search and library",
          "status": "Implemented locally · acceptance pending",
          "detail": "Library searches ordinary entries, notes and tasks. Entries filter by collection, favorite and saved topics; Notes/Tasks support account-owned create/edit/delete and task completion. Firebase service uses the signed-in UID, Firestore rules bound the records, and the local-development store is isolated.",
          "next": "Validate ordinary/private boundaries on the working app; deploy rules only through the authorized release process and complete target-device acceptance.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Authentication diagnostics and recovery",
          "status": "API deployed",
          "detail": "The current Johannesburg API, safe diagnostics, registration recovery and provider-session/native-exchange routes are deployed.",
          "next": "Complete interactive Google and owner-device acceptance.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Native authenticated journal journey",
          "status": "Installed · UI and sign-in acceptance pending",
          "detail": "Package installation and process launch are recorded on Android and iPhone. The earlier iPhone simulator screenshot is black; no later usable screen or signed-in journal journey is recorded.",
          "next": "Confirm visible UI, sign-in, ordinary create/edit/restart persistence, private step-up/save/reopen and quick exit on the available phones.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Email/password, Google and native auth bridge",
          "status": "Deployed · Google callback corrected; acceptance pending",
          "detail": "Email/password and Google providers are enabled and the hosted bridge/API are deployed. Live email and passkey session checks passed. Owner reported Google redirect_uri_mismatch.",
          "next": "Product Implementation on Luna High saved the missing Google callback; native end-to-end acceptance remains open.",
          "done": false,
          "state": "verification"
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
          "done": false,
          "state": "verification"
        },
        {
          "title": "Durable urgent capture",
          "status": "Implemented locally; phone acceptance pending",
          "detail": "Encrypted versioned autosave/recovery, atomic save, conflict/quota retry and lost-acknowledgement handling pass local tests. Only completed autosaves are recoverable.",
          "next": "Verify authenticated device restart, storage pressure and interruption behavior; no offline unlock or key recovery is implied.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Offline startup and private capture",
          "status": "Static shell deployed; offline authorization pending",
          "detail": "Production app-shell caching is implemented; existing screens loaded with the local origin server stopped. Nine worker tests and sixty regressions pass. Records/auth/API responses are excluded; no layout changes.",
          "next": "Implement prior online device/account provisioning and fresh local cryptographic verification for offline capture; keep server authentication intact. Phone tests remain pending.",
          "done": false,
          "state": "partial"
        },
        {
          "title": "Image, camera and audio capture",
          "status": "Private capture local; hardware acceptance pending",
          "detail": "Private image picker/camera hint and microphone capture save encrypted exact-byte originals. Existing record list supports concealed reopen/reveal; stop/exit cleanup and quota rollback/retry are implemented.93 focused tests and synthetic image save/reload/reveal/exit pass.",
          "next": "Verify native camera/microphone/codecs and authenticated phones; ordinary attachments and text/media association remain open. This source is released; per-record encrypted backup now exists separately.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Export, deletion, retention and recovery",
          "status": "Local export/deletion and per-record encrypted backup implemented; acceptance pending",
          "detail": "Existing private journal flow exports readable copies, confirms scoped local deletion, and backs up/restores one saved text history or media original in a password-encrypted file. Restore is same-account, re-encrypts with the current device key and never overwrites conflicting IDs. Ordinary composer options now export a whitelisted saved-source copy and delete one owner-scoped ordinary entry after acknowledgement; local emulator and export tests pass. Private backup still excludes drafts, unsaved edits, the whole vault, passkeys and device keys.",
          "next": "Verify both flows on native phones; scheduled retention and broader cloud lifecycle remain open. This ordinary-actions slice is local and not deployed.",
          "done": false,
          "state": "verification"
        },
        {
          "title": "Direct and indirect risk detection",
          "status": "Planned",
          "detail": "Local PII/context-risk detection, editable concealment and redacted disclosure copies.",
          "next": "Evaluate quality; do not claim complete anonymisation.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Decisions API integration",
          "status": "Planned",
          "detail": "Approved API operations through the privacy/disclosure boundary, with evaluations and cost authorization.",
          "next": "No provider transport is currently implemented.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Companion access",
          "status": "Planned",
          "detail": "Invitations and acceptance, separate view/contribute/voice/backup permissions, statements, audit and revocation.",
          "next": "Enforce and verify each permission independently.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Opt-in Trails",
          "status": "Planned",
          "detail": "Time-bounded location capture with separate active/history recipient permissions.",
          "next": "Define consent, retention and recipient boundaries.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Verified support directory",
          "status": "Planned",
          "detail": "Maintained support directory and explicit contact/referral flows; professional integration is separate from a phone link.",
          "next": "Verify each resource and provide a clear user-controlled contact action.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "South African languages",
          "status": "Planned",
          "detail": "Interface languages, mixed-language processing, translation/transcription and original-language preservation by operation.",
          "next": "Evaluate with representative language examples.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Notes, tasks, settings and visual/accessibility work",
          "status": "Planned",
          "detail": "Complete ordinary organisation flows and the latest page-by-page visual, accessibility and responsive work.",
          "next": "Follow the current owner design direction and verify touch, keyboard and narrow/wide layouts.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Daily mock content",
          "status": "Open decision",
          "detail": "Resolve daily mock-content behaviour against one-time editable starters before adding generation or a scheduler.",
          "next": "Keep generated content out of evidence and statistics.",
          "done": false,
          "state": "decision"
        },
        {
          "title": "Artifact cleanup and actual usage",
          "status": "Operational follow-up",
          "detail": "Verify live artifact cleanup and actual usage/billing; guardrails do not establish a zero bill or working retention policy.",
          "next": "Record observed operational evidence.",
          "done": false,
          "state": "planned"
        },
        {
          "title": "Later extensions",
          "status": "Later",
          "detail": "Verified professional access, governed genuine aggregate research and platform-supported alternate native app icons.",
          "next": "No invented statistics, diagnosis or emergency-dispatch claims.",
          "done": false,
          "state": "later"
        },
        {
          "title": "Fourteen-screen onboarding flow",
          "status": "Ready for UI Design · flow decision open",
          "detail": "Four source boards and the full readable flow are saved. The current five-part auth flow is distinct. The proposed first entry at screen 6 precedes actual enrollment at screen 14.",
          "next": "Resolve auth order, secure temporary draft handling, Skip/back/resume and existing-user routing; develop the presentation from the final brand/component references.",
          "done": false,
          "state": "design"
        },
        {
          "title": "Contextual representation editor",
          "status": "Implemented locally · acceptance pending",
          "detail": "The inspector lists only owner-configured references, stages Add/Change/Keep original, derives match counts from current draft text, and confirms encrypted owner/session-bound local storage. Private composer draft state remains mounted while the inspector is open.",
          "next": "Accept Add/Change/Keep/persist and draft continuity in the working app; broader PII/context detection and language-quality work remain separate.",
          "done": false,
          "state": "next"
        }
      ]
    }
  ]
};
