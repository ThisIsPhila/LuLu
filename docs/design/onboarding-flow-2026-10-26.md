# LuLu onboarding flow — 26 October 2026

Working design record for the 14 pictured screens. The four source boards and both conversation exports are preserved in [`resources/2026-10-26-onboarding/`](resources/2026-10-26-onboarding/). They are design references and a record of the requested journey, not an implementation specification or proof that pictured capabilities exist.

## Flow at a glance

| Screens | Chapter | User outcome | Boundary |
| --- | --- | --- | --- |
| 1–3 | Personalise | Meet LuLu, optionally choose a name, select what help is relevant | Personalisation must not imply the name is remotely stored or that selections are commitments |
| 4–6 | First entry | Receive a welcome, choose a prompt, compose an ordinary first entry | A pre-enrolment draft needs an explicit, secure storage and recovery design |
| 7–10 | Private layer | Learn the distinction, see an access demonstration, conceal a paragraph, practise exit | Screens 7–10 are demonstrations; no real private authority is granted |
| 11–14 | Capture, understand, connect, secure | See capture formats, optional interpretation, support choices, then set up access | Screens 11–13 are capability illustrations; screen 14 is real passkey enrolment |

The first board visually labels screens 2 and 3 as “2 / 3” and “3 / 3”. The discussion explains this was misleading because the journey continues. Preserve the pictured design, but any implementation progress should use the global 14-screen sequence (1/14 through 14/14) or a clearly explained chapter indicator. The other boards already show global numbering.

## Screen-by-screen record

### Chapter 1 — Personalise (1–3)

#### 01 · Meet LuLu

- **Purpose:** Introduce the journal and its purpose.
- **Pictured headline/copy:** “Meet LuLu.” / “An ordinary journal with an extraordinary purpose.”
- **Action and controls:** Continue button with arrow; three short progress marks near the bottom. No Skip is pictured on screen 1.
- **Interaction/data:** Continue to screen 2. No user data is requested.
- **Visual treatment:** Full-bleed warm photograph of a journal, soft light and a plant; white LuLu wordmark and white editorial text over the image. This screen is more photographic than the later cards.

#### 02 · What should we call you?

- **Purpose:** Offer optional personalisation.
- **Pictured headline/copy:** “What should we call you?” / “Choose a name or nickname to make this space feel like yours.” The reassurance reads “This name stays on your device. It’s private and never shared.”
- **Action and controls:** Name field (placeholder “Your name”, example “e.g. Alex”); Skip; back arrow; Continue.
- **Interaction/data:** Entering a name personalises screen 4. Skip should continue with neutral copy. The pictured on-device storage and privacy statement is a claim to verify against the eventual storage path; do not repeat it in product UI unless it is true for that data on each supported client.
- **Visual treatment:** Warm ivory surface, black wordmark, large serif headline, bordered rounded input, soft reassurance panel and sage Continue button.

#### 03 · What brings you here today?

- **Purpose:** Let the user identify helpful starting areas.
- **Pictured headline/copy:** “What brings you here today?” / “Choose what you’d like LuLu to help with first.” Options: “Write privately — A safe space for your thoughts”; “Capture thoughts — Reflect on your day and feelings”; “Understand my options — Gain clarity with thoughtful guidance”; “Find support — Feel less alone on your journey”; “Save important moments — Keep track of what matters to you”.
- **Action and controls:** Five selectable cards, Skip, back arrow and Continue. The picture does not make the selection rule (single vs multi-select) explicit; source discussion calls this a multi-select experience.
- **Interaction/data:** Selections may tailor later prompt/support examples. Treat choices as preference data, not consent to share, seek help, use interpretation, or enable private mode. Skip should proceed with generic onboarding.
- **Visual treatment:** Five elevated ivory cards in a two-column arrangement with simple line icons, sage/sand icon grounds and a full-width final card.

### Chapter 2 — First entry (4–6)

#### 04 · Personal welcome

- **Purpose:** Connect the selected intentions to a personal welcome.
- **Pictured headline/copy:** “Thandi, you’re in the right place.” / “Whatever brings you here, there’s room for your story.” A privacy note reads “The name you choose stays on this device.”
- **Action and controls:** Skip, back arrow and “Let’s begin”. Global progress is 4 / 14.
- **Interaction/data:** Substitute the optional chosen name; if no name was provided, use a neutral greeting. Continue to screen 5. The personalisation promise inherits screen 2’s storage verification requirement.
- **Visual treatment:** Warm journal photograph and large white editorial text; translucent lower note and sage action.

