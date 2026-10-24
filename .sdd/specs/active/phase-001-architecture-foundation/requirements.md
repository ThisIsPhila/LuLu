# Phase 001 — Architecture Foundation: Requirements

**Created:** 2026-10-24
**Status:** DRAFT
**Approved:** Pending

## Phase Overview

Establish an implementable architecture for LuLu's web-first hackathon demonstration, starting from the [current product vision](../../../memory/product-vision.md). This phase defines the foundation and delivery path, not the entire product or a standalone privacy SaaS.

The main outcome is a coherent path from natural writing through automatic contextual concealment to protected retrieval. Support an ordinary useful outer application, separate customer/admin surfaces and future mobile clients without requiring all those experiences to be fully implemented in this phase.

## Requirements

### REQ-001.1: Outcome-led demonstration journey

As the team, we need one shared demonstration journey so implementation decisions serve the intended writing experience.

Acceptance criteria:
1. Describe composing natural text, responsive recognition/concealment, optional correction, persistence, protected retrieval and exit.
2. Include people, places, times and relationships; retain the David/Nest/Blue Moon example and at least one cross-entry reference and corrected mistaken association.
3. Do not require users to invent codes, pre-register identities or approve every transformation.
4. Leave visual style, outer-app selection and activation gesture open for the owner's design discussion; identify the decisions needed without choosing them implicitly.

### REQ-001.2: Coherent representations and original-meaning retrieval

As an author, I need concealed writing to remain connected to my original meaning across entries.

Acceptance criteria:
1. Define responsibilities for entity identity, mentions, aliases, contextual references, entry revisions and protected associations.
2. Explain how alias changes and entity corrections affect existing and future entries without losing their relationship to the author's source meaning.
3. Define a feasible retrieval path using the author's original words or associations and describe what information that path requires locally.
4. Distinguish source text, transformed narrative, private mappings and searchable representations; select their exact persistence contracts during design.

### REQ-001.3: Responsive processing and model integration

As a writer, I need transformation to happen naturally without interrupting composition.

Acceptance criteria:
1. Describe incremental processing, visual recognition events and handling of edits arriving while earlier processing is still in flight.
2. Compare feasible local/edge and demonstration processing routes against capability, latency, setup time and supported demo devices using current primary documentation or measured experiments as appropriate.
3. Give OpenAI Decisions API a concrete bounded role and keep recognition/extraction, contextual transformation and decision outputs distinct.
4. Identify replaceable processing interfaces so later device-local inference can preserve the interaction model.
5. Record the selected demonstration route and any differences from the long-term target explicitly; do not present a speculative method as verified.

### REQ-001.4: Protected access and information ownership

As an author, I need access to private associations through the protected experience, without a conventional identity-collection journey.

Acceptance criteria:
1. Define passkey-mediated activation, protected-session authority, private mapping access and exit behaviour as separate responsibilities from record encryption and key custody.
2. Identify what resides on the device, what is synchronised and what reaches model services. Cloud storage and cloud inference must be separate data-flow destinations.
3. Specify customer/admin authority boundaries, including what administrators can inspect and operate without inheriting private mappings.
4. Evaluate reusable Confessions code against the selected design; identify adaptation and independent LuLu responsibilities rather than assuming a wholesale transplant.
5. Describe a feasible first-device and continued-access strategy; separate cryptographic recovery from exploratory user-led re-association.

### REQ-001.5: Project and delivery architecture

As collaborating developers, we need concrete ownership and integration boundaries so we can build concurrently.

Acceptance criteria:
1. Recommend a repository organisation, shared contracts, customer/admin applications and backend responsibilities, with reasons linked to the demonstration journey.
2. Choose runtime, storage, authentication, deployment and model dependencies after evaluating their suitability; current tooling profiles do not decide the product stack.
3. Keep mobile integration feasible while prioritising the working web demonstration; identify mobile-specific work that can follow.
4. Identify file/package ownership and the order shared contracts must stabilise before contributors work independently.
5. Define development, synthetic demo data, configuration and secret handling sufficient to run the chosen stack locally and prepare deployment. Deployment itself requires separate authority.

### REQ-001.6: Demonstration evidence and subsequent phases

As the team, we need a realistic route from architecture to a working submission.

Acceptance criteria:
1. Propose subsequent foundational and experience phases with dependencies, contributor boundaries and a usable end-to-end milestone early in delivery.
2. Define representative synthetic examples covering successful transformation, cross-entry continuity, correction, retrieval and protected exit.
3. Set measurable responsiveness/quality targets during design based on chosen hardware and route; no invented accuracy guarantee.
4. Link architecture decisions to the hackathon security response, demonstration narrative and final submission materials without duplicating those deliverables as product requirements.
5. Separate implemented, locally tested, deployed and owner-reviewed outcomes in completion evidence.

## Phase success criteria

An agreed architecture can guide implementation of the complete demonstration journey. The design explains responsibilities, data flow, contracts, model placement, session/key approach, deployment topology and contributor sequence. Tasks then identify concrete work and verification. Product implementation follows approved tasks; this requirements draft is not execution approval.

## Dependencies and assumptions

- Current vision and owner design discussion, existing SDD installation and the hackathon programme.
- Decisions API is selected; exact use and other dependencies remain design work.
- Confessions code can be inspected locally; no authority to publish its proprietary implementation follows.
- Web-first delivery; customer/admin distinction and future mobile direction retained.

## Privacy & Security Model

Synthetic material is used for architecture experiments. Design must identify trust boundaries, data classification, access, retention/deletion and key lifecycle consistent with the selected route. Frame engineering trade-offs as a way to realise natural writing and user control, not as extra mandatory writing steps. No prescribed privacy package or unverified encryption guarantee is inherited from generic templates.

## Approval

Pending owner review. Next artifact after approval: design.md, following the existing SDD lifecycle.
