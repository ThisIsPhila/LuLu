# Mobile privacy and layout fixes — 2026-10-27

The supplied iPhone screenshots showed private-writing labels on ordinary screens, an unnecessarily narrow reader, excessive empty space in private composition, and text selection after holding the Lu control.

Changes restrict private controls to private surfaces, lock an active private session when navigating back to ordinary screens, restore the reader width, make a new empty private draft immediately editable without automatically opening the keyboard, compact the private composer, and prevent selection/callouts on the Lu control. Existing populated private drafts remain concealed until deliberately revealed.

Verification: the application build, Capacitor sync and signed iOS device build, and Android debug build succeeded. Forty-four privacy, draft, capture and component tests passed. A 390 × 844 local browser preview showed ordinary home, reader and composer without private labels and confirmed reader width. Device-specific touch and keyboard behavior still require hands-on verification. The Android device was disconnected. The iPhone build was ready for installation, pending closure of the running app to avoid interrupting a draft.

An automatic approval review rejected the attempt to open the local protected passkey flow for an interactive navigation check, citing lack of explicit authorization for the sign-in action. The editor initial state and privacy surface rules were independently verified by automated tests.
