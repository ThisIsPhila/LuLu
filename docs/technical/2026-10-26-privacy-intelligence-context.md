Whats the TLDR?

For LuLu, use a small, specialised on-device PII detection model rather than Jev or OpenAI's Decisions API.

1. Jev and OpenAI Decisions: Powerful System 1 decision models, but cloud-hosted. Their model sizes aren't publicly disclosed, and they cannot currently run locally on mobile.

2. GLiNER Small (166M parameters): My preferred starting point. Open source, potentially under 100 MB with 4-bit quantisation, and designed to identify entities such as names, addresses and organisations. Mobile integration requires testing.

3. GLiNER Multi PII (209M parameters): Specialised for sensitive personal information. Potentially more accurate for LuLu, but requires benchmarking.

4. Google ML Kit: Practical native Android/iOS alternative for detecting common identifiers, although its coverage is limited.

5. Decider 0.8B: A System 1-style model potentially suitable for mobile, but considerably larger at approximately 400 MB quantised. Useful for contextual privacy decisions rather than primary PII extraction.

Recommended LuLu architecture:

User Input → On-device PII Detection → Local Redaction → Verification → Cloud

The app detects and replaces identifiable information before transmitting anything.

My recommendation: Start with GLiNER + deterministic detection rules, benchmark against GLiNER Multi PII, and introduce a small System 1 model only if contextual privacy classification requires it.

The important distinction: PII detection identifies exactly what to remove; System 1 decision models determine whether something should be considered risky. LuLu may eventually need both, but PII detection comes first.
Give me a detailed erport on this idea
LuLu: On-Device Privacy Intelligence

Technical feasibility, model selection, security architecture and implementation strategy

Research report

26 October 2026

South African deployment context
Executive assessment

LuLu should implement privacy protection as an on-device processing capability, not merely as a cloud-based moderation feature. The proposed system would inspect text before transmission, detect personally identifiable information (PII), transform sensitive references, and prevent unapproved content from crossing the device's privacy boundary.

The technical approach is feasible with existing open-source NLP models, deterministic detection algorithms and mobile inference frameworks. The harder problem is not whether models can recognise names, telephone numbers or addresses. It is determining which information identifies a person within the context of a user's disclosure, while preserving the meaning of that disclosure.

This distinction is especially important for LuLu if users are discussing sensitive personal experiences, institutions, relationships or incidents.

The proposed architecture has three components:

    A local entity detection engine that identifies explicit personal information and returns precise text spans.

    A contextual privacy assessment engine that evaluates indirect identification risks not covered by ordinary entity recognition.

    A deterministic sanitisation and verification gateway that controls what information is permitted to leave the device.

These components should remain independently replaceable, so improvements in models do not require redesigning the surrounding privacy infrastructure.

Overall feasibility assessment

On-device inference
Feasible
With mobile-compatible models and supported hardware

Explicit PII detection
High potential
Established NLP and pattern recognition techniques

Contextual identification
Research risk
Requires application-specific evaluation

Privacy guarantees
Conditional
Depends on enforcement, coverage and residual risk

Primary recommendation: Build an initial privacy engine using deterministic recognisers and GLiNER-based entity extraction. Evaluate a specialist PII model against a smaller general-purpose model. Only introduce a System One-style decision model when its measurable contribution to contextual identification justifies its additional runtime cost.

A significant caveat is that automated sanitisation cannot establish anonymity in every case. Strong protection requires an enforcement architecture, conservative handling of unrecognised content, and explicit acknowledgement of residual re-identification risk.
1. Problem definition
1.1 The privacy exposure

Consider a LuLu user submitting the following text:

    My supervisor at a small medical practice in Midrand threatened to dismiss me after I reported an incident. It happened on 14 October, and only three of us were working that evening.

This example contains no full name, email address or identity number. Yet the combination of an organisation type, location, exact date, job relationship and unusually small group may be enough to identify the people involved.

A conventional PII detector might identify the location and date while missing the broader risk.

That creates two distinct classes of information:

Classification
	

Description
	

Example

Direct identifiers
	

Data identifying someone relatively explicitly
	

Full name, telephone number, ID number

Quasi-identifiers
	

Details that become identifying when combined
	

Job title, location, date, organisation size

Sensitive attributes
	

Information requiring special protection
	

Health information or intimate disclosures

Contextual references
	

Relationships that identify individuals indirectly
	

“The only female manager in our department”

Technical identifiers
	

Metadata and device-related identifiers
	

IP address, GPS coordinates, account IDs

Sensitive information is not necessarily identifying, and identifying information is not necessarily sensitive. LuLu must treat these as related but distinct dimensions.
1.2 The proposed outcome

LuLu's privacy system should allow users to express meaningful experiences while reducing the likelihood that those experiences reveal the identities of people involved.

It should aim to preserve the semantic content of a disclosure, minimise identifiable detail, and ensure that no application-controlled cloud request transmits unapproved raw content.

This suggests a general architecture:

User composition

Original text exists in local application memory

Trusted on-device processing
Local

Pattern matching

Structured identifiers

NER inference

Names and organisations

Context analysis

Indirect exposure

Policy evaluation

Risk and user control

Redaction and pseudonymisation

Independent output verification

Outbound policy enforcement

Allow · Require revision · Block

Cloud infrastructure

Receives only authorised transformed content

The intended privacy invariant is:
OutboundPayload⊆ApprovedSanitisedData
OutboundPayload⊆ApprovedSanitisedData

This is an architectural property that can be enforced and tested. It is stronger than merely relying on a model to flag inappropriate content.
2. Technology landscape and model selection
2.1 What System One models actually contribute

The motivation for investigating Jev and OpenAI's Decisions API is sound. Many application workflows do not need an expensive generative response. They need a constrained decision that software can interpret directly.

Instead of asking a general-purpose model to write an explanation of whether a disclosure is identifying, the system could ask:

    Does this text contain enough contextual information to identify a specific individual?

A decision model returns a probability or predefined classification. The application then decides what action to take.

This avoids using free-form text generation as the control mechanism.

However, the distinction between a decision model and an entity recognition model is fundamental.

Task
	

Decision model
	

Entity recognition model

Is this disclosure potentially identifying?
	

Suitable
	

Limited

Which privacy category applies?
	

Suitable
	

Partially suitable

Which exact characters form a person's name?
	

Not its primary output
	

Suitable

What should be replaced?
	

Can help determine policy
	

Supplies candidate spans

Should publication proceed?
	

Suitable with policy constraints
	

Insufficient alone

Can it guarantee safe publication?
	

No
	

No

A well-designed LuLu implementation should treat these as complementary inference functions rather than competing categories of AI technology.
2.2 Jev and OpenAI Decisions API

Characteristic
	

TypeSafe Jev
	

OpenAI Decisions API

Core objective
	

Typed probabilistic decisions
	

Typed probabilistic decisions

Interface
	

System One endpoint
	

/v1/decisions

Inputs
	

Text and structured state
	

Text, JSON and images

Response types
	

Choice, score, yes/no probability
	

Predicate, choice, score

Execution
	

Hosted API
	

Hosted API

Published downloadable weights
	

Not established
	

Not provided

Public parameter count
	

Not established
	

Not disclosed

Applicable to raw local PII filtering
	

No, when accessed through hosted API
	

No, when accessed through hosted API

Applicable after sanitisation
	

Yes
	

Yes

OpenAI's Decisions API became generally available on 22 October 2026. It currently supports GPT-6 Luna, accepts up to 400 questions per request, and is priced at $0.10 per million uncached input tokens, excluding applicable premiums. 
OpenAI API
+1

Jev's published API documentation describes its choice, score and noul decision types and versioned model identifiers including jev-1.13.0. 
Jev Model Guide
+1

Neither service currently supplies the essential deployment property required for LuLu's first-stage privacy processing: a documented, locally executable model artefact.

Consequently, a hosted decision API should only receive input after LuLu has already performed its local privacy controls.

There is another consideration: a System One interface is not necessarily evidence of a radically smaller model. OpenAI's service uses a specialised inference pathway for GPT-6 Luna, not a separately downloadable model whose parameter count or memory footprint has been published.
2.3 Candidate open-weight models

The strongest candidates for this use case are the GLiNER family and smaller decision-classification models.

Candidate
	

Size
	

Principal capability
	

Assessment

GLiNER Small v2.1
	

166M parameters
	

Configurable named entity recognition
	

First model to benchmark

GLiNER Multi PII
	

~209M parameters
	

Specialised PII span extraction
	

Strong comparative candidate

Decider 0.8B
	

800M parameters
	

Typed decisions
	

Optional contextual classifier

Google ML Kit
	

Managed SDK/models
	

Standard entity extraction
	

Lightweight baseline

Microsoft Presidio
	

Framework, not one model
	

Recognition and anonymisation
	

Architectural reference

GLiNER Small v2.1 is a 166M-parameter English-language model with an Apache 2.0 licence and a published model repository of approximately 611 MB. Its architecture uses a bidirectional encoder for extracting user-defined entity categories. 
Hugging Face
+1

GLiNER Multi PII is trained on a synthetic PII dataset and includes a larger range of identifier classes, such as identity documents, financial information, addresses and medical-related entities. It is multilingual, but South African language coverage must not be assumed from the multilingual designation. 
Hugging Face

Decider 0.8B is an open-weight decision model based on Qwen3.5-0.8B. Its model card explicitly identifies limitations around English-only processing, instruction-following reliability and probability calibration. Therefore, it is an experimental candidate for LuLu, not an established privacy classifier. 
Hugging Face
2.4 Model storage and memory requirements

It is essential to distinguish four different measurements:

    Parameter count.

    Model weight storage.

    Packaged application or downloaded model size.

    Peak inference memory.

These are not interchangeable.
Theoretical model weight storage by precision

Decimal MB, excluding tokenisers, runtime and execution overhead. These are estimates, not measured mobile package sizes.
FP32
INT8
4-bit theoretical
0 MB850 MB1.7K MB2.6K MB3.4K MB
GLiNER Small 166M
GLiNER PII 209M
Decider 800M

    GLiNER Small 166M: FP32 664 MB, INT8 166 MB, 4-bit theoretical 83 MB
    GLiNER PII 209M: FP32 836 MB, INT8 209 MB, 4-bit theoretical 104.5 MB
    Decider 800M: FP32 3.2K MB, INT8 800 MB, 4-bit theoretical 400 MB

Storage calculated from parameter count and numerical precision. Practical quantisation may introduce extra scales, metadata and mixed-precision tensors.

