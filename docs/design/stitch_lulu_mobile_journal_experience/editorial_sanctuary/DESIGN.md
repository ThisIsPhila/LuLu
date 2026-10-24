---
name: Editorial Sanctuary
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#444748'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5f5e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfda'
  on-secondary-container: '#63635f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#151d17'
  on-tertiary-container: '#7d867d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e4e2dd'
  secondary-fixed-dim: '#c8c6c2'
  on-secondary-fixed: '#1b1c19'
  on-secondary-fixed-variant: '#474743'
  tertiary-fixed: '#dce5db'
  tertiary-fixed-dim: '#c0c9bf'
  on-tertiary-fixed: '#151d17'
  on-tertiary-fixed-variant: '#404941'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '500'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Literata
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Literata
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  ui-body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  mono-metadata:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-tag:
    fontFamily: JetBrains Mono
    fontSize: 11px
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
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a calm, humanist, and privacy-first sanctuary for journaling and personal storytelling. Rooted in Swiss typographic clarity, warm editorial minimalism, and tactile physical materiality, the experience evokes quiet introspection, trust, and permanence. It treats user thoughts not as transient data streams, but as archival personal literature deserving of care, dignity, and discreet protection.

The visual style blends editorial restraint with subtle neo-skeuomorphic tactile depth:
- **Atmosphere:** Serene, uncluttered, archival, and private. 
- **Physicality:** Tactile paper sheets, stone plinths, soft pill surfaces, and debossed or raised bevel interactions that mirror physical desk stationery.
- **Audience:** Writers, thinkers, and privacy-conscious storytellers seeking an intimate, distraction-free environment free from algorithmic noise and social vanity.

## Colors

The palette draws inspiration from traditional printmaking and fine bookbinding:

- **Paper Background (`#FAF9F6`):** An organic, warm off-white canvas that eliminates eye strain while establishing an inviting tactile foundation.
- **Ink Primary (`#1A1A1A`):** A deep, saturated neutral black used for primary typography, confident icon outlines, and primary action controls.
- **Stone Surface (`#E8E6E1`):** A soft, tactile surface grey used for card containers, tactile pill buttons, and navigation blocks. A slightly elevated stone tint (`#F3F1EC`) is applied for raised interactive layers and search fields.
- **Sage Accent (`#C9D2C8`):** A muted, botanical grey-green dedicated strictly to privacy-first interactions, discreet passkey protected states, entity tags, and subtle focus cues.
- **Muted Rules & Borders (`#A0A0A0` / `#8E8D8A`):** Low-contrast architectural separators and timestamps that organize complex metadata without interrupting reading flow.
- **Dark Mode / Private Session:** A deep carbon black (`#0B0B0B`) surface pairing with ink-charcoal cards (`#1E1E1E`) and sage accents, triggering instantly during private writing states.

## Typography

The typography establishes a strict hierarchy of purpose across three complementary families:

1. **Structural & Editorial Headings (Inter):** Tight, geometric, modernist proportions that lend Swiss editorial discipline to article headers, modal titles, and navigation wayfinding.
2. **Immersive Longform Journaling (Literata):** A bespoke literary serif providing bookish warmth, rhythmic line flow, and comfortable horizontal optical cadence for reading and composing personal narratives.
3. **Metadata, Entities & System Timestamps (JetBrains Mono):** Precision engineering meets paper documentation. Monospaced clarity is strictly applied to contextual tags, recognition badges, passkey timestamps, and machine-detected entities (Person, Place, Time).

## Layout & Spacing

The layout is governed by a Swiss asymmetric modular grid that privileges negative space and restful breathing room:

