> Historical context. Where framing differs, the current [product vision](../../product-vision.md) supersedes this document. Do not promote historical proposals into current technical decisions.

# Recovered Project Ideas: Confessions, the Privacy Layer, LuLu, Decisions API, and SDD

**Historical ideas document — 23 October 2026**  
**Purpose:** Preserve the ideas and their evolution for further product thinking and development. This is not a prescriptive implementation plan or a representation that every discussed feature exists in code.

## Reading key

- **Reported implemented**: The user said they had built or used the capability. Confirmation of specific internal behaviour requires inspection of the current code.
- **User-originated idea / decision**: The user articulated the direction, even if not built.
- **Exploratory / assistant-proposed**: Discussed possibility or interpretation that the user did not necessarily accept.
- **Unavailable**: No reliable original discussion could be recovered. Gaps remain gaps.

**Correction incorporated:** LuLu is **not to use JEV**. The user means **OpenAI's Decisions API**. This names the intended replacement, not an assertion that a particular API endpoint or LuLu integration is already coded or that every prior JEV idea transfers to it.

---

## 1. The idea behind Confessions

### From anonymous expression to persistent trust

**25 August 2025 — initial social concept (user-originated):** A place where people can express vulnerable or personal experiences anonymously, organised into channels and tags. The user wanted some openness for reading, while the system screens submissions for sensitive identifying details and objectionable material. Subjects such as relationships, fashion, sport and interests illustrated that this was meant to be a general community medium rather than one narrow confessional category.

**April 2026 — pseudonymous social relationships (user-originated evolution):** Anonymous expression alone was insufficient. The application needed ways for a person to retain continuity, develop relationships and participate again without having to reveal their legal identity. The product's privacy and trust mechanisms became part of its central identity rather than merely optional features.

The **Noir Editorial** style was selected in parallel: monochrome, typographic, intimate, disciplined and restrained, avoiding typical noisy social-product conventions. This is a product-design decision, not evidence of security architecture.

**Later 2026 — rollout and community ideas (user-originated):** An initial South African/campus focus, read-first openness, invitations or progressive access, channels, tags and passkey onboarding. The user also discussed user-selectable boundaries around sensitive material, age-appropriate access and moderation. The detailed policy mechanisms, thresholds and production readiness are not recoverable from history alone.

### Persistent pseudonymous identity: why it matters

The key reasoning was that **knowing that two interactions came from the same trusted participant need not require knowing who that participant is in the physical world**. This allows continuity, reputation/context and access control without building the product around compulsory name, phone number or email collection. That general idea is potentially reusable beyond the social application.

This is the foundation of the user's later interest in a **separate privacy infrastructure or business**. The generalisable asset is the identity/privacy capability and interaction model, not merely the Confessions user interface.

## 2. Passkeys and identity: reported implementation versus desired properties

**25 May 2026 — earlier technical state:** Discussions described WebAuthn/passkeys, Firebase authentication and anonymous sessions. An observed/problematic route was that Firebase could create an anonymous authenticated session that might be mistaken by application gating for a fully admitted member. An assistant suggested checking the correct account/access state, rather than merely `authenticated = true`; this proposed remedy should not be treated as confirmed delivered functionality.

**30 August–1 September 2026 — user direction:** Build identities around cryptographic credentials/passkeys, keeping conventional PII optional. Preserve user-specific context and relationships without requiring real-world identity.

**21 September 2026 — explicit user report of implementation:** The user said they had implemented **secondary-device synchronisation and account merging using the user's own passkeys**. This is the clearest historical confirmation of cross-device identity continuity. The transcript does not expose enough of the mechanism to specify precisely how WebAuthn assertions, credential registration, Firebase account linking and account reconciliation were implemented.

**Current local-code observation, reported by the Work agent:** Confessions passkey and synchronisation code has been inspected. The actual source files, not this historical document, are authoritative on the exact credential and merge flow.

### Boundaries that matter

