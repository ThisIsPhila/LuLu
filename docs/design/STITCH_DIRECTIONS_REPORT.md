# Stitch Mobile Journal Experience: Directions Report

**Repository Directory:** `docs/design/stitch_lulu_mobile_journal_experience/`  
**Complementary Assets:** `docs/design/resources/2026-10-24-warm-tactile/`  
**Live Prototype:** `http://localhost:5173`

---

## 1. Executive Summary & Design System Philosophy

The design directions under `docs/design/stitch_lulu_mobile_journal_experience/` establish an **Editorial Sanctuary**—a warm, tactile, humanist journaling platform with a discreet, zero-knowledge privacy architecture underneath.

### Core Philosophy
1. **Dignity Over Stigmatization:** The surface app is an everyday personal journal for reflection, ideas, and literature. It **never** resembles a "crime app", "panic button", or "victim tracking tool".
2. **Warm Tactile Materiality:** Rejects harsh, sterile flat-white backgrounds in favor of organic warm paper (`#FAF9F6`), stone surfaces (`#F4F3F0`, `#E8E6E1`), deep carbon ink (`#1A1A1A`), sage botanical accents (`#C9D2C8`), and deep obsidian dark surfaces (`#0B0B0B` / `#141715`).
3. **Typographic Trinity:**
   - **Inter:** Modernist Swiss architectural discipline for navigation, headers, and UI controls.
   - **Literata:** Warm, bookish literary serif for reflective writing and immersive reading.
   - **JetBrains Mono:** Precision cryptographic tokens, timestamps, entity tags (`[PERSON]`, `[LOCATION]`, `[TIME]`), and word counts.
4. **Neo-Skeuomorphic Tactile Depth:** Dual-cast micro-shadows, debossed inset wells for drafting and search, subtle top-edge ambient highlight lines (`inset 0 1px 0 rgba(255, 255, 255, 0.8)`), and soft pill geometry (`border-radius: 9999px`).

---

## 2. Detailed Breakdown: What Each Direction Represents

### Direction 1: Everyday Reflection Sanctuary (`lulu_journal_home`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_journal_home/`
* **What it Represents:** **The Plausible Everyday Haven.**
* **Role in the Architecture:**
  - Serves as the natural, non-stigmatizing entry point to the application.
  - Personal greeting (`Lerato`), calendar context (`Friday, 24 Oct`), and a calm status pill (`• VAULT ACTIVE`).
  - **Daily Reflection Well:** Inset debossed prompt (*"How did you find stillness today?"*) with a quick thought entry bar that opens into the composer.
  - **Timeline Cards:** Chronological diary entries with warm photographic attachments (`A calm morning`, `Notes on focus`, `The conversation`), word counts, tags, and timestamps in JetBrains Mono.
  - **Passkey Encrypted Card:** Dedicated tactile stone card with fingerprint unlock trigger and a reassuring label: *"Passkey Encrypted — Encrypted end-to-end with enclave biometrics."*
  - **Weekly Clarity Rhythm:** Subtle mini bar chart tracking weekly mindfulness and writing frequency without aggressive gamification.

---

### Direction 2: Semantic Cloaking & Dual Entry Composer (`lulu_transform_protect` & `06-light-dark-writing.png`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_transform_protect/` and `docs/design/resources/2026-10-24-warm-tactile/06-light-dark-writing.png`
* **What it Represents:** **The Core Privacy Bridge (Natural Words -> Protected Version).**
* **Role in the Architecture:**
  - Visualizes the fundamental premise of LuLu: sensitive real-world experiences are transformed into protected fiction/distanced literature before ever syncing or being exposed.
  - **Upper Card (Natural Words):** Warm paper card containing the writer's unfiltered stream of consciousness (*"David met me at my place around 9pm. He kept asking about my schedule..."*).
  - **Middle Bridge (Live Semantic Cloaking Ledger):** Tactile status card showing real-time entity mapping:
    - `David` -> `John` `[PERSON]`
    - `my place` -> `the Nest` `[PLACE]`
    - `9pm` -> `Blue Moon` `[TIME]`
    - Perspective Distancing: 1st person (`I/me`) -> 3rd person (`she/her`).
  - **Lower Card (Protected Version):** Deep obsidian/carbon card (`#141715`) displaying the output cloaked prose ready for safe local storage or cloud sync without exposing real identities.

---

### Direction 3: Enclave Drafting & Inline Badging (`lulu_protected_writing`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_protected_writing/`
* **What it Represents:** **The Zero-Distraction Protected Writing Canvas.**
* **Role in the Architecture:**
  - A focused drafting sheet with an active security banner: `🔒 Encrypted Enclave Active • Local AI processing`.
  - Real-time named entity recognition (NER) dynamically converts mentions of people, locations, and temporal markers into tactile inline pill capsules:
    - `David [PERSON]` in soft bone pill with JetBrains Mono badge.
    - `the station [LOCATION]`
    - `yesterday evening [TIME]`
  - **Floating Recognition Toast:** Pill card floating above the editor: `✦ 3 entities transformed for privacy — tap to view mappings`.
  - **Bottom Formatting Dock:** Monospace word counter, bold/italic controls, perspective switch, and an ink-black pill button: `LOCK & SAVE`.

---

