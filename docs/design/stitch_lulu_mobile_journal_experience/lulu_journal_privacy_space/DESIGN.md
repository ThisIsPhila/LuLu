---
name: LuLu Journal & Privacy Space
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e1b15'
  on-tertiary-container: '#88837a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e8e2d7'
  tertiary-fixed-dim: '#cbc6bb'
  on-tertiary-fixed: '#1e1b15'
  on-tertiary-fixed-variant: '#4a473e'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Literata
    fontSize: 48px
    fontWeight: '500'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Literata
    fontSize: 36px
    fontWeight: '500'
    lineHeight: 44px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Literata
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Literata
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system defines a serene, tactile, and editorial environment crafted for personal introspection and intelligent privacy storytelling. Rooted in Swiss typographic rigor and modern tactile minimalism, it treats digital interactions as physical artifacts: pressed paper, soft extruded pebbles, micro-beveled surfaces, and sculpted glass-like tokens.

The brand persona is quiet, deeply observant, and protective. It balances the literary warmth of classic publishing with the high-precision clarity of technical privacy instruments. The experience must evoke unhurried focus, absolute sanctuary, and sensory satisfaction when interacting with thoughts, memories, and protected biometric boundaries.

## Colors

The core palette is strictly calibrated around monochromatic tactile stone, chalk, and deep carbon ink tones:

- **Canvas & Backgrounds:** `#FBFBFB` represents unblemished archival paper. `#FAFAFA` and `#F3F3F3` define resting tactile surfaces.
- **Surface Elevation:** `#E9E9E9` serves as secondary card containers and inset panel wells. `#EDEDED` provides soft inner bevel fills.
- **Borders & Separators:** `#D8D8D8` provides subtle edge grounding without sharp wireframe rigidity. `#E5E5E5` defines hairline rules.
- **Text & Contrast:** `#0B0B0B` (pure black ink) for definitive headlines and solid tactile primary buttons. `#1A1A1A` for rich body prose. `#6B6B6B` and `#A3A3A3` for metadata, timestamps, and secondary captions.
- **Warm Editorial Accents:** Warm bone/stone (`#E0DACF` / `#F5F2EB`) provides contextual warmth for entity chips (Person, Location, Time, Theme) without introducing loud chromatic distractions.
- **Passkey / Protected State:** Deep obsidian surfaces (`#0D0D0D` to `#161616`) combined with iridescent specular highlights (`#A4C8E1`, `#F3D8E2`) reserved strictly for passkey authentication modals and protected writing isolation.

## Typography

The typographic hierarchy utilizes three deliberate structural roles:

1. **Editorial Literary Serif (Literata):** Used for reflective journal entries, immersive reading views, and narrative titles. It introduces bookish warmth, comfortable optical cadence, and personal intimacy.
2. **Swiss Rational Sans (Inter):** Applied across core application architecture, navigation bars, segment controls, form fields, and metadata grids. It delivers high-density legibility and precision.
3. **Cryptographic Monospace (JetBrains Mono):** Reserved for technical tokens, session timers (`> start session`, `14:20`, `T-1`), entity tags, word counts, and privacy status badges. It communicates systematic transparency and precision.

## Layout & Spacing

The layout model is driven by generous white space and deliberate focal framing:

- **Mobile Viewports (under 768px):** A single focused column using `16px` outer gutters. Entry lists and editor sheets float within dynamic viewports, allowing edge-to-edge reading with `20px` inner body padding.
- **Tablet / Split Views (768px - 1024px):** Dual-pane structure (collapsible timeline master view + reading/editor detail view) with `24px` gutter gaps.
- **Desktop System (1024px and above):** 12-column modular grid with a fixed `260px` left rail navigation, centered reading canvas constrained to a maximum width of `720px` for optimal typographic line length (60–75 characters per line).
- **Rhythm:** Spacing follows an 8-point base grid, with micro-tokens (`0.125rem`, `0.25rem`) reserved for tight chip padding, pill button alignment, and icon-label pairings.

## Elevation & Depth

Visual hierarchy is communicated via neo-skeuomorphic tactile depth, dual-cast micro-shadows, and physically debossed states:

- **Flat State:** Standard canvas resting plane `#FBFBFB` with hairline `#E5E5E5` borders.
- **Raised Tactile State (Pebble / Floating Cards):** Dual-light cast:
  `box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85);`
  This creates a physical, sculpted paper tablet presence.
- **Inset / Pressed State (Writing Wells & Active Filters):**
  `box-shadow: inset 0 1px 3px rgba(0,0,0,0.07), inset 0 0 0 1px rgba(0,0,0,0.04);`
  Applied to search bars, focused editor wells, and depressed toggle buttons.
- **Protected Mode Blur (Privacy Vault):** Deep charcoal backdrop blur (`backdrop-filter: blur(24px) saturate(140%)`) with specular iridescent highlights on floating tactile biometric shields.

## Shapes

The shape system utilizes soft, organic pebble geometry. Full pill roundedness (`roundedness: 3`) defines buttons, filter chips, metadata tags, and passkey controls, rendering them touchable and ergonomic.

Card surfaces, modal sheets, and inset writing wells employ large relaxed radiuses (`rounded-xl` / `1.5rem` to `2rem`) to reflect the contour of soft-bound journals and smoothed stone surfaces.

## Components

### Buttons
- **Primary Pebble Button:** Solid black ink (`#0B0B0B`) fill, crisp white Inter label, full pill radius. Subtle top inner bevel highlight (`inset 0 1px 0 rgba(255,255,255,0.2)`) and micro-drop shadow. Downward translate on `:active` with shadow compression.
- **Secondary Tactile Button:** Soft stone surface (`#F3F3F3`), hairline border (`#D8D8D8`), text `#1A1A1A`. On hover, subtle ambient elevation. On active, depressed inset shadow.
- **Icon Buttons:** Circular or smooth pebble containers with inset resting state or raised tactile boundary for camera, mic, and security actions.

### Entity Chips & Filter Tags
- **Filter Tags:** Full pill badges with `#E9E9E9` background and `#1A1A1A` text. Selected state inverts to `#0B0B0B` with white text.
- **Contextual Entity Chips (Inline Recognition):**
  - **Person / Location / Time / Theme:** Soft bone-tinted pill badges (`#F5F2EB` background, `#2A2A2A` text, `#D8D3C8` hairline outline). Includes subtle JetBrains Mono metadata indicator (e.g. `David [Person]`, `9pm [Time]`).

### Inputs & Writing Wells
- **Writing Canvas:** Frameless or subtly inset surface (`#F7F7F7`), with generous breathing room. Unobtrusive caret and no distracting outline boxes.
- **Search & Input Fields:** Inset debossed trough with soft internal shadow, placeholder text in `#A3A3A3`, and leading monochrome search icon.

### Cards & Timeline Items
- **Journal Entry Card:** Layered pebble cards stacked vertically. Flat surface `#FFFFFF` or `#FAFAFA` with subtle dual ambient shadow. Displays date in JetBrains Mono, title in Literata medium, and preview excerpt in Inter.
- **Entity Overview Cards:** Segmented cards highlighting recognized personal data entities with quick-action toggles to redact, pseudonymize, or assign biometric lock status.

### Passkey & Privacy Vault Modal
- **Biometric Authenticator:** Deep dark-mode takeover modal featuring the sculpted iridescent orb motif, passkey triggers, and high-contrast tactile action triggers (`#FFFFFF` on `#0D0D0D`).