#### 05 · Choose a starting point

- **Purpose:** Offer a low-pressure entry into writing.
- **Pictured headline/copy:** “Every story starts somewhere.” / “Choose a prompt to create your first entry.” Cards: “What feels important today?”, “Is there something you want to remember?”, “What has been on your mind lately?”, and “Start with a blank page.” Note: “Prompts can adapt to what brings you here as you continue.”
- **Action and controls:** Four selectable prompt cards, Skip, back and Continue. Selecting a prompt supplies an optional writing prompt on screen 6; the pictured Continue is the main path.
- **Interaction/data:** Selection should not force an answer. Adapt prompts only from screen 3 preferences and keep a neutral blank-page option. No OS permissions are needed here.
- **Visual treatment:** Four softly elevated cards with concise copy/icons on warm ivory; light note panel and sage Continue.

#### 06 · Your first entry

- **Purpose:** Let the user experience ordinary writing and create a first entry.
- **Pictured headline/copy:** “Your first entry.” / “Take a moment to write freely. There’s no right or wrong way.” The example prompt says “What feels important today?” The example body begins “The morning was quieter than usual, and I found myself noticing the small things — the light through the leaves, a slower pace, and a clearer sense of what I want to focus on.” Status says “Saved on this device”; the image also shows “128 words”.
- **Action and controls:** Editor with visible cursor; image and microphone affordances; divider; bold, italic and link controls; word count; back; “Save entry”. The selected prompt is optional. The discussion says attachment actions should not request permission until used. After a successful save, show a subtle “Saved on this device” confirmation.
- **Interaction/data:** Save must report success only after durable persistence. Explain where the draft resides and what happens if the user exits before screen 14. This is the critical unresolved pre-enrolment storage boundary: an entry can contain highly sensitive material, but the user has not yet enrolled or authenticated. Do not put it in ordinary sample data, a shared preview, analytics, remote storage or an unprotected browser store. Define encryption/key ownership, crash recovery, cancellation, deletion and the transition into the account before building this path.
- **Visual treatment:** Warm paper editor card, restrained serif writing text and minimal toolbar. “Saved on this device” is shown as a state, not decoration.

### Chapter 3 — Private layer (7–10)

#### 07 · Some things are just yours

- **Purpose:** Explain the distinction between everyday journal writing and the protected space.
- **Pictured headline/copy:** “Some things are just yours.” / “LuLu gives you a private space for experiences you’d rather keep to yourself.”
- **Action and controls:** “Discover private mode”, back arrow and Skip.
- **Interaction/data:** Advance to the demonstration on screen 8. A normal-looking journal card transitions to a dark concealed card. The pictured example is illustrative only; it must not expose a real private entry or silently convert this onboarding entry into a protected record.
- **Visual treatment:** Warm ordinary card above a charcoal/sage concealed card, with a transition arrow and lock cue.

#### 08 · Your private space, one gesture away

- **Purpose:** Demonstrate the intended private-entry affordance and verification step.
- **Pictured headline/copy:** “Your private space, one gesture away.” / “Use your private shortcut to enter a protected space. LuLu verifies it’s you before revealing private content.” The sheet reads “Verify it’s you”, “Use Face ID to access your private space.”, “Continue with Face ID”, and “Use passkey instead”.
- **Action and controls:** Illustrative trigger → system-style authentication sheet → protected-content transition; Skip and Continue are also pictured.
- **Interaction/data:** The private-entry gesture is still undecided. A gesture, top plus, “Private” tab or lock drawing on this board must not reverse the established discreet-access direction or be treated as a granted permission. The source discussion explicitly says the passkey here is a demonstration; actual enrolment comes later at screen 14. Use synthetic sample text and a simulated state transition; do not invoke a real authenticator or expose real private data here.
- **Visual treatment:** Dark charcoal screen behind a warm compact verification sheet, fingerprint illustration, muted blurred journal controls and contrasting white/sage action.

#### 09 · Protect what matters

- **Purpose:** Teach paragraph-level concealment while preserving the author’s source text.
- **Pictured headline/copy:** “Protect what matters.” / “Choose what stays visible. Your original words remain preserved.” The example record is “A calmer morning”; the concealed block reads “This paragraph is private”.
- **Action and controls:** Example entry with three paragraphs, overflow menu, image/bold/italic/link toolbar, back, Continue. Source discussion proposes select paragraph → conceal → reveal while authenticated.
- **Interaction/data:** This is a demonstration on sample content only. If blur/masking is used, clearly distinguish temporary visual concealment from deleting/removing text; the image uses a blurred block and lock indicator. Do not claim that tapping a blurred block itself grants authorization. Any real reveal requires the app’s actual protected session.
- **Visual treatment:** Paper writing surface, readable paragraphs around a soft masked middle paragraph, small lock and label.

