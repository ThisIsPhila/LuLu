import { Tokenizer } from '@huggingface/tokenizers';
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import type { DetectedEntity, LocalEntityDetector } from './contracts';
import { getInstalledModelFile, PRIVACY_MODEL } from './modelPackage';

// Zero-shot labels are candidates for review, not guarantees of context coverage.
const labels = ['person', 'location', 'organization', 'email', 'phone number', 'date', 'time', 'relationship'];
type Word = { text: string; start: number; end: number };
type InputTensor = { data: number[]; dims: number[]; type?: 'int64' | 'bool' };

function prepare(text: string, tokenizer: Tokenizer) {
  const words: Word[] = [...text.matchAll(/[\p{L}\p{N}_]+(?:[-_][\p{L}\p{N}_]+)*|[^\s]/gu)].map(match => ({ text: match[0], start: match.index!, end: match.index! + match[0].length }));
  if (!words.length || words.length > 384) throw new Error('Please use a shorter text (up to 384 words).');
  const prompt = labels.flatMap(label => ['<<ENT>>', label]).concat('<<SEP>>');
  const ids = [1];
  const mask = [0];
  for (const [index, word] of [...prompt, ...words.map(item => item.text)].entries()) {
    const encoded = tokenizer.encode(word, { add_special_tokens: false });
    const tokens = encoded.ids;
    if (!tokens.length) throw new Error('Tokenizer returned an empty word.');
    ids.push(...tokens);
    mask.push(...tokens.map((_, offset) => index >= prompt.length && offset === 0 ? index - prompt.length + 1 : 0));
  }
  ids.push(2); mask.push(0);
  if (ids.length > 512) throw new Error('This text is too complex for the demo model. Try a shorter passage.');
  const spanIndices: number[] = [];
  const spanValid: number[] = [];
  for (let start = 0; start < words.length; start++) for (let width = 0; width < 12; width++) {
    spanIndices.push(start, start + width);
    spanValid.push(Number(start + width < words.length));
  }
  const tensor = (data: number[], dims: number[], type: 'int64' | 'bool' = 'int64'): InputTensor => ({ data, dims, type });
  return { words, inputs: {
    input_ids: tensor(ids, [1, ids.length]),
    attention_mask: tensor(ids.map(() => 1), [1, ids.length]),
    words_mask: tensor(mask, [1, ids.length]),
    text_lengths: tensor([words.length], [1, 1]),
    span_idx: tensor(spanIndices, [1, words.length * 12, 2]),
    span_mask: tensor(spanValid, [1, words.length * 12], 'bool'),
  } };
}

function decode(output: ort.Tensor, words: Word[]): DetectedEntity[] {
  if (output.dims.join(',') !== [1, words.length, 12, labels.length].join(',')) throw new Error('The model returned an unexpected result.');
  const data = output.data as Float32Array;
  const candidates: DetectedEntity[] = [];
  for (let start = 0; start < words.length; start++) for (let width = 0; width < 12 && start + width < words.length; width++) for (let label = 0; label < labels.length; label++) {
    const confidence = 1 / (1 + Math.exp(-data[(start * 12 + width) * labels.length + label]));
    if (confidence >= 0.5) candidates.push({ start: words[start].start, end: words[start + width].end, label: labels[label], confidence, detector: 'GLiNER Small v2.1 INT8' });
  }
  const selected: DetectedEntity[] = [];
  for (const candidate of candidates.sort((a, b) => b.confidence - a.confidence)) if (!selected.some(item => candidate.start < item.end && item.start < candidate.end)) selected.push(candidate);
  return selected.sort((a, b) => a.start - b.start);
}

function toTensor(input: InputTensor): ort.Tensor {
  if (input.type === 'bool') return new ort.Tensor('bool', Uint8Array.from(input.data), input.dims);
  return new ort.Tensor('int64', BigInt64Array.from(input.data, value => BigInt(value)), input.dims);
}