These figures make GLiNER Small an attractive candidate, but they do not demonstrate that an 83 MB working mobile package is currently available.

Mobile feasibility also depends on:

    Whether ONNX or Core ML conversion supports the model's operators.

    Whether quantisation materially changes extraction accuracy.

    Peak runtime memory, including activations.

    Tokenisation overhead and text length.

    Hardware acceleration and CPU fallback.

    Battery and thermal performance during repeated inference.

In particular, a 4-bit theoretical model size should never be treated as a confirmed mobile deployment size.

Google's ML Kit provides a lighter starting point for common entities, but its entity extraction API prioritises precision, may miss valid entities, and uses dynamically downloaded models. Its documented language support does not include isiZulu or isiXhosa. 
Google for Developers
+1
2.5 Selection conclusion

For a text-first privacy engine, the recommended order of investigation is:

GLiNER Small → GLiNER Multi PII → optional contextual classifier.

ML Kit should be retained as a comparator, not necessarily as the sole production detector.

Microsoft Presidio is useful for its separation of recognisers and anonymisation operators. Its own documentation explicitly states that automated recognition cannot guarantee detection of all sensitive information. 
Presidio

The model decision should ultimately be empirical. A larger specialised model is justified only if its gains in detection performance outweigh its impact on download size, memory consumption, latency and device coverage.
3. Detailed privacy engine architecture
3.1 Processing boundaries

The design should define four logical domains.

Domain
	

Data allowed
	

Security responsibility

Local composition
	

Original user content
	

Protect unsanitised text

Local analysis
	

Original text and detection metadata
	

Execute models without transmission

Local transformation
	

Original and sanitised representations
	

Produce approved outbound data

External services
	

Approved sanitised payload
	

Store, process and distribute authorised information

This separation is more important than the choice of model.

If an analytics SDK can read the original composition field and transmit it independently, even perfect entity detection offers no protection against that leakage.

All outward-facing application operations involving user-generated content must therefore pass through the same policy boundary.
3.2 Detection pipeline

The proposed first-stage processing sequence is:

A. Input normalisation

Normalise Unicode, preserve the original input, and create a representation suitable for model inference.

Normalisation is particularly important for identifying phone numbers or addresses obscured by spacing, punctuation, unusual Unicode characters or deliberate obfuscation.

Offset mappings must be maintained between the normalised representation and original text.

B. Deterministic detection

Apply specialised recognisers for structured data.

For South Africa, initial targets should include mobile and landline telephone numbers, email addresses, national identity numbers, passport-like identifiers, bank account patterns and payment card numbers.

Some categories support validation through checksums or format rules. Others, such as bank accounts, may require contextual evidence because purely numerical detection can create excessive false positives.

C. Semantic entity recognition

Apply a trained NER model to identify names, organisations, locations and other entity categories.

The model should return structured detection results:

{
  "start": 24,
  "end": 37,
  "label": "PERSON",
  "confidence": 0.96,
  "source": "local_ner"
}

This is an illustrative internal contract, not the schema of a particular model API.

D. Detection reconciliation

Merge overlapping predictions from rules and machine learning.

For example, a deterministic email detector should not be overridden by a lower-confidence generic text classification.

E. Contextual identification assessment

Inspect the remaining text for combinations of information that might permit identification.

This is the least mature part of the pipeline and should be introduced as a separate component, with its own dataset and performance requirements.

F. Transformation and independent verification

Perform deterministic replacement, preserve a local record of which spans were transformed, and run a verification pass over the final output.

A verification failure should prevent automatic publication.
3.3 The transformation strategy

Three principal strategies should be supported.

Redaction
Highest removal

Original

I spoke to Nomsa Dlamini about the incident.

Transformed

I spoke to [REDACTED] about the incident.
Removes the reference, but sacrifices some information about the subject.

Typed pseudonymisation
Preserves relationships

Original

Nomsa told Sipho what happened, and Sipho contacted Nomsa.

Transformed

[PERSON_1] told [PERSON_2] what happened, and [PERSON_2] contacted [PERSON_1].
Preserves intra-document references while concealing explicit names. Does not necessarily prevent re-identification.

Generalisation
Context protection

Original

On 14 October, at a small specialist practice in Midrand...

Transformed

In October, at a medical workplace in Gauteng...
Reduces specificity of quasi-identifiers, but requires assessment of whether the remaining details are still identifying.

The correct technique depends on the entity category and the disclosure.

For example, a date may be central to an allegation, whereas an exact street address might be unnecessary. Removing both indiscriminately could damage the usefulness of the content.

This argues for an explicit entity policy rather than a single instruction such as “remove all PII”.
3.4 An explicit policy contract

An internal policy could resemble:

privacy_policy:
  default_action: REVIEW

  rules:
    EMAIL:
      action: REDACT

    PHONE_NUMBER:
      action: REDACT

    NATIONAL_ID:
      action: REDACT

    PERSON:
      action: PSEUDONYMIZE
      scope: SUBMISSION

    STREET_ADDRESS:
      action: GENERALIZE

    ORGANIZATION:
      action: CONTEXTUAL_REVIEW

    EXACT_DATE:
      action: CONTEXTUAL_REVIEW

  failure_handling:
    model_unavailable: BLOCK
    parser_failure: BLOCK
    unsupported_attachment: BLOCK
    verification_failure: BLOCK

  outbound:
    require_approved_payload: true
    transmit_raw_input: false

This is a proposed application policy, not a legal or universal privacy standard.

The central benefit is that policy behaviour is declarative and testable. A model determines candidate facts; deterministic software determines what to do with them.
4. Mobile deployment strategy
4.1 Native inference versus hosted inference

For LuLu, the defining technical constraint is that inference involving original content must take place locally.

This rules out any design where raw user text is sent to a remote PII classification service, even if that service promises not to retain the text.

The eligible execution environments are therefore mobile inference frameworks capable of loading models and executing them inside the device's application environment.

The main practical choices are:

Runtime
	

iOS
	

Android
	

Role

ONNX Runtime Mobile
	

Yes
	

Yes
	

Shared inference engine

Core ML
	

Yes
	

No
	

Apple-native acceleration

Android NNAPI / XNNPACK
	

No
	

Yes
	

Android inference acceleration

Google ML Kit
	

Yes
	

Yes
	

Managed entity recognition

Apple Foundation Models
	

Supported Apple devices
	

No
	

Optional contextual intelligence

ONNX Runtime is particularly relevant because its mobile deployment architecture supports CPU execution across platforms and selected hardware execution providers on Android and iOS. Its documentation also recommends benchmarking quantised models on CPU before assuming hardware acceleration will improve results. 
onnxruntime

Apple's Foundation Models framework provides access to on-device intelligence and structured generation capabilities, subject to device and operating-system availability. This makes it interesting for contextual privacy assessments, although it should not be relied upon as the universal engine across both platforms. 
Apple Developer
4.2 Recommended cross-platform design

The application should expose one privacy inspection contract while allowing platform-specific inference adapters.
LuLu Application
    |
    v
PrivacyEngine
    |
    +-- InputNormalizer
    |
    +-- DeterministicRecognizer
    |
    +-- EntityRecognizer
    |      |
    |      +-- ONNX Adapter
    |      +-- Core ML Adapter
    |      +-- ML Kit Adapter
    |
    +-- ContextualRiskEvaluator
    |
    +-- Sanitizer
    |
    +-- VerificationEngine
    |
    +-- PrivacyPolicy
    |
    v
ApprovedOutboundPayload

This separates the inference technology from the application contract.

The same policy rules, entity taxonomy, detection reconciliation logic and verification requirements should apply across platforms.

Native bindings should only be responsible for loading models, executing inference and translating model-specific output into a common detection schema.
4.3 Proposed runtime interface

A platform-independent TypeScript-facing interface could look like this:

type EntityType =
  | "PERSON"
  | "ORGANIZATION"
  | "LOCATION"
  | "PHONE_NUMBER"
  | "EMAIL"
  | "NATIONAL_ID"
  | "FINANCIAL_IDENTIFIER"
  | "OTHER";

interface DetectedEntity {
  start: number;
  end: number;
  type: EntityType;
  confidence: number;
  detector: string;
}

interface PrivacyAssessment {
  entities: DetectedEntity[];
  contextualRisk: "low" | "medium" | "high" | "unknown";
  sanitizedText: string;
  action: "allow" | "review" | "block";
  policyVersion: string;
  modelVersion: string;
}

interface PrivacyEngine {
  inspect(text: string): Promise<PrivacyAssessment>;
}

For production use, offsets must have a specified unit, such as UTF-16 code units or Unicode scalar indices. Otherwise, cross-platform differences can cause incorrect replacements, especially with emoji, combining characters and multilingual text.

The outbound network layer should not accept arbitrary strings directly. It should require a payload created by the privacy service.

That can be enforced through a type-controlled interface in the application architecture, supported by runtime validation at the final transmission boundary.
4.4 Device performance targets

The following are proposed engineering targets for the first release, not measured performance claims.

Metric
	

Proposed target

Typical text length
	

100–2,000 characters

Local inspection latency
	

p95 under 500 ms for short posts on reference devices

Cold model loading
	

Under 3 seconds

Inference memory overhead
	

Preferably under 300 MB

Model package
	

Preferably under 150 MB

Offline operation
	

Complete detection and transformation

Network dependence
	

None during privacy inspection

Battery consumption
	

No persistent inference while idle

These targets should be validated on actual low-end, mid-range and high-end devices.

For an early prototype, a slower first inference is acceptable. For a production composition interface, latency becomes a product requirement because users may expect immediate feedback while writing.
4.5 Progressive inspection

Continuous full-model inference on every keystroke would be unnecessarily expensive.

A more efficient architecture separates real-time feedback from submission-time verification.

Composition phase

Run lightweight incremental checks and debounced entity detection after meaningful changes. Show useful feedback without interrupting the user.

Submission phase

Run a complete inspection over the canonical final content, including contextual analysis and applicable attachments.

Transmission phase

Freeze the approved representation, verify its integrity, and transmit only that exact representation.

This final step also guards against a time-of-check/time-of-use error, where text changes after inspection but before submission.
5. File and modality processing
5.1 Scope of the first release

Text should be the first supported modality.

The complexity of privacy inspection increases substantially when the system accepts attachments. In particular, detecting personal information inside a PDF is not the same as removing that information from the PDF.

