# LuLu — corrected product vision and interaction intent

**Date:** 23 October 2026  
**Status:** User-intent and concept document for the project team; **not** a technical specification, threat assessment, implementation plan, or request to constrain the team's research.

## Read this first: replacement notice

**This document supersedes earlier LuLu architecture/handoff instructions where their framing differs from the user's stated intention.** In particular, replace the guidance in `lulu_privacy_architecture_update_2026-10-23.md` and earlier LuLu handoffs that turns ideas into prescribed components, warnings, mandatory workflows, approval checkpoints or implementation decisions. Earlier documents may remain useful as historical discussion, but this document is the current authoritative expression of the user's intended **product behaviour**.

The purpose is to communicate what the user wants LuLu to make possible, how the experience should feel, and how the concepts relate. The implementation agent is expected to investigate, research, choose methods, and build an effective route to that experience. Architectural drawings, libraries, exact model placement, schemas and delivery strategies remain engineering work unless the user explicitly settles them. **Lead from the intended outcome and work towards it, rather than drafting from a catalogue of hypothetical failures.**

## 1. The experience: write normally, with privacy happening naturally

The user **writes in ordinary language**, just as they would speak or write in a personal journal. They are not expected to invent coded language, decide in advance what to anonymise, complete a separate identity-management form, or consciously initiate each transformation.

LuLu recognises personally identifying and contextually revealing information as the writing develops. It automatically transforms the *representation* of what the user wrote into an internally coherent, concealed version. The user sees this happen smoothly, in or shortly after the flow of writing, for example after a phrase or sentence or two. Subtle animated visual indicators show where LuLu has recognised and linked a person, place, time, relationship or contextual detail.

That feedback gives the user awareness and an immediate opportunity to correct a mistaken link, change a name or alias, or leave the association as LuLu resolved it. **Corrections are available, not an obligatory approval step.** The desired default is effortless natural writing, with an understandable and inspectable privacy transformation.

The private record should remain discoverable to its author through their original intent and words, even where the representation visible in the ordinary application or in synced data uses different names and circumstances. The user can retrieve, inspect and reinterpret what they wrote through the protected experience; they should not have to remember what concealed wording the system produced.

### Illustrative example from the user

Suppose a user naturally writes about David visiting their home at a certain time and threatening someone. LuLu can turn the surfaced or stored rendition into something along the lines of:

> **“Person A/John came to the Nest at Blue Moon and threatened her.”**

The point of this example is its **contextual transformation**, not simply changing `David` to `John`. A person, a place, a time and potentially the relationships between them can each have coherent private representations. The substitutions can be intelligible to the original writer while concealing the real-world reference from an unintended reader.

The user also imagines changing or introducing aliases later, with the underlying links preserved. A real identity such as David is associated with private information kept on a device and made retrievable by the authorised user through a passkey-mediated experience. The name John is only one possible outward representation of that identity.

The system may identify new entities on its own and visibly indicate what it has connected. If it misidentifies two people as one, or misses a meaningful relationship, the writer can correct it in context. It should feel like an intelligent writing experience, not a data-entry workflow.

## 2. Why this matters: coherent meaning without exposed identities

The desired outcome is a record that remains useful and coherent to its author while its externally exposed form does not disclose the real persons, locations and other revealing circumstances behind it. The example deliberately includes **the Nest** and **Blue Moon** to illustrate transforming context as well as proper names.

LuLu's privacy intelligence is meant to translate personal reality into a stable private narrative representation, while the original associations stay under the user's authority. This also motivates a potential reusable privacy engine for other KHÔRA products, independently of LuLu's immediate hackathon experience.

## 3. First-layer application: deliberately undecided

A central design question remains open: what does someone see before they enter the protected experience? Possibilities discussed include a real **storybook/writing application**, **to-do list**, **notes** or another ordinary, useful application. The user suggested that a storybook could provide a particularly natural setting for characters, places and concealed writing. This is a creative possibility, not an adopted UI direction.

The outer experience should work as an authentic application in its own right. The protected function can be invoked by a deliberate concealed interaction that makes sense within the chosen experience. The user wants it available without the friction of a conventional sign-in journey. Access to the protected flow uses a passkey when required, and leaving that flow ends the protected access session.

The design of the normal/outer application, the activation gesture, and the detailed interface are **still to be decided**. The user explicitly wants the design discussion next, after the intentions have been communicated accurately.

## 4. How the ideas fit together — logical layers, not prescribed infrastructure

The following are **capabilities** the system should embody. They are not instructions to implement separate services, and their runtime boundaries are for the engineering agent to investigate.

