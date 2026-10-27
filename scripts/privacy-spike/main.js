import { createLocalPrivacyProcessor } from '@lulu/privacyProcessor';
import { Tokenizer } from '@huggingface/tokenizers';
import { CapacitorOnnxWeb } from '@cantoo/capacitor-onnx/web';
import { fixtures, prepare, decode } from './gliner-codec.mjs';
const result = document.querySelector('#result');
document.querySelector('#run').onclick = async () => {
  result.textContent = 'Loading local files…';
  try {
    const tokenStart = performance.now();
    const tokenizer = new Tokenizer(await (await fetch('/tokenizer.json')).json(), await (await fetch('/tokenizer_config.json')).json());
    const tokenizerMs = performance.now() - tokenStart;
    const model = new Uint8Array(await (await fetch('/model_quantized.onnx')).arrayBuffer());
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', model)), b => b.toString(16).padStart(2,'0')).join('');
    if (hash !== 'c76c90920547fd937aaf505e7f2de5ec73168bf1c25abbb55a298104cb061400') throw Error('Checksum mismatch');
    const runtime = new CapacitorOnnxWeb();
    const identity = { modelId: 'gliner-small-v2.1', version: '8142fb0-int8' };
    const loaded = await runtime.loadModel({ ...identity, modelBuffer: model, sessionOptions: { executionProvider: 'wasm', web: { multithread: false, wasmPath: '/node_modules/onnxruntime-web/dist/' } } });
    const cases = [];
    for (const text of fixtures) {
      const tokenStart = performance.now();
      const { words, inputs } = prepare(text, tokenizer);
      const preparationMs = performance.now() - tokenStart;
      const runs = [];
      let output;
      for (let i = 0; i < 3; i++) { output = await runtime.run({ ...identity, inputs }); runs.push(output.latencyMs); }
      const tensor = output.outputs.logits;
      const entities = decode(tensor, words);
      const processor = createLocalPrivacyProcessor({ modelVersion: identity.version, initialise: async () => {}, dispose: async () => {}, detect: async input => { const prepared = prepare(input, tokenizer); const inference = await runtime.run({ ...identity, inputs: prepared.inputs }); return decode(inference.outputs.logits, prepared.words); } });
      await processor.initialise();
      const processed = await processor.process(text, { distance: true });
      await processor.dispose();
      cases.push({ processed, text, words: words.length, subwords: inputs.input_ids.data.length, preparationMs, runsMs: runs, outputNames: Object.keys(output.outputs), outputDims: tensor.dims, entities: entities.map(e => ({...e, text: text.slice(e.start, e.end)})), inputIds: inputs.input_ids.data, wordsMask: inputs.words_mask.data });
    }
    await runtime.release(identity);
    result.textContent = JSON.stringify({ status:'passed', tokenizerPackage:'@huggingface/tokenizers@0.2.0', environment: navigator.userAgent, crossOriginIsolated, modelBytes:model.length, sha256:hash, tokenizerMs, loaded, cases, memory:performance.memory ? { ...performance.memory, usedJSHeapSize:performance.memory.usedJSHeapSize, totalJSHeapSize:performance.memory.totalJSHeapSize } : 'unavailable' }, null, 2);
    await fetch('/evidence', {method:'POST', body:result.textContent});
  } catch (error) { result.textContent = JSON.stringify({ status:'failed', error:String(error), stack:error.stack }, null, 2); await fetch('/evidence', {method:'POST', body:result.textContent}); }
};