Deleting a visible text span may leave the original bytes, an OCR layer, document metadata, thumbnails or embedded objects intact.

The recommended scope is:

Format
	

Detection approach
	

Safe output approach
	

Release

Plain text
	

Rules and NER
	

Direct substitution
	

Initial

Structured JSON
	

Schema-aware traversal
	

Transform values
	

Initial, for internal data

PDF
	

Local text extraction and OCR
	

Rebuild/redact and validate
	

Later

DOCX
	

XML and embedded object parsing
	

Rebuild sanitised document
	

Later

Images
	

OCR, metadata analysis, face/object detection
	

Remove metadata and modify pixels
	

Later

Audio
	

Local ASR and audio analysis
	

Redacted transcript or edited audio
	

Later

Video
	

Frame analysis and transcription
	

Media transformation and re-encoding
	

Later

Archives
	

Recursive bounded inspection
	

Sanitised archive reconstruction
	

Deferred

File handling should be treated as a separate security surface.

In images, faces, uniforms, number plates and background locations can reveal identities even without readable text.

Similarly, an audio recording may identify a speaker through voice characteristics despite containing a sanitised transcript.

For LuLu's initial implementation, supporting raw text securely is more valuable than accepting numerous file formats with incomplete privacy coverage.
5.2 Document handling requirements

When expanding into documents, the processor should account for:

    Embedded text and scanned content.

    File metadata, authorship fields and revision history.

    Comments and hidden text.

    Embedded images and objects.

    Hyperlinks and external references.

    Password-protected or malformed files.

    Parser and decompression vulnerabilities.

The system must operate locally and reject files it cannot inspect to the required level.

Any reconstructed file should undergo a separate verification pass before upload.
5.3 Input limits and abuse resistance

Adversarial users may intentionally submit data designed to evade detection or exhaust the device's resources.

The pipeline should enforce input-size limits, bounded inference time, supported file types, recursion depth limits, decompression limits and cancellation behaviour.

Unicode confusables, zero-width characters, separated digits and intentionally misspelt names should be represented in the adversarial evaluation suite.

These controls protect both privacy and application availability.
6. Threat model

The threat model should distinguish between information leakage through LuLu's own systems and re-identification after content has been published.

They require different mitigations.
6.1 Primary threat scenarios

Threat
	

Consequence
	

Mitigation

Model misses a person's name
	

Identity disclosed
	

Multiple detectors, benchmarks, review

Quasi-identifiers remain
	

Indirect re-identification
	

Contextual analysis, generalisation

Raw content enters logs
	

Permanent sensitive copy
	

Logging controls, data minimisation

Analytics records composition text
	

Third-party exposure
	

Explicit instrumentation restrictions

Network request bypasses inspection
	

Privacy boundary violation
	

Central outbound gateway

Model download unavailable
	

User cannot be protected
	

Offline provisioning or fail-closed behaviour

Unsafe model update
	

Detection behaviour degrades
	

Signed, versioned and tested releases

Local cache persists raw content
	

Device-level exposure
	

Encryption and retention controls

Reused pseudonyms link posts
	

Cross-post correlation
	

Per-submission pseudonym scope

Attachment retains metadata
	

Hidden identifier disclosure
	

Metadata removal and reconstruction

Malicious app or compromised OS
	

Raw data exposure
	

Platform security; no absolute guarantee
6.2 Why the network boundary is critical

A privacy-focused UI does not automatically imply privacy-focused application behaviour.

For example, an application might inspect text correctly while its crash-reporting infrastructure records the original request body during an exception.

Other exposure paths include analytics events, diagnostic logs, third-party SDKs, notification previews, backups, clipboard history and automatic drafts.

The privacy design must explicitly define which subsystems can access original content.

A defensible rule is:

Unsanitised content should never enter generic telemetry, persistence, queueing or network infrastructure.

This policy should be enforced through architecture tests, static analysis, integration tests and production configuration reviews.
6.3 Residual identification risk

Suppose LuLu produces:

    I work at a small medical practice in Midrand. My manager threatened to dismiss me after an incident.

All direct identifiers might have been removed, but the remaining content could still identify someone to a colleague familiar with the event.

The system should therefore represent residual risk separately from entity detection confidence.

A low number of detected entities is not proof of anonymity.

For highly specific disclosures, the UI could offer progressively stronger transformations:

    Remove direct identifiers.

    Generalise location, dates and workplace details.

    Request user review for residual identification risk.

    Prevent publication when a mandatory protection policy cannot be satisfied.

The objective is not to suppress meaningful experiences. It is to make privacy trade-offs explicit before publication.
7. Evaluation and benchmarking methodology

The most important research deliverable before selecting a production model is a representative evaluation dataset.

Model-card performance cannot be assumed to generalise to LuLu's content.
7.1 Required test categories

The benchmark should contain:

Dataset category
	

Purpose

Names and ordinary identifiers
	

Measure direct PII extraction

South African ID and telephone patterns
	

Validate localised recognisers

Organisations and institutions
	

Evaluate contextual references

Informal English and slang
	

Test natural user expression

Code-switched multilingual text
	

Expose language limitations

Indirect identification
	

Measure quasi-identifier risk

Repeated references
	

Test pseudonym consistency

Deliberate obfuscation
	

Test evasion resistance

Non-identifying content
	

Measure false positives

Sensitive disclosures without identifiers
	

Test preservation of meaning

Synthetic data is useful for controlled cases but should not be the sole evaluation source. Realistic, consented and securely handled data will eventually be needed to measure language and behavioural variation.
7.2 Measurement framework

Entity recognition should be evaluated at both entity and character-span levels.

The primary metrics are:
Precision=TPTP+FP
Precision=TP+FPTP​
Recall=TPTP+FN
Recall=TP+FNTP​
F1=2PRP+R
F1​=P+R2PR​

For privacy protection, recall is particularly important because a false negative may result in a disclosure. However, uncontrolled false positives can remove so much detail that users cannot express themselves effectively.

The evaluation should also include:

Metric
	

Interpretation

Entity recall
	

Proportion of true identifiers found

Entity precision
	

Proportion of predicted identifiers that are correct

Exact-span accuracy
	

Whether boundaries are correctly identified

Residual PII rate
	

Identifiers surviving sanitisation

Contextual risk recall
	

Identification risks correctly flagged

Semantic preservation
	

Meaning retained after transformation

p50/p95 latency
	

Typical and tail inference time

Peak RSS memory
	

Device memory pressure

Energy consumption
	

Battery cost per inspection

Cross-device consistency
	

Behaviour across hardware and OS versions
7.3 Proposed acceptance gates

The following are proposed starting targets, subject to feasibility testing:

Evaluation
	

Initial target

Structured identifier recall
	

≥99% on supported, well-defined formats

Name and organisation recall
	

≥95% on in-domain labelled data

Residual direct identifiers
	

Less than 1% of labelled instances

Critical outbound bypasses
	

Zero in the test suite

Offline processing
	

100% of supported text workflows

p95 short-post processing
	

Under 500 ms on reference devices

Unsupported input handling
	

No raw-content upload

These are engineering targets, not measured results or promises.

The team should report results by language, entity category and device class, not just a single aggregate F1 score.

For contextual re-identification, a useful evaluation set should include scenarios where human reviewers familiar with a hypothetical community might reasonably connect the disclosure to a particular person.

This will require explicit annotation guidelines and careful privacy controls around evaluation data.
7.4 Benchmark matrix

A comparative experiment should test the same cases against different detection configurations.

Configuration
	

What it establishes

Rules only
	

Baseline structured identifier coverage

ML Kit only
	

Lightweight managed model baseline

GLiNER Small only
	

Compact semantic extraction performance

GLiNER Multi PII only
	

Specialist model performance

Rules + GLiNER Small
	

Hybrid improvement

Rules + GLiNER Multi PII
	

Specialist hybrid improvement

Hybrid + contextual classifier
	

Incremental contextual value

The final configuration should be selected using a multi-objective assessment of privacy recall, semantic retention, inference latency, memory and operational complexity.

A contextual decision model should not be adopted merely because it returns a useful-looking confidence score. That score must be calibrated against LuLu's own examples.
8. Regulatory and governance considerations
8.1 POPIA and de-identification

South Africa's Protection of Personal Information Act (POPIA) is directly relevant.

The Act defines de-identification in terms of removing information that identifies a data subject, could reasonably foreseeably be used to identify them, or could be linked to other identifying information through a reasonably foreseeable method. 
Justice Department

This has an important architectural implication: replacing names with placeholders does not automatically mean the content qualifies as de-identified under POPIA.

LuLu's approach must account for reasonably foreseeable linkability and re-identification, especially when a publication describes a recognisable incident.

An additional legal review should address the grounds for processing, special personal information, retention, access rights, security safeguards, international transfers and notification obligations.

The proposed privacy engine can support compliance, but it cannot substitute for the full governance framework.
8.2 Privacy by design

The following principles should guide the implementation.

Data minimisation: Collect and transmit only what is necessary for the application to operate.

Local-first processing: Inspect original content before permitting cloud transmission.

Purpose limitation: Do not repurpose original drafts or detected entities for unrelated analytics or profiling.

Controlled retention: Avoid persisting raw drafts unnecessarily. Encrypt stored local drafts and provide deletion mechanisms.

Independent verification: Validate the final outbound artefact rather than trusting the detector alone.

Transparency: Explain what was modified and allow the user to review the transformed content.

Auditability: Record model versions, policy versions, processing outcomes and system errors without recording the original sensitive text.
8.3 Governance of model updates

One of the risks of using pre-trained models is that a model update may change classification results without any modification to LuLu's application code.

Model packages should therefore be versioned and deployed through a controlled release process.

Every proposed update should undergo regression testing against the same benchmark dataset.

At minimum, the release process should check that no protected entity category experiences a material decline in recall and that latency and memory remain within supported device requirements.

Any reduction in privacy coverage should prevent automatic promotion of the new model.
9. Product experience and human interaction

The privacy layer should not make the user feel as though they are completing a compliance form.

The experience should be integrated into ordinary writing and publishing behaviour.
9.1 Proposed composition experience

LuLu · Create a post
Local draft
My supervisor at Acme Clinic in Midrand threatened to dismiss me after I reported an incident on 14 October.

Interactive concept, no AI detection is being run

The privacy engine should provide user-facing explanations only when necessary.

For example, the application could identify a workplace reference and explain that it may reveal the identity of someone involved.

The user should then be able to inspect a proposed transformation, compare the original and revised versions, and make an informed decision.

