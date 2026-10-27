# Privacy model compatibility assessment — 26 October 2026

## Outcome and scope

A real GLiNER Small v2.1 quantized model runs locally in the desktop browser through `@cantoo/capacitor-onnx`'s web adapter, including the new shared PrivacyProcessor and existing TypeScript distancing function. Independent Python CPU inference and tokenizer parity also pass. **The published plugin is incompatible with LuLu's current iOS Swift package graph. Native inference has not run. No mobile dependency or model is selected for release.**

The complete 3,482-line source discussion was read, including later refinements: optional local model installation; useful journal without AI; shared processing with distinct local/cloud-demo modes; ModelManager separate from inference; existing distancing reused where applicable. This is the requested compatibility spike under the active SDD pause, reverse-mapped to draft REQ-001.3, REQ-001.4 and REQ-001.5, not phase approval or completion. Google/authentication remains with Product Implementation.

Assessed baseline HEAD: `99fa33a8c8b81daa3cb6c3c7e505206365eaba6d`, with pre-existing concurrent working-tree edits preserved. Runtime evidence was collected on the working tree on this date. There was no push, commit, deployment, paid inference, cloud demo request or journal-data processing.

## Concrete candidate and primary sources

- Base: [urchade/gliner_small-v2.1](https://huggingface.co/urchade/gliner_small-v2.1), English, published as 166M parameters and Apache-2.0. This verifies the candidate's model-card license, not language coverage or suitability for LuLu. Preserve attribution/license with redistribution. The converted repository's card links this base but does not itself supply a separate license file; packaging must carry the upstream notices.
- Converted weights/configuration: [onnx-community/gliner_small-v2.1 at 8142fb00740ccea973e64b1272949ff48653df5e](https://huggingface.co/onnx-community/gliner_small-v2.1/tree/8142fb00740ccea973e64b1272949ff48653df5e). Exact sizes/hashes from its API are saved in `published-artifacts.json`; the downloaded INT8 file's hash matches the published LFS SHA-256.
- [GLiNER preprocessing source](https://github.com/urchade/GLiNER/blob/main/gliner/data_processing/processor.py), [splitter](https://github.com/urchade/GLiNER/blob/main/gliner/data_processing/tokenizer.py), and [word-mask/span utilities](https://github.com/urchade/GLiNER/blob/main/gliner/data_processing/utils.py) establish prompt construction, first-subtoken pooling, word spans and masks. The exported artifact's own config pins `max_width=12`, `max_len=384`, `<<ENT>>`, `<<SEP>>`, DeBERTa v3 small and whitespace splitter. These configuration values, rather than arbitrary tokenizer defaults, drive the spike.
- [Cantoo plugin](https://github.com/cantoo-scribe/capacitor-onnx), npm 3.3.0, MIT. The actual installed npm package was inspected and its `Package.swift`, tensor bridge and Android build metadata retained. This avoids treating README examples as compatibility evidence.
- [ONNX web deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html) documents JS/WASM matching and asset delivery. [Quantization guidance](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html) distinguishes integer and 4-bit operators and the need to check accuracy. [Tokenizers.js](https://github.com/huggingface/tokenizers.js), Apache-2.0, supplies the final lightweight tokenizer candidate.

## Model, quantization and tensor proof

| Published artifact | Bytes | Tested here |
| --- | ---: | --- |
| FP32 model.onnx | 611,293,061 | No |
| FP16 | 306,253,040 | No |
| model_int8 / model_quantized | 183,403,734 | Quantized alias downloaded and run |
| Q4 / BNB4 | 463,106,905 | No |
| Q4F16 | 245,226,118 | No |

The initial theoretical “under 100 MB at 4-bit” claim is not a deployable package result. The tested model plus tokenizer/configuration files totals **192,063,469 bytes**, excluding runtime binaries. Tokenizer JSON alone is 8,657,198 bytes. Do not package every precision variant.

Graph inspection finds ONNX opset 14 plus `com.microsoft` opset 1. It includes dynamic integer matmuls, floating operations and `com.microsoft::DynamicQuantizeLSTM`; it is a mixed graph, not every tensor converted to INT8. Six inputs are required: five INT64 tensors (`input_ids`, `attention_mask`, `words_mask`, `text_lengths`, `span_idx`) and BOOL `span_mask`. The plugin bridge supports those types in its published source. Vocabulary IDs are small enough to round-trip through its JSON-number transport before conversion to INT64.

Named output **`logits`** has shape `[1, words, 12, labels]`. The model also exports intermediate outputs, including an integer-like output name. An initial decoder selected the first JavaScript object value and failed on shape `[1,5]`; it was corrected to select `outputs.logits` explicitly. The initial failure is retained as execution evidence, not a runtime incompatibility. Sigmoid, threshold 0.5, confidence-first non-overlapping selection and word-boundary conversion produce source spans. Thresholds are spike settings, not calibrated product thresholds.

## Measured runs

Final browser candidate: `@cantoo/capacitor-onnx@3.3.0`, `onnxruntime-web@1.25.1`, `@huggingface/tokenizers@0.2.0`. In-app Chromium 156 on this Mac; single-thread WASM SIMD CPU, no proxy worker, `crossOriginIsolated=false`. This configuration works without adding COOP/COEP to LuLu. No WebGPU/CoreML/NNAPI acceleration was measured.

Final recorded session load: **1,089 ms** after reading/checking local model bytes. Tokenizer creation plus local-file fetch: **167.9 ms**. Three measured runtime calls per fixture:

| Synthetic input | Word/subword count | Inference ms | Observation |
| --- | --- | --- | --- |
| Nomsa/Sipho/clinic/Midrand | 10 / 29 | 170, 111, 110 | Names, organisation and location detected |
| Emoji/decomposed name/email | 17 / 39 | 151, 148, 148 | Nomsa and Johannesburg found; decomposed Noël missed; full email missed and local part tagged as person |
| First-person/David | 13 / 27 | 110, 109, 109 | Both David mentions found; “I” also tagged as person |

The first table's counts should be read directly from `browser-result.json` if fixtures change. Preparation took about 0.7–2.3 ms. An additional actual inference per fixture feeds the shared PrivacyProcessor and distancing, with the result recorded. These are nine timed samples and three integration calls, not a p95 benchmark or accuracy study. Browser reported used JS heap 288,130,931 bytes after the run; that is neither WASM/native total memory nor peak RSS.

Python 3.12 / ORT 1.23.2 ARM64 CPU independently runs the same model: session creation ~378 ms; three first calls ~12.3, 8.8, 7.3 ms. Peak process RSS ~941 MB includes loading the protobuf graph, tokenizer, interpreter and runtime together. It is not a phone memory measurement. Hardware, execution provider and thread configuration differ from browser timings; do not compare them as mobile speed predictions.

## Tokenizer and offsets

JavaScript uses source word matches and their original UTF-16 indices. It never rewrites/normalizes the source string to compute replacements. Individual prompt/word token encodings are assembled with CLS/SEP, first-subtoken word masks, all span indices and valid-span masks. The independent Rust `tokenizers==0.22.1` pretokenized encoding produces **identical IDs and masks for all three fixtures**, including astral emoji and a combining mark. Rust/Python code-point word locations are explicitly converted to UTF-16; JS spans slice the exact original substring.

This establishes mechanism parity for these fixtures, not arbitrary multilingual parity. Spike guardrails reject >384 words or >512 subtokens rather than silently truncating. Production chunking, overlap reconciliation across chunks, South African languages, user corrections and model update regression remain to implement/evaluate.

## Capacitor/native matrix

| Target | Existing LuLu | Candidate evidence | Result |
| --- | --- | --- | --- |
| Web | React/Vite, no model dependency in app | Actual model, tokenizer, plugin WASM and shared processor run | Local desktop proof passes |
| iOS | Capacitor exact 8.5.3, SPM integration | Published plugin Package.swift requires Capacitor `from: 7.0.0` (range `<8.0.0`) | **Swift resolver fails before compilation** |
| Android | Capacitor 8.5.3, minSdk24/compile36 | Plugin minSdk24/compile34, Java17, ORT Android1.25.1; static tensor support | Static alignment only; no build/inference proof |

The raw resolver error is decisive: root depends on 8.5.3 and plugin depends on 7.0.0..<8.0.0. Its npm peer `>=7.0.0` does not remove the Swift constraint. The package also declares iOS15.1 and ORT SPM `from:1.24.2`; exact native ORT resolution must be pinned/evidenced in a working route. LuLu's Capacitor version was not downgraded, and the plugin was not patched or installed into the app.

A paired physical iPhone and unbooted simulators are available, but no native app containing this model was built/installed. Therefore no phone inference, offline-device operation, native peak memory, thermal/battery or Android APK claim follows from this spike. Desktop Python CPU success does not close that gap.

## Shared implementation and security review

`src/services/privacy/contracts.ts` defines original-input UTF-16 entities, PrivacyProcessor, LocalEntityDetector, installation states, versioned manifests and an atomic package-store boundary. `privacyProcessor.ts` performs validated deterministic span substitution and optional existing `applyPerspectiveDistancing`; disposal invalidates pending results. Aliases are stable for repeated exact spans within a processing call only. It does not persist originals or identity maps.

`modelManager.ts` owns verified package installation, version lookup, state/progress and removal. Downloads/store are injected. It validates lengths/hashes before a single atomic store commit and rejects removal during an install. This is a tested coordinator, **not an implemented IndexedDB/native-filesystem model store or onboarding download UI**. The current in-memory package staging is appropriate to this seam/spike; mobile delivery needs streaming staging and platform storage quotas.

`selectProcessor.ts` keeps `journal_only`, `local` and explicitly supplied `cloud_demo` distinct. Journal-only returns no processor. Missing local inference throws and cannot silently select cloud. No cloud-demo transport is supplied. Every produced result has `review: required`; no approved outbound token or network gateway is claimed. Product integration must not treat `sanitised` as automatic authorization.

Security review: model/download integrity and path-safe artifact identifiers are validated; model bytes are data, not scripts; synthetic-only harness is loopback-bound and outside app packaging; no keys/account information or raw journals are logged; no provider fallback sends originals remotely; stale results cannot return after dispose. Tests cover malformed/overlapping/surrogate-splitting spans, lifecycle invalidation, corrupt packages, installation deduplication, removal and mode isolation. A known limitation remains: the existing distancer always chooses feminine pronouns and uses phrase substitution, including place phrases. Model recognition of “I” can produce a placeholder while later “I” becomes “she”; this is shown in actual output. It is local and reusable for its current view behavior, not a general actor-preserving rewrite engine or contextual privacy verifier.

Initial Transformers.js exploration brought an advisory through its Node image dependency `sharp`; it was removed from the final candidate graph by using standalone Tokenizers.js. The clean spike graph audit reports zero known advisories at assessment time, including dev tooling; this is a registry snapshot, not an assurance of no vulnerabilities. Root app package/lockfile are unchanged.

## Next implementation step

Keep the interfaces and lightweight journal intact. The next bounded step is **native compatibility repair and one physical-device CPU run before dependency adoption**: test an isolated maintained plugin patch/fork admitting Capacitor8 (and aligning iOS15.1), or replace only its native inference adapter with a minimal Objective-C/Java ORT bridge. Do not downgrade the application to fit this plugin. Load the exact checked artifact from app-private storage, run these same INT64/BOOL tensors, select `logits`, compare spans with this evidence, then measure offline behavior, cold/warm latency and process memory. Only that establishes a native selection.

In the same integration slice, add deterministic email/phone recognizers with overlap reconciliation (the current email miss is a concrete reason), preserve author identity before distancing, and then implement checksum-verified streaming platform model storage. Behavioral taxonomy/engagement and an explicitly labelled synthetic cloud demo remain compatible separate work; neither was implemented or silently excluded from the product direction here.

## Evidence and validation

Raw files: `.sdd/evidence/privacy-model/` (browser results, independent Python results, graph/types, package metadata/artifact sizes, Swift resolver rejection, audits, contract tests, typecheck and app build). Procedure/source: `scripts/privacy-spike/`. Four focused boundary tests, TypeScript check and main-only app build pass. The existing large app chunk warning remains. No owner acceptance or release is asserted.

Execution recovery: initial npm lock generation through the `/tmp` symlink produced nonportable paths; a versioned package regenerated from `/private/tmp` passes clean installation. While verifying it, one `npm ci` was accidentally launched in the repository rather than the spike. It was stopped; root node_modules was restored with `npm ci --ignore-scripts` from the unchanged root lockfile. Root package.json/package-lock.json have no diff; focused tests and the app build were rerun after restoration. Existing Firebase packages report Node engine warnings and the root audit reports its existing advisories; these were not fixed or conflated with the clean spike audit. This was an execution failure, corrected locally.

Clean replay: after `npm ci` using the saved standalone package/lock, the saved source harness passes again with no Transformers.js dependency installed. Separate evidence `clean-browser-result.json` records load 1,257 ms and timed runs 180/114/114, 155/154/156, 116/113/114 ms for the same three inputs. Earlier detailed timings above remain tied to `browser-result.json`; repeated runs are distinguished rather than overwriting measurements. Clean install/audit reports zero advisories. The dev harness server and temporary browser tab were closed after verification.