- **Mobile Viewports (under 768px):** A single-column fluid flow bounded by 16px (`1rem`) outer margins. Content groups utilize stacked rhythm with card spacing set to `space-md` (16px) and entry sections separated by `space-xl` (40px). Bottom action sheets dock comfortably above system safe areas.
- **Tablet / Split Viewports (768px – 1024px):** An 8-column layout with 24px gutters and 32px canvas margins, allowing dual-pane navigation (entries index on the left, active composition reading pane on the right).
- **Desktop Viewports (above 1024px):** A 12-column asymmetric layout with a fixed, narrow column for navigation and timeline filters, an archival index, and an off-center max-width editorial column (680px) optimized specifically for Literata's character line length (65–75 characters per line).

## Elevation & Depth

Visual depth is achieved through tactile neo-skeuomorphic physicality rather than aggressive drop shadows:

- **Surface Tiers:**
  - *Base Canvas:* Warm Paper (`#FAF9F6`).
  - *Plinth Tier:* Stone (`#E8E6E1`), creating soft boundary areas for collections and lists.
  - *Interactive Cards:* Elevated Stone (`#F3F1EC`) with faint top-edge highlight reflections (`inset 0 1px 0 rgba(255, 255, 255, 0.8)`) and faint tactile drop shadows (`0 2px 6px rgba(26, 26, 26, 0.04)`).
  - *Pressed / Inset State:* Subtle interior shadows (`inset 0 1px 3px rgba(0, 0, 0, 0.06)`) on active inputs, pressed pill buttons, and switch wells.
- **Discreet Passkey & Protection:**
  - In private mode, layered backdrops utilize optical multi-pass Gaussian blurs (24px) combined with subtle, matte-frosted Stone shading, preventing shoulder-surfing while preserving tactile soft edges.

## Shapes

The design system adopts a pill-shaped and pebble-soft geometry (`roundedness: 3`):
- **Micro Badges & Chips:** Fully rounded pills (`border-radius: 9999px`) creating distinct, touch-friendly capsule targets.
- **Buttons & Floating Action Controls:** 9999px pill shapes for navigation capsules, secondary category selectors, and primary passkey triggers.
- **Cards & Reading Surfaces:** Large rounded corners (`rounded-lg: 32px` on mobile, `24px` on desktop) evoking the smooth, organic edges of polished river stone and softbound notebooks.

## Components

### Buttons
- **Primary:** Pill-shaped solid Ink (`#1A1A1A`) with Paper text (`#FAF9F6`), an internal top-edge highlight (`rgba(255, 255, 255, 0.15)`), and zero hard edges. Hover states shift to soft charcoal (`#2A2A2A`).
- **Secondary:** Soft Stone (`#E8E6E1`) background with Ink text (`#1A1A1A`), bordered by a subtle 1px translucent boundary (`rgba(0, 0, 0, 0.04)`).
- **Passkey Action Button:** Pill button surfaced with Sage accent (`#C9D2C8`), Ink text, and accompanied by a tactile lock iconography indicator.

### Chips & Entity Tags
- Fully pill-shaped (`9999px`) components.
- Default filter pills use `#F3F1EC` with 12px Inter medium typography.
- Machine-recognized entity tags (Person, Location, Time) feature a 1px border with JetBrains Mono metadata labels, turning pale Sage (`#C9D2C8`) when privacy-masked or locked.

### Input Fields & Search Bars
- Seamless inset pills or softened cards using Stone surface (`#F3F1EC`), recessed slightly with an `inset 0 1px 2px rgba(0, 0, 0, 0.04)` boundary.
- Focused states feature a 1.5px soft Sage accent ring without harsh blue browser outlines.

### Checkboxes, Switches & Radios
- **Switches:** Pill tracks with a recessed channel; thumbs are raised tactile ceramic white disks featuring subtle top-down specular beveling.
- **Selection Rings:** Circular radio indicators with soft ink bullseyes, referencing archival checkmark dots.

### Cards & Plinths
- Journal cards use warm stone surfaces with top-edge ambient highlight lines, discreet 3-dot tactile overflow triggers, and JetBrains Mono date stamps displayed in the top corner.
- Pinned and protected journal cards feature a discreet passkey lock icon tucked alongside the card footer.