User approval should not permit bypassing mandatory protections for third-party information where the product's policy prohibits such disclosure.
9.2 Avoiding over-sanitisation

A system that removes every reference to a place, date, role or organisation would undermine the purpose of a disclosure-oriented application.

Meaningful stories depend on context.

LuLu should therefore distinguish between information that is necessary to express an experience and information that creates avoidable identification risk.

The system should favour the least destructive transformation that satisfies the applicable privacy policy.

In practice, this may mean retaining a reference such as “my supervisor” while removing an exact organisation name, location and incident timestamp.

Semantic preservation should be treated as a measurable product requirement, not an informal preference.
10. Implementation roadmap

The implementation should be divided into stages that progressively reduce technical uncertainty.

Phase 1: Detection research and benchmark

Proposed planning allocation: 1–2 weeks

Assemble a synthetic South African PII dataset, establish rules-only baselines, and evaluate GLiNER Small, GLiNER Multi PII and ML Kit where applicable. Record accuracy, model storage and inference behaviour.

Phase 2: On-device inference proof of concept

Proposed planning allocation: 1–3 weeks

Convert the selected model to a compatible mobile format, validate tokenisation and span extraction, and measure latency and memory on physical devices.

Phase 3: Privacy gateway integration

Proposed planning allocation: 1–2 weeks

Implement the entity taxonomy, policy engine, transformations, verification, local storage restrictions and central outbound enforcement.

Phase 4: Contextual risk research

Proposed planning allocation: 2–4 weeks

Develop examples of indirect identification and evaluate whether a compact local decision classifier improves protection beyond entity extraction and deterministic policies.

Phase 5: Security and release validation

Proposed planning allocation: 1–2 weeks

Conduct adversarial tests, network inspection, regression tests, multilingual evaluations and device compatibility testing. Review retention and governance policies before release.

These allocations are planning estimates rather than delivery commitments. Several phases can overlap, and specialised multilingual training or difficult model conversion may expand the scope substantially.
10.1 First-release acceptance criteria

Before the privacy engine is considered suitable for production, the team should demonstrate that:

    All supported text inspection and transformation functions operate without internet access.

    No application-controlled outbound path can transmit an unsanitised user draft.

    Entity detection and replacement preserve correct character boundaries across Unicode input.

    Unsupported content and failed inspection attempts are blocked by default.

    Model versions, policy versions and benchmark results are traceable.

    The user can meaningfully inspect proposed transformations.

    A defined set of privacy, performance and adversarial tests passes across the supported device matrix.

The release decision should be based on measured evidence, not merely the successful integration of a model.
11. Long-term architectural opportunities

Although the immediate requirement is PII sanitisation, the proposed privacy engine could become a reusable application capability.
11.1 Independent privacy service within the device

A stable interface could expose operations such as:

privacy.inspect(input)
privacy.sanitize(input, policy)
privacy.verify(output)
privacy.assessContext(input)

This would allow the same infrastructure to operate across composition, private messaging, document uploads and future user-generated content workflows without duplicating privacy logic.

It could also support different policy profiles, provided all profiles retain the application's non-negotiable security controls.
11.2 Adaptation through user preferences

A later release could support privacy preferences such as stronger geographic generalisation or additional protection for workplace references.

However, user preferences should influence transformations without weakening mandatory third-party protections.

This distinction prevents personalisation from becoming a route around privacy enforcement.
11.3 Locally adapted models

If sufficient high-quality evaluation data becomes available, a purpose-trained compact model may eventually outperform a general-purpose GLiNER model on LuLu's actual content.

Potential specialisations include South African language handling, informal writing, workplace references, family relationships and contextual identification.

Before fine-tuning, the team should establish whether the deficiencies are caused by model limitations, insufficient entity labels, weak deterministic recognisers or poor input normalisation.

Fine-tuning should solve demonstrated problems rather than becoming the default response to every missed entity.
11.4 Privacy-preserving cloud intelligence

Once the local gateway is reliable, hosted decision APIs could be used for downstream tasks such as content routing, abuse classification and additional review of sanitised disclosures.

This would not replace local privacy enforcement.

Instead, the division of responsibility would be:

Device: Protect information before disclosure.

Cloud: Process the approved information for application functionality.

That separation is valuable because it prevents cloud intelligence from becoming a prerequisite for basic privacy.
12. Final recommendations

The concept is technically credible and has a clear architectural justification. Its strongest quality is the decision to put privacy enforcement at the point of data creation rather than relying on a server to repair privacy violations after transmission.

The principal risk is underestimating contextual identification. Conventional PII detectors can remove an email address while leaving enough information in a narrative to identify the person concerned.

The recommended direction is therefore:

Decision
	

Recommendation

First supported modality
	

Text

Primary recognition method
	

Deterministic rules plus compact NER

First model benchmark
	

GLiNER Small v2.1

Specialist comparison
	

GLiNER Multi PII

Mobile execution
	

ONNX Runtime with native acceleration where beneficial

Contextual analysis
	

Separate, measured component

Jev / OpenAI Decisions
	

Optional cloud processing after local protection

Privacy enforcement
	

Central application-level outbound gateway

Failure behaviour
	

Block or require revision

Expansion into files
	

After text security and evaluation are established

The architecture should make the model replaceable while keeping the privacy policy, outbound controls and verification requirements stable.

The proposed product capability is not simply an AI model that recognises PII. It is a local privacy enforcement system that uses AI as one component of a verifiable processing pipeline.

That is the appropriate foundation for LuLu's privacy-sensitive user experience.
Primary technical references

The following resources provide implementation details and reference behaviour:

GLiNER model and repository
GitHub

GLiNER Multi PII model
Model card

ONNX mobile deployment
Documentation

Microsoft Presidio
Documentation

OpenAI Decisions API
API guide

South African POPIA
Legislation
LuLu.htmlHTML
That's something to try for the scrubbing before the data leaves. But then the question becomes, now that the data has left, do you have a Decisions API by OpenAI, access and credits, so that I can and should be able to use that for the next level, like identifying different types of abuse, potentials, and things like that. So I need to understand what I need to classify, as well as how to classify them to give scores, so that we're able to inform the user of what they can do without diagnosis. So they can say there's a high probability that what you're experiencing is this X, Y, Z. And then those are the kind of things that I'm looking for. I'll give you an HTML, I think will be easier for you to go through about the projects, but you can also look through Hackathon analysis and advice and understand what Lulu is all about. And then from there, can you help me deal with the technical aspects? Now that we would have possibly, I guess, from the PII, we then have code that can scrub those different PII entities. For example, if it's a person or an organization or a phone number, whatnot. We should have in code a way to sort of scrub that, so that it doesn't leak out of the data, so to speak. And also for this application reads like somebody else, and also apply the layer where we the distancing, where it's not an I, so it's spoken and reads as a third person, as if this is a story by someone else about someone else. But that was something in between to get to this point that I'm trying to resolve now. So what do you think we should do with that, and how should we resolve it going forward?
…
LuLu: From Private Journalling to Abuse-Pattern Intelligence

Having reviewed the LuLu presentation and the earlier project decisions, I think the architecture is becoming considerably clearer.

LuLu needs two distinct intelligence systems: one that protects the identity of the person writing, and another that helps them understand what they may be experiencing. The second is where OpenAI's Decisions API becomes particularly useful.

The presentation establishes something important: LuLu is an ordinary journal and organisational application on the surface, with a deliberately protected private layer for recording experiences, preserving evidence, understanding possible patterns and seeking support when the person chooses. The original record remains unchanged and under the user's control.

That means the objective is not to build an automated abuse diagnosis service. It is to build a privacy-preserving pattern recognition and decision-support system that helps people interpret experiences without claiming certainty, determining guilt or taking away their agency.
1. Can we actually use OpenAI's Decisions API?

Yes. As of 26 October 2026, the Decisions API is generally available, having exited public beta on 22 October.

OpenAI Decisions API
Generally available

Supported model

GPT-6 Luna

Endpoint

POST /v1/decisions

Uncached input
$0.10
Per million tokens

Question capacity
400
Per request

Output tokens are not charged. Cache-read and cache-write pricing, where applicable, is separate. 
OpenAI API
+1
Official Decisions API documentation

There are three outputs particularly applicable to LuLu.

Decision type
	

LuLu use case
	

Output

predicate
	

Does the account describe restricted access to money?
	

Probability between 0 and 1

choice
	

Which evidence type is most relevant?
	

Selected label and probability distribution

score
	

How explicit is the evidence of coercion?
	

Ordered rubric score and level probabilities

The API can evaluate multiple independent questions against the same sanitised input, making it well suited to a multidimensional abuse-pattern taxonomy. 
OpenAI API

Access and credits: I have access to the documentation, but I do not have an authenticated connection to your OpenAI Platform organisation, its billing balance or a facility here to make charged API requests on your behalf. Your ChatGPT subscription does not automatically provide API credits.

To test it, you would need a funded OpenAI Platform API project, an API key and access to the supported model. You can start in the OpenAI Platform and use the Decisions Playground.

For cost perspective, a hypothetical 1,000-token uncached input would cost approximately $0.0001 before applicable extras. That makes classification economically attractive, although validation, infrastructure and safeguarding costs will matter much more than inference pricing.
2. The architecture I would establish for LuLu

The existing concept has the correct building blocks, but I would define four boundaries rather than treating PII scrubbing, narrative distancing and abuse analysis as one transformation.

A. Original record

Encrypted on device · Immutable evidence · User-controlled

B. Local privacy compiler

PII detection → Alias mapping → Context generalisation → Narrative distancing → Verification

Detached disclosure representation

C. Cloud pattern intelligence

OpenAI Decisions API · Multi-label classification · Evidence strength · Uncertainty

Structured pattern assessment

D. User understanding

Possible explanations · Relevant information · User-selected next steps

Each stage has a separate responsibility.

Crucially, the original account must never be overwritten by a rewritten version. This is already consistent with LuLu's presentation, including its emphasis on timestamps, provenance, captured evidence and attributable additions.

The detached version exists for a specific purpose. The version prepared for AI pattern analysis may differ from a version prepared for a counsellor, companion or legal adviser.

One point I would resolve immediately: narrative distancing must not become evidence falsification. Transforming “I” into “the person” for private analysis can be useful, but we must preserve actor identities, agency, temporal relationships, allegations and uncertainty. The original first-person statement should remain available privately as the authoritative record.
3. What LuLu should actually classify

I would avoid building one classifier that asks, “Is this abuse?”