### Direction 4: Neural Enclave Mappings Ledger (`lulu_entity_inspector`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_entity_inspector/`
* **What it Represents:** **User Agency & Auditability Over Transformation Rules.**
* **Role in the Architecture:**
  - Ensures the user has complete, transparent control over how their story is cloaked.
  - **Privacy Rating Banner:** High Privacy Level score card (`98% Protection score • 3 entities cloaked`).
  - **Entity Transformation Cards:** Each detected entity is presented with:
    - Entity category chip (`[PERSON]`, `[PLACE]`, `[TIME]`).
    - Original mention vs Active replacement alias (`David` -> `John`).
    - Contextual citation quote from the text showing exactly where and how it was used.
    - Direct tactile actions: `Change Alias` or `Keep Original`.
  - **Manual Reference Generator:** Button to define custom pseudonyms and aliases for arbitrary sensitive terms.

---

### Direction 5: Archival Story Sheets & Curated Decks (`lulu_journal_story_leaves_1 & 2`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_journal_story_leaves_1/` & `_2/`
* **What it Represents:** **The Physical Manuscript & Archival Library.**
* **Role in the Architecture:**
  - Celebrates user entries as personal literature rather than disposable social posts.
  - **Curated Deck:** Highlight card for multi-part entries (e.g. *Spring Monologue*, 4 leaves, 2,420 words).
  - **Tactile Search & Filter Well:** Inset search bar with category filter chips (`All`, `Stories`, `Reflections`, `Letters`, `Unmasked`).
  - **Stacked Leaf Cards:** Tactile stone cards with delicate borders, reading duration estimates, chapter numbers, and tags.

---

### Direction 6: Literary Prose Reader & Authenticated Unmasking (`lulu_story_reading_mode`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_story_reading_mode/`
* **What it Represents:** **The Book-Quality Reader with Biometric Reveal.**
* **Role in the Architecture:**
  - Pure editorial typography in Literata serif, optimized for comfortable optical cadence (65–75 characters per line).
  - **Dual-State Unmask Pill:** Prominently positioned header pill button:
    - Default state: `CLOAKED (SAFE)` in subtle stone.
    - Tapped state: triggers biometric passkey verification.
    - Authenticated state: toggles to `ORIGINAL` in sage green, instantly restoring true names and locations.
  - **Identified Entities Drawer:** Floating tactile card summarizing cloaked elements with instant review buttons.
  - **Circular Floating Reader Dock:** Pebble dock anchored at the bottom with quick actions:
    - Text size adjustment (`Aa`)
    - Voice/Audio narration
    - Bookmark/Favorite
    - Passkey lock exit

---

### Direction 7: Trauma-Informed GBV Safety Sanctuary (`lulu_private_support_sanctuary_dark_mode` & `05-dark-support.png`)
* **Physical Reference:** `docs/design/stitch_lulu_mobile_journal_experience/lulu_private_support_sanctuary_dark_mode/` and `docs/design/resources/2026-10-24-warm-tactile/05-dark-support.png`
* **What it Represents:** **The Discrete GBV Safety Sanctuary Behind the Vault.**
* **Role in the Architecture:**
  - Positioned discreetly inside the biometric vault tab, providing lifesaving resources without exposing the user to device surveillance.
  - **Obsidian Theme:** Deep carbon dark surfaces (`#0B0B0B` / `#161616`), soft charcoal containers (`#1E1E1E`), and sage accents (`#C9D2C8`).
  - **Quick Exit Escape Button:** Red-accented header action: `✕ Quick exit to notes`, which immediately clears memory, terminates the session, and redirects to an ordinary mundane note.
  - **Actionable Support Modules:**
    1. **Safety Planning:** Checklist for creating an offline emergency grab-bag, digital boundary audit, and safe transit routes.
    2. **Understand Options:** Plain-language guides explaining legal protection orders, medical documentation, and evidence continuity.
    3. **Trusted Contacts:** Private encrypted circle with one-tap encrypted distress ping.
    4. **Verified Support Helplines:** Tap-to-dial access to verified South African and international GBV resources (National GBV Command Centre `0800 428 428`, Stop Gender Violence `0800 150 150`, Thuthuzela Care Centres, LifeLine `0861 322 322`).
    5. **Calm Focus Audio:** Integrated ambient sound player (Rain on leaves, 432Hz grounding frequency) for panic de-escalation and somatic grounding.

---

## 3. How the Running Prototype Implements the Stitch Directions

The responsive web application currently running at `http://localhost:5173` directly incorporates every single one of these Stitch directions:

| Stitch Screen / Resource | Component in App | Path & Access |
|---|---|---|
| `lulu_journal_home` | `<JournalHome />` | Default Home tab (`nav: home`) |
| `lulu_transform_protect` & `06-light-dark-writing.png` | `<TransformProtectView />` | Tap "Compose" dock or "Daily Reflection" well |
| `lulu_protected_writing` | `<ProtectedWritingView />` | "Enclave Draft" button in Compose view |
| `lulu_entity_inspector` | `<EntityInspectorView />` | Bottom navigation "Inspector" tab or entity badge tap |
| `lulu_journal_story_leaves_1 & 2` | `<StoryLeavesView />` | Bottom navigation "Leaves" tab |
| `lulu_story_reading_mode` | `<ReaderView />` | Tap any timeline entry or story leaf |
| `lulu_private_support_sanctuary_dark_mode` & `05-dark-support.png` | `<PrivateSanctuaryView />` | Bottom navigation "Vault" tab (with passkey gate) |
