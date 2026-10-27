# Synthetic GLiNER compatibility spike

This is an isolated research harness, excluded from the journal app build. No real records, auth, cloud inference or paid API are used. Source model/configuration revision and SHA-256 checksums are in `manifest.json`. Download is about 192 MB, plus runtimes; assets are deliberately outside the repository and app bundle.

From the repository root, with Node 22:

```sh
node scripts/privacy-spike/prepare.mjs /tmp/lulu-privacy-spike
npm ci --prefix /private/tmp/lulu-privacy-spike --ignore-scripts
LULU_REPO_ROOT="$PWD" node /tmp/lulu-privacy-spike/node_modules/vite/bin/vite.js --config scripts/privacy-spike/vite.config.mjs
```

Open `http://127.0.0.1:5186`, click **Run local synthetic inference**. Only loopback requests are needed once files are prepared. `browser-result.json` is written in the temporary directory. It records checksums, environment, load/preparation/inference timings, model-derived entities and actual shared PrivacyProcessor output. This is a single-thread WASM CPU run with `crossOriginIsolated=false`, not WebGPU or native inference. Runtime JS and WASM stay on the same origin; do not replace them with mixed-version CDN files.

Independent Python CPU/tokenizer parity check (Python 3.12, prebuilt wheels):

```sh
python3.12 -m venv /tmp/lulu-privacy-spike/py312
/tmp/lulu-privacy-spike/py312/bin/pip install --only-binary=:all: -r scripts/privacy-spike/requirements.txt
/tmp/lulu-privacy-spike/py312/bin/python scripts/privacy-spike/verify_model.py /tmp/lulu-privacy-spike
```

This independently tokenizes prompt + pre-split words with the Rust tokenizer and checks IDs/masks against JavaScript, inspects graph operators/types, executes CPU inference and records process peak RSS. Python RSS includes graph inspection and interpreter memory; it is not mobile inference memory.

For the native resolution check, create an isolated Swift package depending on Capacitor `exact: "8.5.3"` and the installed local `@cantoo/capacitor-onnx` package, then `swift package resolve`. The published plugin 3.3.0 has a Capacitor `7.0.0..<8.0.0` constraint and fails resolution. Raw command/result are in `.sdd/evidence/privacy-model/spm-resolve.log`. No native source patch, device installation or native inference success is claimed.

The three fixtures are a mechanism check, not a quality benchmark. The email miss, omitted decomposed-name entity, and author-pronoun interaction remain visible. Limits: batch 1, up to 384 splitter words, maximum entity span 12 words and 512 subtokens; longer input rejects rather than truncating. All replacement offsets are end-exclusive UTF-16 indices into unchanged input. The tokenizer may normalize its own model representation; offsets never derive from its normalized string.