Abuse is not a single mutually exclusive category. One experience may simultaneously involve financial control, intimidation, isolation and threats. The labels can also change over time as further experiences are recorded.

Instead, establish a multi-label behavioural taxonomy, with separate assessment of the strength of supporting evidence.
Proposed classification taxonomy

Domain
	

Pattern to recognise
	

Example observation

Emotional and psychological abuse
	

Humiliation, intimidation, degradation
	

Repeated insults or threats intended to cause distress

Coercive control
	

Rules, monitoring, restriction of autonomy
	

Required permission to leave home or meet people

Financial or economic abuse
	

Restricted money, employment or assets
	

Prevented from accessing personal earnings

Social isolation
	

Interference with relationships or support
	

Discouraged or prohibited contact with friends

Physical violence
	

Physical assault or threats of physical harm
	

Being pushed, struck or physically restrained

Sexual coercion
	

Pressure, threats or non-consensual sexual conduct
	

Sexual activity under coercion

Digital abuse
	

Surveillance, account control, technology-enabled harassment
	

Forced access to private messages

Stalking and harassment
	

Repeated unwanted pursuit or contact
	

Persistent following or threatening messages

Reproductive coercion
	

Interference with reproductive choices
	

Threats or sabotage involving contraception

Institutional or workplace abuse
	

Retaliation, exploitation, harassment or authority misuse
	

Threats after reporting misconduct

Neglect or deprivation
	

Denial of necessary care or essential needs
	

Withholding access to necessary medication

Threats and immediate safety concerns
	

Explicit violence, confinement or imminent danger
	

Threatening serious harm

These should be working categories, not final clinical or legal determinations. Domain specialists and South African safeguarding practitioners should review their definitions.
Classify behaviours, not people

This is one of the most important distinctions in the entire architecture.

Avoid questions such as:

    Is Person A an abuser?

Instead, ask:

    Does the reported account describe Person A restricting Person B's access to their own money?

The latter is answerable using evidence from the text. It does not require deciding whether a person is guilty, malicious or has a psychological disorder.

It also allows the application to distinguish an allegation, a subjective impression, a directly quoted statement and a corroborated observation.
4. The scores LuLu should produce

I recommend separating three quantities that might otherwise be collapsed into one misleading “abuse percentage”.

1. Pattern evidence probability

How strongly the model considers the narrative consistent with the defined behaviour.

Example: financial_control = 0.91

This measures model confidence about textual evidence for a pattern. It does not establish a 91% probability that abuse occurred.

2. Evidence specificity

How clearly the account describes observable behaviour.

An explicit statement that somebody confiscated a bank card is more specific than “I feel like I'm being controlled”.

This can be scored using a defined ordinal rubric.

3. Safety concern

Whether the reported details suggest that timely support or a safety-oriented response may be relevant.

This must not be conflated with the probability of abuse. A single explicitly described threat of serious harm may warrant immediate attention even without a repeated pattern.

I would add two metadata fields: evidence provenance (self-report, quotation, attachment, companion statement) and assessment limitations (missing context, uncertain speaker, ambiguous wording, unverified circumstances).

A fourth optional dimension, when there are multiple entries, is recurrence over time. That should come from explicit, separately identified events rather than hallucinated counts or model assumptions.
An illustrative assessment

A user writes:

    I have to ask my partner for permission before I can use my salary. They also check my phone and get angry when I speak to friends.

Possible patterns

Illustrative, not model-generated

Financial control

94%

Digital monitoring

89%

Social isolation

75%

What LuLu might tell the user

“Some of the experiences described are consistent with financial control and monitoring of personal communications. These behaviours can occur in controlling relationships. You can explore what these patterns mean, consider your options, or save this information for later.”
The percentages illustrate API output presentation only. They have not been produced by a model or calibrated on real cases. Production language should not expose such percentages as probabilities that abuse happened.

In the production interface, I would initially use “strongly indicated”, “possibly indicated” and “insufficient information”, rather than showing the underlying numbers directly.

The numeric scores remain useful internally for testing, calibration, comparison across model versions and prioritising relevant information.
5. A concrete Decisions API implementation

The first implementation should evaluate independent behavioural indicators in one request, with instructions defining exactly what evidence counts.

For instance:

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function assessPatterns(
  sanitisedNarrative: string
) {
  return openai.decisions.create({
    model: "gpt-6-luna",
    input: sanitisedNarrative,
    questions: [
      {
        type: "predicate",
        name: "financial_control",
        instructions:
          "Does the narrative explicitly describe " +
          "one person restricting another person's " +
          "access to, or control over, their own money? " +
          "Assess described behaviour, not guilt, " +
          "diagnosis or whether an allegation is true."
      },
      {
        type: "predicate",
        name: "social_isolation",
        instructions:
          "Does the narrative describe interference " +
          "with a person's ability to communicate with " +
          "friends, relatives or support networks?"
      },
      {
        type: "predicate",
        name: "digital_surveillance",
        instructions:
          "Does the narrative describe unwanted " +
          "monitoring of communications, accounts " +
          "or electronic devices?"
      },
      {
        type: "score",
        name: "evidence_specificity",
        instructions:
          "Rate how specifically the narrative " +
          "describes observable controlling behaviour. " +
          "Do not rate the truth of the account.",
        levels: [
          {
            label: "Absent",
            description:
              "No relevant observable behaviour."
          },
          {
            label: "Ambiguous",
            description:
              "Concern expressed without a clear act."
          },
          {
            label: "Specific",
            description:
              "A concrete act is described."
          },
          {
            label: "Detailed",
            description:
              "Concrete acts with clear participants " +
              "and relevant circumstances."
          }
        ]
      }
    ]
  });
}

This uses the documented question structure and supported predicate and score types. 
OpenAI API Reference

The key design decisions are deliberate:

    The backend receives an already sanitised narrative.

    Each predicate describes observable behaviour.

    Different patterns can be true simultaneously.

    The model is not asked to infer guilt or produce a diagnosis.

    The score rubric evaluates specificity, not the severity of someone's personal experience.

    The client never receives or stores the OpenAI API key.

The API's probabilities must be calibrated against labelled examples before being converted into user-facing confidence categories. OpenAI's documentation recommends application-specific thresholds based on the consequences of false positives and false negatives. 
OpenAI API
What Decisions cannot do by itself

The API is not a complete reasoning, evidence-extraction and explanation engine.

It gives typed decisions, but it does not inherently provide trustworthy quotations, evidence spans, clinical validation or a carefully worded explanation of the output.

I would therefore have a separate evidence extraction component that produces structured event records, and a deterministic response-mapping layer that connects recognised patterns to professionally reviewed explanations.

Free-form generation can be added later, but should not be the foundation for safeguarding guidance.
6. Resolving narrative distancing properly

This is the other important architectural question.

You want a person's first-person account to be transformed into a detached third-person narrative, as though the experience concerns someone else.

That should be a separate transformation from PII scrubbing.
Example

A. Original record, device only

“I told David that I needed money for transport. He refused and said I wasn't allowed to use my salary without asking him.”

B. Entity-protected narrative

“I told [PERSON_2] that I needed money for transport. He refused and said I wasn't allowed to use my salary without asking him.”

C. Detached third-person narrative

“Person A told Person B that they needed money for transport. Person B refused and said Person A could not use their own salary without permission.”

D. Structured behavioural evidence

Actor: Person B

      Affected person: Person A

      Reported action: Restricted access to salary

      Possible pattern: Financial control

      Source: First-person account, transformed into a detached narrative

      Verification: Uncorroborated self-report

The distinction between C and D is essential.

The transformed story is useful for reading and contextual analysis. The structured behavioural evidence is better for classification, temporal correlation and downstream recommendations.
I would introduce an intermediate representation

Rather than relying on repeated LLM rewriting, LuLu should extract an internal event graph.

{
  "event_id": "evt_001",
  "source_type": "personal_account",
  "actors": [
    {
      "id": "person_a",
      "role": "affected_person"
    },
    {
      "id": "person_b",
      "role": "reported_actor"
    }
  ],
  "observations": [
    {
      "action": "restrict_access",
      "object": "personal_income",
      "actor": "person_b",
      "affected": "person_a",
      "attribution": "reported_by_author"
    }
  ],
  "certainty": "self_reported",
  "verification_status": "unverified"
}

This representation becomes a central component of the architecture.

It lets you generate different narratives from the same underlying event without changing the meaning. It also avoids forcing the Decisions API to rediscover basic relationships each time.

For the original record, maintain a separate locally encrypted mapping between real-world identities and detached actor IDs. Only the detached identifiers and approved facts should be eligible for cloud processing.

One subtlety: a third-person account can still identify its author through circumstances and writing style. Distancing is a privacy-enhancing transformation, not a guarantee of anonymity. Semantic and contextual leakage checks remain necessary after rewriting.
7. The complete processing system

I would define the final architecture as three independent representations of the same experience.

Original evidence

Immutable, encrypted, first-person, local

Privacy-preserving event model

Detached actors, relevant actions, provenance, uncertainty

Narrative view

Third-person story for understanding or controlled disclosure

Decisions view

Structured evidence for behavioural classification

Understanding and support engine

Relevant patterns → Reviewed explanations → Optional user actions

This creates a clean division between evidence preservation, privacy transformation and probabilistic inference.
Longitudinal analysis

The event model also makes a future capability possible: identifying patterns across multiple entries.

For example, one entry may mention difficulty accessing money. Another may mention being prevented from working. A third may describe threats associated with spending.

Individually, each may be ambiguous. Together, they may support consideration of a broader pattern of economic control.

LuLu should retrieve only the selected, sanitised event records needed for an assessment. It should never automatically transmit a person's entire journal.

Dates, sequence, recurrence and actor relationships may be analytically important, but each also contributes to potential re-identification. Preserve the minimum necessary temporal precision and actor linkage within the approved assessment scope.
8. How classifications should inform the user

I would build a structured knowledge and guidance system alongside the classifier.

The relationship should be:
Observed behaviours→Possible patterns→Reviewed knowledge→User-controlled options
Observed behaviours→Possible patterns→Reviewed knowledge→User-controlled options

For each recognised pattern, define a content object containing its definition, common indicators, limitations, related behaviours, appropriate support options, jurisdiction, source references and review date.

Then use the classification output to select relevant content.

For example, financial control could surface an explanation of economic abuse, optional questions for a counsellor, information about safe recordkeeping and appropriate support services.