export function createGlinerBrowserDetector(): LocalEntityDetector {
  let tokenizer: Tokenizer | undefined;
  let session: ort.InferenceSession | undefined;
  let generation = 0;
  let initialising: Promise<void> | undefined;
  let running: Promise<unknown> = Promise.resolve();
  return {
    modelVersion: `GLiNER Small v2.1 INT8 (${PRIVACY_MODEL.version.slice(0, 12)})`,
    async initialise() {
      if (tokenizer && session) return;
      if (initialising) return initialising;
      const version = generation;
      const operation = (async () => {
      const [model, tokenizerFile, tokenizerConfigFile] = await Promise.all([
        getInstalledModelFile('model_quantized.onnx'),
        getInstalledModelFile('tokenizer.json'),
        getInstalledModelFile('tokenizer_config.json'),
      ]);
      if (version !== generation) throw new Error('Model preparation was cancelled.');
      if (!model || !tokenizerFile || !tokenizerConfigFile) throw new Error('Install the model in Settings before running the demo.');
      ort.env.wasm.wasmPaths = { mjs: wasmMjsUrl, wasm: wasmUrl };
      ort.env.wasm.numThreads = 1;
      const preparedTokenizer = new Tokenizer(JSON.parse(new TextDecoder().decode(tokenizerFile)), JSON.parse(new TextDecoder().decode(tokenizerConfigFile)));
      const preparedSession = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
      if (version !== generation) {
        await preparedSession.release();
        throw new Error('Model preparation was cancelled.');
      }
      tokenizer = preparedTokenizer;
      session = preparedSession;
      })();
      initialising = operation;
      try { await operation; }
      finally { if (initialising === operation) initialising = undefined; }
    },
    async detect(text) {
      const version = generation;
      const operation = running.catch(() => {}).then(async () => {
      const activeSession = session;
      if (!tokenizer || !activeSession || version !== generation) throw new Error('The model is not ready.');
      const prepared = prepare(text, tokenizer);
      const feeds: Record<string, ort.Tensor> = {};
      let outputs: ort.InferenceSession.OnnxValueMapType | undefined;
      try {
      for (const [name, value] of Object.entries(prepared.inputs)) feeds[name] = toTensor(value);
      outputs = await activeSession.run(feeds);
      if (version !== generation) throw new Error('Model processing was cancelled.');
      const logits = outputs.logits;
      if (!logits) throw new Error('The model did not return entity scores.');
      return decode(logits, prepared.words);
      } finally {
        for (const tensor of Object.values(feeds)) tensor.dispose();
        for (const tensor of Object.values(outputs ?? {})) tensor.dispose();
      }
      });
      running = operation;
      return operation;
    },
    async dispose() {
      generation++;
      tokenizer = undefined;
      const loaded = session;
      session = undefined;
      await Promise.allSettled([initialising, running]);
      await loaded?.release();
    },
  };
}

let sharedDetector: LocalEntityDetector | undefined;
let sharedInitialisation: Promise<void> | undefined;
let sharedReady = false;
let sharedGeneration = 0;

export type BrowserModelRuntimeState = 'not_loaded' | 'loading' | 'ready';

export function getBrowserModelRuntimeState(): BrowserModelRuntimeState {
  if (sharedReady) return 'ready';
  return sharedInitialisation ? 'loading' : 'not_loaded';
}

export function getSharedGlinerBrowserDetector(): LocalEntityDetector {
  sharedDetector ??= createGlinerBrowserDetector();
  return sharedDetector;
}

/** Loads the installed files and keeps one ONNX session alive for this tab. */
export async function prepareGlinerBrowserModel(): Promise<void> {
  if (sharedReady) return;
  const generation = sharedGeneration;
  if (!sharedInitialisation) {
    const detector = getSharedGlinerBrowserDetector();
    sharedInitialisation = detector.initialise().then(() => {
      if (generation !== sharedGeneration) throw new Error('Model preparation was cancelled.');
      sharedReady = true;
    });
  }
  try { await sharedInitialisation; }
  catch (error) {
    if (generation !== sharedGeneration) throw error;
    const failed = sharedDetector;
    sharedDetector = undefined;
    sharedInitialisation = undefined;
    sharedReady = false;
    await failed?.dispose().catch(() => {});
    throw error;
  }
}

export async function unloadGlinerBrowserModel(): Promise<void> {
  sharedGeneration++;
  const loaded = sharedDetector;
  sharedDetector = undefined;
  sharedInitialisation = undefined;
  sharedReady = false;
  await loaded?.dispose();
}