#### 10 · Leave in an instant

- **Purpose:** Show the quick exit result and return to ordinary space.
- **Pictured headline/copy:** “Leave in an instant.” / “One quick action conceals your private space and returns you to your everyday journal.” Confirmation: “Private space concealed — Back to your everyday journal.”
- **Action and controls:** Overlapping private and ordinary journal views, transition arrow, back and Continue. Source discussion says tap the Quick Exit demonstration.
- **Interaction/data:** Simulate only. Do not lock/clear a real user session or alter real records from this training screen. When the actual app later implements quick exit, its established behavior is immediate lock and removal of callbacks/queued references, without silently flushing unsaved plaintext.
- **Visual treatment:** Warm ordinary journal in front, darker concealed records behind, compact confirmation card and clear transition arrow.

### Chapter 4 — Capture, understand, connect, secure (11–14)

#### 11 · Some moments need more than words

- **Purpose:** Introduce multimodal capture and record continuity.
- **Pictured headline/copy:** “Some moments need more than words.” / “Write it, record it, photograph it or keep the files that matter.” Four actions: Text, Voice, Photo, Files. Note: “Originals preserved. Additions stay traceable.” Example: “Today was hard, but I’m writing this down so I don’t forget how it felt.”
- **Action and controls:** Four capture choices; sample evidence card with photo, audio (0:38) and Letter.pdf (320 KB); back and Continue.
- **Interaction/data:** The planning copy proposes permission explanations at point of use, and sample media in guided demonstration so onboarding can continue without granting access. Do not request permissions merely by showing this screen. Current media capture foundations do not make this full product flow or its traceability claim complete; camera, voice, files, timestamps and provenance need separate implementation/acceptance.
- **Visual treatment:** Light paper/sage interface with compact capture tiles, one combined sample record and a concise preservation note.

#### 12 · A little clarity can change everything

- **Purpose:** Introduce optional, evidence-linked understanding without diagnosis.
- **Pictured headline/copy:** Headline “A little clarity can change everything.” The working title in the planning text was “Understand what you’re experiencing.” Supporting copy: “Explore possible patterns, understand your options and decide what happens next.” Example entry: “I keep having to ask permission before I can use my own money.” Possible topic: “Financial control”. The card says “This may reflect a controlling behaviour pattern. Understanding this can help you know what to ask, what to look out for or discuss with someone you trust.” Links/tiles: “Information and guidance”, “Ways to respond”, “Local support services”. Privacy note: “Identifying details are checked before anything is processed outside your device.”
- **Action and controls:** Topic card/link and resource tiles; back and Continue.
- **Interaction/data:** The illustration is not a live assessment, legal determination, diagnosis, or promise of safe external processing. Make any real interpretation opt-in, source-linked, uncertain, and grounded in reviewed resources. The pictured external-processing/privacy assurance is not established; do not show it until verified policy, technical behavior and evaluation support the exact claim. No raw record should be sent just because the screen offers interpretation.
- **Visual treatment:** Dark editorial surface with a single selected-entry card, one possible-topic card and three compact information pathways; restrained gold highlight.

#### 13 · You don’t have to do this alone

- **Purpose:** Present support and connection as choices, including the choice to stay private.
- **Pictured headline/copy:** “You don’t have to do this alone.” / “Share with someone you trust, explore available help or take your time.” Options: “Trusted companion — Share selected records, receive contributions or start a safety Trail”; “Professional support — Find counselling, legal assistance and verified support services”; “Keep it private — Continue documenting without sharing anything.” Reassurance: “You stay in control. You decide what to share, when to share it and who can see it.”
- **Action and controls:** Three equal pathway cards; back and Continue.
- **Interaction/data:** This is an introduction, not an invitation to add a contact, grant access, start location tracking or disclose records. Companion sharing, Trails, verified professional directory and referrals remain roadmap capabilities; do not imply that services or permissions are live. “Keep it private” must remain an equally valid choice.
- **Visual treatment:** Warm ivory, friendly line icons, three balanced cards and muted reassurance panel; no pressure toward disclosure.

#### 14 · Your space. Your control.