Where there are possible immediate safety concerns, LuLu should offer clearly accessible safety-oriented options without depending on a high model score. It should not automatically notify another person, recommend confrontation or expose a user's location.

This aligns with the WHO's guidance on supportive, non-judgemental responses that respect the affected person's concerns and autonomy. 
NCBI Bookshelf
+1

I would distinguish three forms of UI output:

Output
	

Example
	

Purpose

Pattern recognition
	

“This account contains indicators associated with financial control.”
	

Understanding

Explanation
	

“Restricting a person's access to their own money can form part of economic abuse.”
	

Education

Optional next step
	

“Explore this pattern, document related experiences, or find support.”
	

Agency

None should assert that LuLu has verified the facts, diagnosed an individual or determined that a crime has occurred.
9. Integration with LuLu's existing stack

Your presentation specifies React, TypeScript, Vite, Firebase Authentication, Firestore, WebAuthn, IndexedDB, AES-GCM, Capacitor and a decisions layer.

I would preserve that stack and introduce bounded services.

Component
	

Execution
	

Responsibility

OriginalRecordVault
	

Device
	

Encrypted originals, evidence and provenance

PrivacyCompiler
	

Device
	

Entity detection, pseudonyms, generalisation and distancing

DisclosureVerifier
	

Device
	

Final outbound privacy policy

PatternAssessmentAPI
	

Backend
	

Authenticated proxy to OpenAI Decisions

PatternOntology
	

Backend/versioned content
	

Behavioural definitions and scoring rubrics

AssessmentStore
	

Encrypted, access-controlled storage
	

Consented detached assessments

GuidanceResolver
	

Backend/client
	

Reviewed explanations and relevant options

A Firebase Cloud Function or Cloud Run service would be suitable for the Decisions API adapter. API credentials stay on the server and should be stored through an appropriate secret-management service.

An important security adjustment: A PWA or Capacitor app does not provide a universally trustworthy private execution environment. Browser extensions, compromised devices and unsafe third-party scripts remain potential exposure paths. Test the private layer's security on actual mobile platforms and do not confuse passkey authentication with encryption key management.

Also, Firestore must not become an accidental synchronisation destination for original private records. Its permitted data categories need explicit security rules and integration tests.
10. Implementation order

The most useful next deliverable is not another broad model comparison. It is an executable vertical slice of LuLu's complete privacy-to-understanding flow.

I would implement it in this sequence:

    Privacy compiler: Take a first-person entry, detect identities and context, produce a detached event model and third-person version, then verify the outbound representation.

    Pattern ontology v1: Define approximately 10–12 behavioural domains, each with precise observable criteria, exclusions, ambiguity conditions and safeguarding considerations.

    Decisions adapter: Submit the detached representation and evaluate several independent behavioural predicates plus evidence-specificity rubrics in one call.

    Assessment interpreter: Calibrate model output, preserve uncertainty and map classifications to reviewed guidance.

    User experience: Present possible patterns and optional next steps, while protecting the original record and avoiding mandatory disclosure.

    Evaluation suite: Test privacy leakage, incorrect attribution, false classification, semantic distortion, multi-entry reasoning and safety-sensitive failure cases.

For the first end-to-end test, I would use three synthetic journal entries involving financial control, unwanted monitoring and relationship isolation. That is sufficient to prove that the architecture can preserve actors and meaning, perform multi-label classification, avoid asserting unverified facts, and return useful information.

The most important system boundary is this:

LuLu must never allow the classifier to become the authority over the user's experience. The classifier identifies potentially relevant patterns; reviewed knowledge explains them; the user determines what happens next.

That division gives you a technically coherent path from protected journalling to meaningful intelligence while preserving the product's foundational promise: the person can begin writing, preserve what matters, understand possibilities and seek support without being forced into disclosure or diagnosis. 
To address some of the issues and things, for example, like inter-dissenting must not become evidence falsification. Like all of these things have already been accounted for in the application. You do not have access to the full project. I was just giving you a summary because that's all I can do at this point in time. My concern is, and what I'm asking of you, is to focus on the technologies and the tools that we need to put in place in order to accomplish this said positive straightforward goal. I understand that there are some other issues which you are bringing up, but a lot of these have already been discussed and addressed in the documentations, which you wouldn't have access to. So it doesn't make sense for us to sit here and waste energy on doing that. Rather focus on the path forward. We will take in account with best practices the way forward, but then also this document and this conversation, it's happening for the sole purpose of being the clarification of how we need to structure this, and all of those safeguards are already accounted for, again, in documentation. And then you say classification such as, is this abuse? I understand this, but we need to not focus on the negative or the alternatives and focus on the primary and the North Star. Stop focusing on anything else. It's just time wasting at this point, and we end up diverging into all sorts of things, which even may be addressed already.

And we should also remember that this is a tool that is meant to help the user understand social relations with the people that they know. Sometimes it may not be abuse, but understanding how they feel or are being treated in a relationship, even though it may not need for professional intervention, is good to identify because I think most people don't even identify what's happening around them and how their relationships health is like. It's a potential thing for the future, of course, and managing or seeing how people maintain their relationships, or having a bird's eye view from their journals and how they interact with other people and how they feel around them. That's a different thing. Right now I need classifications. I like that you brought out the table of the different abuses, since we're working with abuse right now, and different. So all of these entities become super important because this is what I need. I may not think of every single type myself, but or how to structure, or even prompt these models, and which model is exactly what I need.

“Some of the experiences described are consistent with financial control and monitoring of personal communications. These behaviours can occur in controlling relationships. You can explore what these patterns mean, consider your options, or save this information for later.” Exactly this is what I was trying to get to

I want to manually build a lot of the platforms or configurations to avoid incurring charges on a platform like Firebase. But also, we are supposed to use a very light and quick way to test this logic. But if it's avoidable without any headaches, we should follow that path instead. I am on a plan which does allow you for free usage, and I think for the hackathon I should be safe and fine for that. But as long as it's an easy path forward to implement this, then we can call that architecture.
…
LuLu: Classification Engine and Implementation Plan

The immediate objective is to build LuLu's behavioural classification engine, using the already established privacy pipeline as its input.

We're concentrating on a working system that takes a sanitised account, identifies relevant behavioural patterns, assigns scores, and returns useful, carefully worded explanations to the user.

The longer-term relationship intelligence capabilities can use the same classification infrastructure, but we don't need to implement those now.
1. Technology decision

I recommend the following stack for the hackathon prototype.

Component
	

Technology
	

Reason

Behavioural classifier
	

OpenAI Decisions API, GPT-6 Luna
	

Fast, typed, probability-based classification

Classification definitions
	

TypeScript/JSON configuration
	

Easy to extend, version and test

Backend
	

Node.js + Fastify
	

Lightweight, minimal infrastructure

Privacy input
	

Existing LuLu sanitisation pipeline
	

No duplicated work

User explanations
	

Local TypeScript templates
	

No additional model request

Development environment
	

Localhost
	

No Firebase deployment costs

Test interface
	

Existing LuLu UI or a simple local page
	

Immediate end-to-end testing

Later deployment
	

Existing infrastructure
	

No need to introduce another platform now
Important clarification about free usage

The Decisions API costs $0.10 per million uncached input tokens, and GPT-6 Luna is not supported on OpenAI's Free API tier. 
OpenAI API
+1

Your ChatGPT plan or hackathon participation may provide separate benefits, but I cannot verify an API credit allocation for your account.

At this pricing, the cost is unlikely to be the main issue if you have access to a funded API project.

For example, 1,000 test requests containing approximately 2,000 uncached input tokens each would cost around $0.20, before cache effects or applicable pricing adjustments.

We do not need Firebase, a database, orchestration software or multiple models to test the core logic. A local Node.js endpoint and a single OpenAI API call are sufficient.
2. The classification taxonomy

I would begin with 12 independent behavioural categories.

Each category becomes a separate predicate question evaluated against the same narrative.

ID
	

Classification
	

What we want to detect

emotional_abuse
	

Emotional or psychological abuse
	

Humiliation, degradation, intimidation, manipulation

coercive_control
	

Coercive control
	

Restrictions on autonomy, rules enforced through pressure

financial_abuse
	

Financial or economic abuse
	

Restricting earnings, assets, spending or employment

social_isolation
	

Social isolation
	

Interference with friendships, family and support

physical_abuse
	

Physical abuse
	

Physical aggression, restraint or force

sexual_coercion
	

Sexual coercion
	

Unwanted sexual pressure, threats or violations of consent

digital_abuse
	

Digital abuse
	

Unwanted surveillance, device monitoring, account control

stalking_harassment
	

Stalking or harassment
	

Persistent unwanted contact, following or intimidation

reproductive_coercion
	

Reproductive coercion
	

Interference with reproductive decisions

workplace_abuse
	

Workplace or institutional abuse
	

Misuse of authority, harassment, intimidation or retaliation

neglect_deprivation
	

Neglect or deprivation
	

Denial of essential care or resources

threats_intimidation
	

Threats and intimidation
	

Threatening language or behaviour intended to instil fear

These are multi-label classifications. A single account can match several categories.

The taxonomy should be configuration-driven, so additional concepts such as boundary violations, trust, reciprocity, emotional support and conflict resolution can be introduced later without changing the inference architecture.
Classification output

For every category, we want a consistent result such as:

{
  "id": "financial_abuse",
  "probability": 0.94,
  "classification": "strong_indication",
  "status": "identified"
}

The probability comes from the Decisions API. The classification and status fields are produced by our own mapping functions.

For now, we can use provisional thresholds:

Probability
	

Internal classification

0.85–1.00
	

Strong indication

0.65–0.85
	

Possible indication

0.40–0.65
	

Uncertain

Below 0.40
	

Not indicated

These thresholds are prototype defaults, not calibrated measurements. We can refine them through our test cases without modifying the API integration.

In production, the wording will describe how strongly the text indicates the pattern, rather than presenting the percentage as the probability that an event occurred.
3. Make the classifications configurable

Rather than hardcoding all the prompts in an API handler, define each category once. The same definition can power API questions, user explanations and evaluation tests.

// src/classifications.ts