1. **Authentication** establishes control of a pseudonymous account or credential.
2. **Cross-device continuation/recovery** enables access from additional devices or after device changes. The exact guarantees depend on the implementation and available credentials.
3. **Content confidentiality** governs who can read posts, messages, evidence and private data. Passkey authentication alone does not establish end-to-end encryption.
4. **Backend information exposure** governs whether the platform, external services or model APIs can see raw data or identifying attributes.
5. **Account recovery policy** determines what happens when credentials are lost or compromised; the history establishes cross-device sync/merging, not a complete adversarially tested recovery protocol.

**Historical storage descriptions:** Firebase services and Firestore were discussed; some local graph/user state was described as associating with a registered identity. Earlier location-related ideas included client-side proximity calculations and coarse locality rather than persistent precise-coordinates storage. These are implementation-history leads; current repository verification is necessary before describing them as current guarantees.

**Not evidenced:** Encryption at every data layer; end-to-end encrypted posts or private journals; formal zero-knowledge design; current key custody/rotation; perfect anonymity; fully specified secure recovery. These are distinct engineering properties and must not be inferred from the use of passkeys.

## 3. Moderation, behavioural context and user-controlled boundaries

**25 August 2025 — initial requirements:** PII screening, content classification, moderation of inappropriate material, and organisation into channels or topics.

**16 August 2026 — user reported operational state:** Moderation was **self-moderated/manual** at that stage. The user wanted to accumulate examples, judgement calls, rules and edge cases before replacing or assisting those judgements with a lightweight model. That sequencing is part of the product thinking: observe a complex judgement process before automating it.

**4 September 2026 — evolving idea:** User-specific tolerance/sensitivity settings and controls over exposure to difficult threads; detaching from or hiding discussion, suppressing notifications and preserving appropriate context. The underlying motivation was that safety is partly about how content reaches an individual, not simply deleting or approving whole posts. More elaborate labels such as active/muted/detached/shielded/hidden/blocked/locked were assistant-generated taxonomies and are not independently confirmed design decisions.

**Broader behavioural idea:** A persistent pseudonymous participant can develop relevant contextual history without demanding identifiable personal information. The discussion did not settle exactly what behavioural features to store, for how long, or how automated decision systems should consume them.

## 4. The reusable privacy layer and why it became a separate idea

The privacy-layer idea emerged from noticing that the engineering challenges inside Confessions were not unique to social applications. A service or application could need continuity, trusted access, context and controlled disclosure without collecting ordinary identity fields.

**User's later commercial concern:** The privacy infrastructure might become a product or technology in its own right. This was specifically cited when discussing hackathon intellectual-property licences: work that might be commercialised as a proprietary system should not be inadvertently exposed merely as demonstration material.

**20–26 September 2026 — adjacent exploratory privacy architecture:** The user also discussed classification/scrubbing of personal information before cloud model access, surrogate identifiers, separated sensitive state and different authorities for identity versus ordinary computation. In discussions involving CogniOne/CUL/CAMP and concepts such as Sentinel/Muse, the assistant proposed isolating credentials, checking egress permissions and supplying models with lower-sensitivity context. Those are **adjacent explorations**, not confirmed Confessions components, and are not assigned to LuLu.

An architectural question running through these discussions is: **What minimum information does each component require to do its job?** That remains a valuable product principle, not proof of a specific implemented data-flow diagram.

## 5. Connection to the FNB safer-communities/GBV exploration

During the 2026 FNB App of the Year Hackathon discussions, the user placed **#5 Safer communities and GBV response** first among the six themes. The concept drew on the established privacy and passkey thinking but was a **new proposed application**, not proof that the listed features exist in Confessions.

Key user-originated elements were:

- A discreet application that appears to be and actually functions as an innocuous utility, such as notes/tasks, while a deliberate concealed interaction provides access to the sensitive space.
- Private incident journalling and an evidence store accommodating photos, messages, audio and documents.
- Cryptographic integrity/timestamp-chain thinking for evidence chronology, with user-directed decisions about disclosure. **Integrity hashing does not provide encryption or independently authenticate the real-world time of an event.**
- Optional second-device or trusted-contact recovery, inspired by the existing passkey identity work but not established as built for the GBV application.
- Relevant support directories and referral pathways that respect user agency; the concept does not establish a live verified NGO/legal/police network.
- A privacy-preserving aggregation/reassurance concept so users can understand patterns without identifying or directly exposing other individuals.
- Different barriers to reporting, including those faced by male survivors, without treating incidence patterns as equal.
- Fast exit and low-exposure interaction as part of the safety approach; practical coercion/device threat models remain to be investigated.
- Potential lightweight content classification to surface context-relevant options rather than making sensitive decisions autonomously.

