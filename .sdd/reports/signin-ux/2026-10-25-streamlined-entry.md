# Direct verified entry and account controls

Owner confirmed native passkey sign-in now works and requested removing the extra confirmation page and the sign-out-only left panel. Luna High implemented and parent reviewed immediate success callback handling. OnboardingAuth no longer has a success screen or Continue button; AuthBoundary opens the journal only after authenticate() returns a verified server session. Failure/cancellation and native passkey verification remain intact.

The shared checkout already contained the appropriate home-avatar Account menu with Sign out, and a protected-only Quick exit / Private writing action bar. Those existing changes were preserved rather than redesigned. No permanently rendered sign-out-only panel remains; private-mode exit controls remain available. No backend, IAM, billing or service change was needed for this UX adjustment.

Main-only hosted build and22 focused local private/vault regression tests pass; Firebase guard passes; git diff whitespace check passes. Authentication transport is unchanged. Earlier live synthetic authentication test and owner's native confirmation remain prior evidence; no new native phone success is falsely claimed for the UX update. Hosting-only deployment evidence is under ../../evidence/signin-ux/.

Live release cf2ca69e213e14dd was verified against recorded build.txt, script index-yjNOUhN3.js. Live JS has no old Continue-to-LuLu screen and contains the verified-auth callback and avatar menu. A later concurrent local build changed dist/app (index-ChoiOnQl.js), so an initial comparison against that mutable directory failed; the recorded assessed build is the correct evidence reference. No redeploy was needed for that comparison mismatch.