export const classifications = [
  {
    id: "financial_abuse",
    title: "Financial control",
    criteria:
      "One person restricts another person's access " +
      "to money, employment, assets, or financial decisions.",
    explanation:
      "The account describes behaviours consistent " +
      "with financial control."
  },
  {
    id: "coercive_control",
    title: "Coercive control",
    criteria:
      "One person imposes restrictions on another's " +
      "autonomy through pressure, intimidation, " +
      "monitoring, or threats.",
    explanation:
      "The account contains indicators of controlling behaviour."
  },
  {
    id: "social_isolation",
    title: "Social isolation",
    criteria:
      "One person interferes with another's ability " +
      "to maintain friendships, family relationships, " +
      "or social support.",
    explanation:
      "The account suggests interference with " +
      "personal relationships or support networks."
  },
  {
    id: "digital_abuse",
    title: "Digital monitoring",
    criteria:
      "One person uses technology to monitor, " +
      "restrict, intimidate, or control another person.",
    explanation:
      "The account contains possible indicators " +
      "of unwanted digital monitoring."
  }
] as const;

These first four definitions are sufficient to prove the system. We then populate the configuration with the full 12-category taxonomy, rather than hand-writing additional API logic.
4. Build the minimal backend

We only need Node.js and the official OpenAI SDK.

mkdir lulu-classifier
cd lulu-classifier

npm init -y
npm install openai fastify dotenv
npm install -D typescript tsx @types/node

Create a .env file locally:

OPENAI_API_KEY=your_api_key

Keep this file out of version control.

Then implement the classification endpoint.

// src/server.ts

import "dotenv/config";
import Fastify from "fastify";
import OpenAI from "openai";
import { classifications } from "./classifications.js";

const app = Fastify({ logger: false });
const openai = new OpenAI();

app.post("/classify", async (request, reply) => {
  const body = request.body as {
    narrative?: string;
  };

  if (
    typeof body?.narrative !== "string" ||
    !body.narrative.trim() ||
    body.narrative.length > 10000
  ) {
    return reply.code(400).send({
      error: "Invalid narrative"
    });
  }

  const decision = await openai.decisions.create({
    model: "gpt-6-luna",

    input: body.narrative,

    questions: classifications.map(item => ({
      type: "predicate" as const,
      name: item.id,
      instructions:
        `Does this account describe the following ` +
        `behavioural pattern: ${item.criteria} ` +
        `Evaluate the reported behaviour in the text.`
    }))
  });

  const results = decision.answers.map(answer => {
    if (answer.type !== "predicate") {
      return {
        id: answer.name,
        status: "unavailable"
      };
    }

    const definition = classifications.find(
      item => item.id === answer.name
    );

    const probability = answer.probability;

    return {
      id: answer.name,
      title: definition?.title,
      probability,
      classification:
        probability >= 0.85 ? "strong_indication" :
        probability >= 0.65 ? "possible_indication" :
        probability >= 0.40 ? "uncertain" :
        "not_indicated",
      explanation: definition?.explanation
    };
  });

  return {
    model: decision.model,
    results
  };
});

await app.listen({
  host: "127.0.0.1",
  port: 3001
});

This follows the documented SDK method, client.decisions.create(), and uses a single shared input with independent predicate questions. 
OpenAI API

The input to this endpoint must already be the approved, sanitised version from LuLu. No original draft or identity mappings need to be provided.

Start the service:

npx tsx src/server.ts

Test it immediately:

curl -X POST http://127.0.0.1:3001/classify \
  -H "Content-Type: application/json" \
  -d '{
    "narrative": "Person A says their partner controls access to their salary, checks their phone and discourages contact with friends."
  }'

That produces the actual model-generated probabilities when run with an eligible API key. I have not executed a charged request here, so there are no measured classification results yet.

This is the complete minimal integration. It needs no Firebase service or deployment.
5. Translate classifications into user understanding

This is the layer that produces the result you identified as LuLu's intended behaviour.

It does not need another AI model initially.

The application already has the classification names, probabilities and explanations. It can select the strongest relevant patterns and build an understandable message.

An example output would be:

LuLu · Understanding your experience
There may be patterns worth exploring

Some of the experiences described are consistent with financial control, monitoring of personal communications and interference with social relationships.

These behaviours can occur in controlling relationships. You can explore what these patterns mean, consider your options, or save this information for later.
Financial control
Digital monitoring
Social isolation
Illustrative UI result, not a live assessment.

I would put this presentation logic into a GuidanceResolver, using the taxonomy configuration and the highest-ranked model results. Later, the same mechanism can retrieve richer reviewed explanations for each pattern.
6. The fastest testing path

Before integrating with LuLu's main application, test the classification logic independently.

Start with a small fixture suite:

Test case
	

Expected categories

Partner controls access to salary
	

Financial control

Person monitors phone and accounts
	

Digital abuse

Person discourages contact with family
	

Social isolation

Supervisor threatens retaliation for a report
	

Workplace abuse, intimidation

Repeated unsolicited following and messages
	

Stalking, harassment

Supportive disagreement between friends
	

No abuse-specific classification expected

Run the same examples repeatedly, inspect the returned scores and adjust the category instructions where necessary.

The next step would be to integrate the classifier into LuLu's existing flow:

LuLu privacy output → /classify → Decisions API → GuidanceResolver → LuLu UI

At that point, we can test real application behaviour using synthetic journal entries without introducing persistence, cloud hosting or another AI provider.
7. What I would commit to now

The implementation direction is sufficiently defined:

Model: GPT-6 Luna through the Decisions API.

Classification method: Independent predicates against a configurable behavioural taxonomy, with rubric scoring added where useful.

Inference location: Cloud, after LuLu's established on-device privacy transformation.

Backend: One lightweight TypeScript service, initially running locally.

User output: Explanatory language generated from approved templates and classification results.

Testing: Synthetic cases, expected classifications, score inspection and threshold calibration.

Infrastructure cost: No Firebase deployment required. API usage is the only necessary external service cost for this prototype, assuming an eligible funded OpenAI API project.

This keeps the first implementation narrow: establish that LuLu can recognise behavioural patterns and present helpful explanations. Once that works reliably, extending the taxonomy and connecting it to LuLu's broader relationship intelligence model becomes an incremental engineering task rather than an architectural redesign.
What do you mean by "The longer-term relationship intelligence capabilities can use the same classification infrastructure, but we don't need to implement those now."

Be clear especially when it comes to decision with such gravity. why does it sound like you're steering a project without knowledge of where it is and the contraints. But this is a hackathon so lean and fast wins over depth and complexity

I want to resolve the technicalities.. what about managing when and how to expose help or companionship

You're right to challenge that statement. I had no basis for deciding that relationship intelligence should be deferred. You asked us to resolve the technical implementation, not to redefine LuLu's scope or development priorities.

What I should have said is that relationship intelligence, abuse-pattern recognition and the decision to offer companionship or support can operate through the same classification and decision infrastructure. We don't need separate systems for each.

For a hackathon, I would build one lightweight decision engine with three responsibilities:

    Understand: Identify what the user's account describes, including abuse indicators, interpersonal dynamics, emotions and relationship patterns.

    Decide: Determine whether LuLu should simply acknowledge the account, offer reflection, make companionship available or surface relevant support.

    Respond: Select an appropriate interaction without making every journal entry feel like a clinical assessment or intervention.

The important architectural distinction is that classification identifies what's present; engagement policy decides what LuLu should do about it.
1. The missing component: an engagement decision engine

We already have the proposed path:

Sanitised narrative → Decisions API → Behavioural classifications

What we need to add is:

Behavioural classifications + user preferences + interaction context → Engagement decision

This second stage answers questions such as:

Decision
	

Possible outcomes

What is the entry about?
	

Financial control, interpersonal conflict, affection, isolation, coercion, workplace tension

What is the emotional character?
	

Relief, sadness, frustration, confusion, gratitude, fear

What kind of interaction is appropriate?
	

No interruption, acknowledgement, reflection, companionship, support

Should LuLu proactively surface anything?
	

No, optional suggestion, prominent support

What is the appropriate timing?
	

During writing, after saving, on journal review, when requested

What should be offered?
	

Journal prompts, pattern explanations, conversation, relevant resources

This is directly relevant to the broader relationship intelligence you described. A journal about a supportive friendship might generate a positive relational observation. An entry describing repeated boundary violations could generate a different observation. Both pass through the same architecture.

The system isn't an abuse detector with other functionality attached. It is a behavioural understanding engine that includes abuse recognition.
2. How to decide when to expose help or companionship

I would implement this through a small, explicit policy function rather than allowing the model to control the UI directly.

The model supplies signals. The application determines the interaction.

For LuLu, three inputs are enough to begin:

Classification results + interaction context + user preferences

For example:

Situation
	

Recommended behaviour

Ordinary journalling without a request for interaction
	

Save quietly

Positive experience involving another person
	

Optional reflection or relationship insight

Confusion about someone's behaviour
	

Offer to explore what the experience might mean

Indicators of controlling behaviour
	

Offer the relevant pattern explanation

Repeated distress across selected entries
	

Offer companionship or exploration of recurring themes

User explicitly asks for help
	

Present the relevant available options immediately

Clear immediate danger indicators
	

Make urgent support readily accessible

These are proposed defaults, not decisions about LuLu's existing product requirements.

The timing is as important as the content. A user may want to write uninterrupted, but still welcome insight immediately after saving.

My preferred default for the prototype is passive while composing, contextual after saving, interactive on invitation.

That can be implemented without another model call.
3. A practical engagement policy

Instead of asking the Decisions API an unrestricted question such as “What should LuLu do?”, have it return classifications for explicit dimensions:

Dimension
	

Values

Behavioural patterns
	

Multi-label probabilities from the taxonomy

Emotional signals
	

Fear, sadness, confusion, frustration, relief, happiness, etc.

User intent
	

Recording, reflecting, seeking understanding, requesting help

Interpersonal context
	

Partner, family, friend, colleague, authority figure, unspecified

Support cues
	

Explicit request for support, distress, urgent concern

Confidence
	

Evidence strength and ambiguity

Then implement a decision policy.

type Engagement =
  | "none"
  | "reflection"
  | "pattern_insight"
  | "companionship"
  | "support_options"
  | "urgent_support";

interface EngagementContext {
  privateMode: boolean;
  entrySaved: boolean;
  userRequestedHelp: boolean;
  userInvitedConversation: boolean;
  insightsEnabled: boolean;
}

interface Signals {
  patternDetected: boolean;
  emotionalDistress: boolean;
  urgentConcern: boolean;
}

