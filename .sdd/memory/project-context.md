# LuLu — recovered project context

Updated 2026-10-23. Planning record, not an approved implementation specification.

## Established decisions

- FNB AOTY Hackathon 2026; team KHÔRA; project LuLu; Safety sector; Safer communities and gender-based violence response challenge; virtual solo entry created on Sonke.
- An ordinary, useful companion/utility offers deliberate access to a protected personal space. Proposed capabilities include incident records, supporting material, chronology, discreet navigation and user-directed disclosure.
- AI assistance must not automatically share records or escalate incidents.
- Use the owner's Spec-Driven Development Framework for project governance and GitHub for version control. Framework source: `/Users/phila/Desktop/coding/PROJECTS/Spec-Driven-Development-Framework`.
- Use OpenAI Decisions API instead of JEV. Other tools, model roles and the application stack remain unresolved.
- Existing private products and reusable privacy infrastructure are distinct from this hackathon build. Do not publish proprietary internals or assume reuse means permission to disclose.

## Verified sources and boundaries

OpenAI guide: https://developers.openai.com/api/docs/guides/decisions

Decisions evaluates text, images and JSON into predicate probabilities, fixed choices or rubric scores. It uses the dedicated `/v1/decisions` endpoint. General extraction into custom schemas or written explanations belongs to a separate generation capability; no selection of that capability is established yet.

Confessions inspected locally at `/Users/phila/Desktop/coding/BUSINESS/confessions-live`: WebAuthn/passkeys with Firebase custom-token authentication; short-lived single-use device exchanges; invitation/account-state controls; native authentication relay code. Older documentation conflicts with current native relay source. Source inspection is not deployment verification or a security audit. No client-side evidence-vault encryption was established by the inspected authentication and sync code.

## Ideas awaiting design

- Exact everyday utility and protected-access interaction.
- Vault encryption, key lifecycle, recovery and attachment storage.
- Whether and how to reuse identity infrastructure without coupling user identities between products.
- Decisions API questions, thresholds, evaluation examples and permitted downstream actions.
- What information the user explicitly chooses to send for external AI processing.

## Hackathon checkpoints

- Friday: team/project update and progress update before midnight.
- Saturday 24 October: SSDLC/security update 12:00–12:30; 20-second HustleWindow video 13:30; nightly progress update.
- Sunday 25 October: Lean Business Canvas 12:00–12:30; mentor support ends with weekend event.
- Monday 26 October 23:59: final app, slides, demo access and repository link. Programme lists this final deadline separately from Sunday's event end.
- Older dashboard pitch text says noon; programme and team-centre upload control say 13:30. Check organiser updates for changes.

## Context retrieval limitation

The original “Hackathon Analysis and Advice” chat is accessible, but assistant replies are returned as opaque content references. User-pasted handoffs and saved Sonke profile were read directly. A follow-up requested a plain-text file/attachment containing privacy-layer and tooling ideas, including the correction that JEV is not being used. Do not treat that unrecovered reply as read.