- **Purpose:** Set up actual protected access and complete onboarding.
- **Pictured headline/copy:** “Your space. Your control.” / “Protect your private space with a passkey. What you choose to share stays your decision.” Assurance cards: “Private access — Use your device’s passkey authentication to unlock LuLu’s private space”; “On-device by default — Private originals are stored on your device by default”; “Your permissions — External processing and sharing only happens with your permission.” Primary action: “Create my private space”.
- **Action and controls:** Passkey/fingerprint illustration, three assurance cards and one enrolment action. No extra success/Continue gate is specified: a successful enrolment should enter the ordinary LuLu workspace directly.
- **Interaction/data:** Unlike screen 8, this is real passkey enrolment. Handle cancellation, unsupported devices, existing accounts, network failure and retry without falsely completing onboarding or losing the first-entry draft. Each storage/processing assurance must match actual platform behavior and be reviewed; the current product has local encrypted private storage in some clients, but the browser-held key is not passkey-bound and there is no backup/recovery guarantee. Do not claim otherwise. A device-generic passkey prompt and wording is preferred over promising Face ID specifically.
- **Visual treatment:** Dark warm charcoal surface, white wordmark and serif headline, large fingerprint symbol, three assurance cards and a bright high-contrast primary action. Keep room for OS UI and accessibility scaling.

## Cross-screen behavior and states to settle

- Decide whether Skip means skip the current screen, skip optional personalisation, or finish onboarding. The boards picture Skip repeatedly but the conversation does not define its semantics. Provide clear back, resume and safe exit behavior; do not make all 14 screens mandatory by implication.
- Define how an existing signed-in user, an existing passkey/account, interrupted onboarding, passkey cancellation, storage failure, and a user returning to the pre-enrolment draft resume. Do not overwrite/delete existing records or duplicate the first entry on retry.
- Define whether screen 3 is single or multi-select, whether screen 5 requires selection, and whether screen 6 autosaves before its explicit Save action. The images alone do not settle these contracts.
- Ask for camera/microphone/file permissions only after an explicit use action and a short explanation. A denial must leave the user able to continue onboarding.
- Support narrow and wide responsive layouts, safe areas, keyboard overlap, screen readers, visible focus, large text, contrast, reduced motion and non-color status cues. Keep controls reachable when the keyboard is open.
- Preserve source originals and distinguish concealed, redacted, blurred, deleted and transformed states. Demo-only blur is not secure erasure or authorization.
- Avoid legal evidence guarantees, diagnosis, guaranteed interpretation accuracy, guaranteed support availability, and broad privacy guarantees that have not been verified.

## Current product boundary and implementation handoff

The app currently has a five-part welcome/orientation/create/sign-in experience in [`OnboardingAuth.tsx`](../../src/components/OnboardingAuth.tsx): welcome, two orientation screens, create passkey and returning sign-in. [`AuthBoundary.tsx`](../../src/components/auth/AuthBoundary.tsx) restores native sessions where applicable and otherwise requires verified passkey authentication before the main app shell. Successful authentication enters the app directly. This is a distinct existing flow, not the pictured 14-screen sequence; the existing sign-in-before-app direction also differs from screens 4–6 creating a first entry before screen 14 enrolment. Resolve that conflict and the pre-enrolment draft’s encryption, key ownership, recovery, cancellation and deletion behavior before implementation. Do not silently route it into the ordinary account journal or private vault.

Current code also includes private text draft capture/recovery, local media capture and storage, export/recovery-file crypto, and native platform adapters in files such as [`PrivateDraftComposer.tsx`](../../src/components/PrivateDraftComposer.tsx), [`mediaCapture.ts`](../../src/services/mediaCapture.ts), [`localMediaVault.ts`](../../src/services/vault/localMediaVault.ts), [`privateExport.ts`](../../src/services/privateExport.ts), [`recoveryFileCrypto.ts`](../../src/services/recoveryFileCrypto.ts), and [`runtime.ts`](../../src/platform/runtime.ts). These additions are newer than earlier design notes. Their presence does not establish that the 14-screen onboarding flow is integrated with them, that every pictured assurance is accurate, or that the complete capture/export/recovery lifecycle has been accepted on target devices. The existing passkey registration/sign-in, ordinary entry editor, private paragraph controls and quick exit are reuse candidates once the onboarding boundary and sequence are decided.

Screens 11–13 are capability storytelling, not a promise that onboarding has working external interpretation, companion invitations, Trails, a verified support directory or referrals. Screen 14 is the only pictured actual private-access enrolment step; screen 8 remains sample-only. No decision is recorded here on the private-entry gesture, progress design, skip semantics, pre-enrolment storage, passkey fallback, onboarding completion persistence, or whether the first entry is retained if enrolment is abandoned.