**Natural writing and visual feedback:** The person composes normally. The interface subtly shows recognition, linking and transformation in real time or shortly afterwards. Corrections and exploration are available whenever useful.

**Personal meaning and entity continuity:** The application preserves stable relationships among people, places, incidents and aliases, so references stay coherent across entries. The user can find records in the way they originally meant or wrote them.

**Private mappings and protected access:** Real names, associations and the material needed to reveal them remain under the user's device-side control. A passkey-mediated protected experience provides access without an ordinary identity-collection workflow. The protected session closes when the person exits it.

**Privacy transformation:** The target is local or edge-side processing (phone, laptop or supported browser) capable of producing a safely detached representation **before the next layer needs the content**. Transformations extend to contextual references and relationships, as illustrated by the user's example.

**Decisions capability:** The selected exploratory API for the demonstration is **OpenAI Decisions API**. It is one processing service among others, not a synonym for all cloud processing or all privacy work. The user is interested in compact, fast, accurate models and in investigating which decisions can ultimately happen on-device. The precise sequencing, type of input, local alternatives and demonstration compromises remain research and implementation choices.

**Application records and synchronisation:** LuLu may use Firebase, drawing on the user's Confessions experience, to keep the transformed records and support continuity across devices. Cloud storage is not the same component as a hosted AI decision service. These are distinct boundaries, and the architecture should preserve that distinction.

**Administration and delivery:** A customer-facing web application and a separate admin-facing web application are intended. The hackathon demonstration is web-first, while the same project anticipates iOS and Android. Capacitor is under consideration. A TypeScript monorepo is a candidate organisation, not an already-adopted structure. Cloudflare-managed subdomains under `thisisphila.co.za` are an option.

The goal is an architecture that embodies this behaviour and can move toward device-local inference without requiring the product to be reimagined. **The exact demo implementation route has not been selected.** The user explicitly wants the engineering team to choose an effective demonstration path while preserving the intended experience.

## 5. Continuity and recovery as product experiences

The user described previous work on Confessions that supports more than one authorised device, allowing another device to help preserve access when one is lost. This is relevant precedent, not a verbatim protocol to transplant without inspecting the existing code.

For LuLu, the user is also exploring a more human recovery experience. Suppose the recovered record still refers to `Person A` or `John`, but the private association to `David` is unavailable. LuLu could present that entity in the contexts where it appeared and let the user re-establish the private association from their own memory. That re-association should happen within their protected experience. This is an **exploration**, not an adopted recovery algorithm.

The broader vision combines dependable continued access with private, user-meaningful records; the particular recovery mechanism remains to be designed.

## 6. Relationship to Confessions and KHÔRA

**Confessions** supplied real experience in passkey-first identity and cross-device access. The user has described that implementation and wants to draw on the established work where useful. LuLu's protected mode has its own interaction model and is not simply a copy of Confessions.

**KHÔRA** is the broader entity and product ecosystem. The user imagines the privacy capability eventually becoming its own independent service/product, potentially serving several applications and identity providers. That long-range business vision informs separation of concerns, but **building that standalone SaaS is not the hackathon deliverable**.

**SDD (the user's Spec-Driven Development Framework)** is their development approach for maintaining explicit intent, design decisions and implementation history. The current document is an input describing intent. It is not a pre-written technical decision list for SDD to blindly enact.

## 7. What is decided, what is still being explored

**Current user intent:** Normal writing; automatic context-aware concealment; responsive visual entity indicators; optional in-place corrections; original-intent retrieval; private device-side mappings; passkey-triggered protected access; web-first demonstration with mobile direction; separate customer and admin applications; OpenAI Decisions API as the selected demo decision technology; possible future privacy product in KHÔRA.

**Still exploratory:** Storybook versus to-do/notes/other outer application; exact trigger and interaction design; detailed entity semantics; local model choice and where processing occurs in the first demo; precise storage format; exact native delivery strategy; recovery UX and technical approach; broader standalone privacy-engine commercialisation.

**Already reported as implemented elsewhere:** Confessions passkey and multi-device account access. The user reports the coding agent has inspected that codebase. This document does not assert that LuLu's equivalent features are implemented.

## 8. Guidance on interpreting this document

This is a **vision and product-intent document**. Preserve the user's optimistic, outcome-first framing. Let the technical agent investigate accuracy, models, platform trade-offs, data handling, security engineering, and implementation details during its own work. Such investigations are a means to realise the intended experience; they are not part of this document's definition of the idea.

Where past handoffs converted a speculative consideration into a blanket rule or warning, this document replaces that framing with the user-described outcome. The user has deliberately left room for discovery and expects rapid, focused progress towards a compelling demo, followed by refinement.