function resolveEngagement(
  signals: Signals,
  context: EngagementContext
): Engagement {
  if (!context.privateMode) return "none";

  if (signals.urgentConcern) {
    return "urgent_support";
  }

  if (context.userRequestedHelp) {
    return "support_options";
  }

  if (context.userInvitedConversation) {
    return "companionship";
  }

  if (!context.entrySaved || !context.insightsEnabled) {
    return "none";
  }

  if (signals.patternDetected) {
    return "pattern_insight";
  }

  if (signals.emotionalDistress) {
    return "reflection";
  }

  return "none";
}

This is intentionally small. It provides one deterministic place where we can change the interaction behaviour without modifying classification prompts.

It also reflects the distinction in the LuLu presentation between the everyday journalling layer and the protected private layer. We should use the actual product context to determine what interactions can appear, rather than assume every journal entry should be analysed or responded to.
4. Distinguish companionship from professional support

LuLu's presentation identifies trusted companions as people who can receive selected records, contribute statements or participate in consent-based support. 
LuLu.html

That is distinct from an optional conversational assistant. Both can use the same engagement engine, but they should trigger different actions.

I would define the engagement output as a set of available actions rather than one mutually exclusive response:

interface EngagementDecision {
  primary: "none" | "reflect" | "understand" | "support";
  offers: Array<
    | "explore_pattern"
    | "reflect_on_feelings"
    | "talk_with_lulu"
    | "contact_companion"
    | "find_professional"
    | "view_local_resources"
  >;
  timing: "on_request" | "after_save" | "immediate";
  reason: string[];
}

This is a better final contract than the single-action resolver above. For example, a user might receive a financial-control explanation alongside an unobtrusive option to contact an existing trusted companion.

The classifier decides which patterns and cues are present. The policy engine decides which options become available and how prominently to display them.

For the hackathon, these options can simply open existing UI views. No companion messaging service, new database or complex workflow engine is required to test the logic.
5. The simplest complete architecture

LuLu private entry

Existing privacy and distancing pipeline

OpenAI Decisions API

Behavioural patterns + emotional cues + support intent

TypeScript engagement policy

Classification thresholds + user preferences + UI context

Quiet journalling

Pattern insight

Reflection or conversation

Companion or support options

This requires one Decisions API request, one local policy resolver and the existing LuLu UI.

For testing without incurring API costs, we can implement a mock Decisions provider returning predefined scores. The real and mock providers should implement the same interface.

That allows us to build and verify the entire user interaction first, then switch to GPT-6 Luna with a configuration change when API access is available.
6. What we should implement next

The most useful next artefact is a single configuration file defining the classifications and their engagement rules.

For each category, it should contain:

Field
	

Purpose

id
	

Stable classification identifier

definition
	

What the pattern means

criteria
	

Question passed to the Decisions API

thresholds
	

How model scores map to evidence bands

guidance
	

User-facing explanation

offers
	

Available interactions

priority
	

Relative presentation importance

timing
	

When an offer becomes eligible to appear

This gives us one source of truth connecting recognition, scoring and user experience. We can populate it with the abuse taxonomy now and add other relationship patterns whenever needed, without changing the architecture.

My concrete recommendation: Implement the configurable taxonomy, Decisions API adapter and deterministic engagement policy as a single vertical slice. Run it locally with mock responses first, then test actual model output. Keep timing and exposure rules in TypeScript rather than hardcoding them into model prompts.

That resolves the technical question you raised: LuLu can recognise what's happening, decide when an interaction is appropriate, and present a relevant explanation, conversation or support option without requiring a complex backend.
I was also thinking about how we can have the app be lightweight, and as it currently is, to work normally as a journal app, and then with the models on the onboarding of the user to then install a model, like these small models, to be able to do the processing, especially on the local one. And then from there, basically the onboarding is meant to explain the whole process and for the user to experience what it means and how it works. And the web app is going to be what's going to be on demo, but I can also submit, remember that they're going to get the code so that they can see what this looks like as an app, because that's where the models come in. I will install and test and run this as part of the submission. But we should have the web app essentially function, function as a web app, but it can just use clouds. But remember, we can demonstrate and show that this is how it's meant to perform, and we do have an iOS as well as an Android APK, but it's also a web app, if you know what I'm trying to get at.

Is there anything else we need to resolve from what you understand so far?

Yes. What you're describing is a single LuLu application with three deployment targets and an optional intelligence layer, rather than three separately developed applications.

The journal should remain lightweight and functional without AI. During onboarding, the user can install the local privacy model, understand how it works through a demonstration, and enable the more intelligent features.

For the hackathon, the web application can demonstrate the complete experience using cloud inference where necessary, while the iOS and Android builds demonstrate that the local inference architecture works on actual devices.

I think this is the right implementation direction. We do not need to redesign the application or settle its broader product scope. There are only a few technical contracts worth resolving.
1. The deployment architecture

Capability
	

Web application
	

iOS / Android

Core journal
	

Works without model
	

Works without model

Model installation
	

Browser cache, optional
	

Device storage, optional

PII detection
	

Browser inference or explicit demo cloud mode
	

Local ONNX inference

PII redaction
	

Client-side TypeScript
	

Client-side TypeScript

Narrative distancing
	

Client-side where supported; demo alternative
	

Local pipeline

Behaviour classification
	

OpenAI Decisions API
	

OpenAI Decisions API

Explanations and engagement
	

Shared TypeScript policy
	

Same TypeScript policy

UI and core business logic
	

Shared
	

Shared through Capacitor

The central principle is to maintain one business-logic implementation and interchangeable inference providers.

A browser and a native mobile application have different storage and inference constraints, but they should return the same data contracts.
2. Optional model installation during onboarding

LuLu · Privacy intelligence
Optional

Illustrative onboarding experience

Local privacy model

Downloaded separately from the journal
Not installed

Detects personal identifiers before content is submitted for analysis. The journal remains usable without this download.

The onboarding does not need to force a model download merely to let a user start journalling. It can also offer installation when they first request an AI-dependent feature.

This requires a small model manager supporting not_installed, downloading, ready, unsupported and failed, alongside download progress, checksum validation and model versioning.
3. Which inference stack to use?

There are two reasonable routes.

Route A: Direct ONNX Runtime integration. Use onnxruntime-web for browser inference and ONNX Runtime Mobile for native inference. This offers explicit control but requires separate native bindings.

Route B: A Capacitor ONNX plugin. The open-source @cantoo/capacitor-onnx project exposes ONNX inference across iOS, Android and web. Its current API expects the application to manage model downloads and storage, then provide a file path on native or model bytes on web. 
GitHub
+1

Given LuLu's existing React/Vite/Capacitor direction, I would test Route B first. It potentially eliminates separate inference integrations, provided it supports the specific quantised model and required operators.

For the browser, ONNX Runtime Web provides WebAssembly inference across major browsers and WebGPU acceleration on supported platforms. IndexedDB can be used to cache model artefacts. 
onnxruntime
+1

We should not commit to a particular GLiNER variant until its exported ONNX model has successfully completed an end-to-end inference on at least one target device.
4. The one distinction we need to make explicit for the web demo

Cloud inference and local inference can return identical application results, but they offer different privacy properties.

I would implement three modes through a shared interface.

Mode
	

Processing
	

Intended use

local
	

Local model + local redaction
	

Native apps and capable browsers

cloud_demo
	

Remote PII processing
	

Explicitly labelled web demonstration with synthetic data

journal_only
	

No model required
	

Ordinary journalling

For cloud demo mode, the original text must leave the browser to reach the remote detector. We should therefore label it accurately rather than presenting it as device-only processing.

The demo can still illustrate the exact intended experience using synthetic content.

Your native builds then establish the actual on-device implementation, which is the technically stronger evidence for the submission.
5. The remaining technical decisions

I see five decisions worth settling. They are implementation choices, not outstanding questions about LuLu's product direction.

Decision
	

Recommended resolution

Local PII model
	

Benchmark GLiNER Small first, then GLiNER Multi PII if necessary

Model delivery
	

Download an independently versioned model during onboarding; cache on-device

Narrative distancing
	

Expose it as a separate provider behind the same processing interface, using existing LuLu logic where available

Cloud classification
	

One backend proxy calling OpenAI Decisions with the shared taxonomy

Demo deployment
	

Web app plus native iOS and Android builds from the same Capacitor codebase

A key technical question is how LuLu's existing distancing implementation runs. If it already works deterministically or uses an available local model, we simply retain that mechanism. If it depends on cloud generation, the web demonstration can use it in explicit demo mode, while native local execution requires an independently deployable implementation.

That is a capability check, not a reason to introduce another model prematurely.
Shared inference contract

I would implement this first:

interface PrivacyProcessor {
  initialise(): Promise<void>;

  process(input: string): Promise<{
    sanitised: string;
    detectedEntities: DetectedEntity[];
    provider: "local" | "cloud_demo";
  }>;

  dispose(): Promise<void>;
}

interface ModelManager {
  isInstalled(modelId: string): Promise<boolean>;
  install(modelId: string): Promise<void>;
  remove(modelId: string): Promise<void>;
}

Then the application can select a provider without modifying its journalling or engagement logic.

The important implementation detail is that the model manager owns model installation, while the privacy processor owns inference. That keeps loading, caching, updating and replacing models separate from the actual processing pipeline.
6. Recommended hackathon proof

I would make the judges able to verify three things independently.

01

The web experience

LuLu operates as a journal, demonstrates onboarding and processing, identifies behavioural patterns, and presents relevant understanding or companionship options.

02

The native implementation

An actual local model can be installed, loaded and used to detect PII while the device is offline. Include the Android APK and an iOS build or documented build process as supported by the submission rules.

03

The code evidence

Reviewers can inspect the model installation workflow, privacy provider interface, sanitisation functions, Decisions API integration, classification taxonomy and engagement policy.

The browser demo is the accessible demonstration; the native builds and source code establish that the local-processing feature is implemented, not merely simulated.
7. What I would do next

The next useful engineering task is a small model compatibility spike, not a full architecture rewrite.

Take one GLiNER model, export or obtain its ONNX representation, and run a single PII recognition test using the Capacitor ONNX plugin on web and one native device. Confirm its tokenizer, labels, character offsets, memory use and runtime compatibility.

If that works, we have a concrete route for optional model downloads across all three targets. If the plugin has limitations, replace only the inference adapter, not the application.

In parallel, the behavioural classifier can be developed against mock Decisions responses and then connected to the live API.

So, from what I understand, the architecture itself is sufficiently resolved. The outstanding technical proof is whether our chosen compact model and inference runtime work reliably across the target platforms, and whether the existing distancing implementation can run under the required deployment mode. Everything else fits into the shared processing contracts we've established.