The user challenged an assistant's automatic call to make the product 'deliberately small'. The preferred conceptual goal was **a coherent, substantively capable experience**, not a broad but disconnected checklist and not an artificially shallow demo. No final feature scope was accepted in the recoverable FNB application discussion.

## 6. LuLu: recovered facts and missing original ideas

**23 October 2026:** A Sonke workspace record identified a **KHÔRA** team and a project named **LuLu**. The Work agent reported finding the **local LuLu directory empty**.

The available prior-conversation search **did not retrieve an original user explanation of LuLu's purpose, product interaction, expected users, tool shortlist or API architecture**. It did not establish that LuLu is part of Confessions, that it provides moderation, or that it inherits Confessions' privacy stack. Nothing in the empty folder can settle those questions.

A previous handoff incorrectly gravitated toward adjacent projects and treated tool lists as possible LuLu sources. Specifically, tools such as ElevenLabs, Tavus, Lingo, Pica, Sentry, Algorand/IPFS, RevenueCat and others appeared in an unrelated **2025 smart-home/Bolt.new hackathon exploration**. Their presence in that discussion **does not connect them to LuLu** and provides no basis for installing them.

### Current user clarification: Decisions API

The user explicitly clarified that **JEV will not be used for LuLu** and that they intend **OpenAI's Decisions API** instead. This is a replacement decision in the present conversation; it is not evidence that the prior LuLu product definition or its proposed operations have been recovered, and it is not proof of an implemented integration.

The exact Decisions API product contract, supported operations, endpoint and deployment/access conditions were not established by the historical conversations. Those require separate first-party documentation once integration work begins.

### JEV is a different historical thread

September 2026 discussions explored JEV/JEV-like fast bounded classifications and decisions for possible content analysis, routing, privacy filtering and actions. Assistant descriptions included a reflexive router with categorical or scored output. The user also considered JEV for visual/spatial state and other work. **Those ideas are not automatically LuLu's feature set.** The present decision to use Decisions API replaces JEV where the user intends, without automatically adopting every speculative JEV application.

**Reliable handoff statement for LuLu:** Its name and workspace existence are known; its original design ideas and tools were not recoverable; its folder was reported empty; the current user says Decisions API, not JEV. An existing LuLu feature list cannot be honestly reconstructed from these sources.

## 7. The intended Spec-Driven Development (SDD) setup

**Project:** the user's open-source **Spec-Driven Development Framework**, at https://github.com/ThisIsPhila/Spec-Driven-Development-Framework.

### Why SDD exists

The user wants a durable, explicit source of truth for human and AI-assisted software construction: what the system is for, what it must do, why design decisions were made, which boundaries matter and what the current work is trying to achieve. A specification should orient implementation, testing, review and subsequent iterations instead of allowing the agent's chat context to become the only project memory.

**March 2026:** User requested a directly actionable framework rather than fragmented template options. Earlier assistant examples used Markdown, Bash/Git hooks, requirements, architecture, tasks, checks and a `.sdd/` convention. Some slogans and layouts, including 'No Spec → No Code', were **assistant proposals**, not necessarily required framework features.

**5 February 2026:** The user specifically wanted the general framework decoupled from private applications such as CogniOne/CUL. An adopter's project should determine the architecture, directory layout and operational practices; the framework should not assume all applications are monorepos or share one DevSecOps structure.

**2 August 2026:** The user explicitly separated **SDD** from a different orchestration/harness concept, whose role would be to discover environment, providers, CLIs, models and available tools and determine execution routes. SDD is the specification/governance discipline; the orchestration framework is a distinct layer. A previous assistant's proposed stack diagram is not itself a completed implementation.

**12 August 2026:** The user described a practice of using an agent to establish UI/design, moving the work into a local project, then using SDD to preserve requirements, security, architecture, development process, and DevOps constraints. Gemini planning followed by DeepSeek implementation was a workflow example, not an SDD dependency.

