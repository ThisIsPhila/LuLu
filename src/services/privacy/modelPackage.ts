import { createModelManager } from './modelManager';
import type { ModelManifest } from './contracts';
import { browserModelStore } from './browserModelStore';

export const PRIVACY_MODEL: ModelManifest = {
  id: 'gliner-small-v2.1-int8',
  version: '8142fb00740ccea973e64b1272949ff48653df5e',
  license: 'Apache-2.0 (GLiNER base model; retain upstream attribution)',
  artifacts: [
    { name: 'model_quantized.onnx', url: 'https://huggingface.co/onnx-community/gliner_small-v2.1/resolve/8142fb00740ccea973e64b1272949ff48653df5e/onnx/model_quantized.onnx', bytes: 183403734, sha256: 'c76c90920547fd937aaf505e7f2de5ec73168bf1c25abbb55a298104cb061400' },
    { name: 'tokenizer.json', url: 'https://huggingface.co/onnx-community/gliner_small-v2.1/resolve/8142fb00740ccea973e64b1272949ff48653df5e/tokenizer.json', bytes: 8657198, sha256: '677203884d026e721115cf0daccf70ec4239545a13d6619e3e66d7151e0c9ce3' },
    { name: 'tokenizer_config.json', url: 'https://huggingface.co/onnx-community/gliner_small-v2.1/resolve/8142fb00740ccea973e64b1272949ff48653df5e/tokenizer_config.json', bytes: 1806, sha256: 'cef106fb5c03d234f0af80f7577f1fc90b4317f26c26888d625abba11331dc89' },
    { name: 'gliner_config.json', url: 'https://huggingface.co/onnx-community/gliner_small-v2.1/resolve/8142fb00740ccea973e64b1272949ff48653df5e/gliner_config.json', bytes: 731, sha256: '8e8b59de124a256a3f3de67879d0da686fe3f73ecc05093506ba525e451b920d' },
  ],
};

let useLocalPreviewCache = false;

export async function detectLocalPreviewModelCache(): Promise<boolean> {
  if (typeof window === 'undefined' || !['localhost', '127.0.0.1'].includes(window.location.hostname)) return false;
  try {
    const responses = await Promise.all(PRIVACY_MODEL.artifacts.map(artifact => fetch(`/__local-privacy-model/${artifact.name}`, { method: 'HEAD' })));
    useLocalPreviewCache = responses.every(response => response.ok);
    return useLocalPreviewCache;
  } catch { useLocalPreviewCache = false; return false; }
}

async function downloadArtifact(url: string, onProgress: (received: number) => void, expectedBytes: number): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Model download returned ${response.status}.`);
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress(bytes.byteLength);
    return bytes;
  }
  const output = new Uint8Array(expectedBytes);
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > expectedBytes) { await reader.cancel(); throw new Error('Downloaded model file is larger than expected.'); }
    output.set(value, total - value.byteLength);
    onProgress(total);
  }
  if (total !== expectedBytes) throw new Error('Downloaded model file is incomplete.');
  return output;
}

export const privacyModelManager = createModelManager(
  PRIVACY_MODEL,
  browserModelStore,
  (url, progress) => {
    const artifact = PRIVACY_MODEL.artifacts.find(item => item.url === url);
    if (!artifact) throw new Error('Unknown model file.');
    const source = useLocalPreviewCache ? `/__local-privacy-model/${artifact.name}` : url;
    return downloadArtifact(source, progress, artifact.bytes);
  },
  typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && Boolean(crypto.subtle),
);

export const getInstalledModelFile = (name: string) => browserModelStore.readArtifact(PRIVACY_MODEL.id, PRIVACY_MODEL.version, name);