**15 October 2026:** The user reported that SDD was developing into a visual, accountability-oriented system. A companion browser/web view could visualise decisions, dependency/architecture graphs, branches, files and spec/task progress as the agent naturally updates project artefacts. The point was **observability by convention**, with minimal extra work for an agent and stronger understanding/control for the human. The completion status of that web companion must come from the current SDD repository.

### Relationship to other projects

SDD is deliberately **project-agnostic**. It can guide work on Confessions or a new LuLu project without either project inheriting SDD's demonstration architecture, choosing particular model vendors, or embedding the visual companion inside its runtime application.

The proposed setup is to **capture the actual product idea and decisions in specifications before implementation**, while using the current SDD framework as it really exists in its repository. This is a process intention, not permission to invent LuLu's product requirements because its local folder is empty.

## 8. Idea and decision chronology

| Date | Idea or development | Attribution and status |
|---|---|---|
| 2025-08-25 | Anonymous community expression, channels, PII/content screening | User-originated concept |
| 2026-03 | Open-source SDD and specifications as durable development context | User-established framework; some specific pipeline labels assistant-proposed |
| 2026-04 | Pseudonymous continuity/trust; Noir Editorial identity | User direction |
| 2026-05-25 | Passkey/WebAuthn/Firebase identity and access-gating questions | Earlier implementation discussion, fix proposals not confirmed |
| 2026-08-02 | SDD kept distinct from orchestration/model-harness framework | Explicit user constraint |
| 2026-08-12 | SDD applied after initial UI/design to ground local development | User-described workflow |
| 2026-08-16 | Confessions manual moderation before lightweight automation | User-confirmed then-current state |
| 2026-08-30 to 09-01 | Cryptographic pseudonymous identity and contextual continuity | User direction |
| 2026-09-04 | User sensitivity/exposure controls; thread detachment | User idea; extended states assistant-proposed |
| 2026-09-20 to 09-26 | Privacy filters, surrogate identity and bounded decision-system exploration in adjacent projects | Mixed user exploration/assistant architecture; not confirmed Confessions or LuLu code |
| 2026-09-21 | Secondary-device account sync/merging through passkeys | Explicit user report of implementation |
| 2026-10 | FNB #5 privacy-first GBV response application concepts | User explorations, not confirmed Confessions features |
| 2026-10-15 | SDD visual accountability and graphical project state | User-reported development direction |
| 2026-10-23 | LuLu project in KHÔRA/Sonke; empty directory observed by Work | Workspace record and agent observation |
| 2026-10-23 | LuLu not JEV; OpenAI Decisions API instead | Current explicit user correction; integration not established |

## 9. The ideas in one coherent picture

The established thread is **privacy without compulsory identification**, while still enabling persistent identity and relationships. Confessions supplied the initial product context. Passkeys and cross-device continuity became actual engineering work and suggested the possibility of reusable privacy infrastructure. Moderation and behavioural context opened questions about safe classification and user-controlled exposure. The FNB GBV concept took those principles into a different, safety-critical experience with discreet access and selective disclosure.

SDD provides the user's general method for keeping a project's purpose, decisions, requirements and implementation aligned during agent-assisted development. It is not the runtime decision API and it is not the generic AI orchestration framework.

LuLu is a named project whose detailed prior concept was not recoverable. The specific current correction is clear: **use OpenAI Decisions API rather than JEV**, but the exact task that API should perform within LuLu remains unknown to this historical record. The available conversation does not establish a relationship between LuLu and Confessions merely because both were mentioned in a retrieval request.

## 10. Source limits and safe reuse

This document draws on recoverable prior conversation summaries, current-turn user corrections and an earlier historical handoff. Some historical snippets preserve assistant paraphrase rather than verbatim user text. It does **not** claim access to every earlier chat or the actual contents of the inspected local repositories. The Work agent's code inspection is the authority on current Confessions implementation; the local LuLu directory was reported empty.

For public hackathon or grant application copy, explain proven techniques at a general level. **Do not automatically publish private project names, unannounced business directions, passkey linking/recovery internals, private database schemas, cryptographic designs or architecture diagrams.** The user has consistently preferred clear functional descriptions over unexplained private product names.
