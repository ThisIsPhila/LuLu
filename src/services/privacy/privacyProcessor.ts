import { applyPerspectiveDistancing } from '../../domain/transform.ts';
import type { DetectedEntity, LocalEntityDetector, PrivacyProcessor } from './contracts.ts';

function boundary(text: string, index: number): boolean {
  return !(index > 0 && index < text.length && /[\uD800-\uDBFF]/.test(text[index - 1]) && /[\uDC00-\uDFFF]/.test(text[index]));
}

/** No Unicode normalisation: every span must address the original input. */
export function replaceDetectedSpans(input: string, entities: readonly DetectedEntity[]): string {
  const sorted = [...entities].sort((a, b) => a.start - b.start || b.end - a.end);
  let end = 0;
  let output = '';
  const aliases = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const entity of sorted) {
    if (!Number.isSafeInteger(entity.start) || !Number.isSafeInteger(entity.end) || entity.start < end
      || entity.end <= entity.start || entity.end > input.length || !boundary(input, entity.start) || !boundary(input, entity.end)
      || !/^[a-z][a-z_ ]{0,63}$/i.test(entity.label) || !Number.isFinite(entity.confidence) || entity.confidence < 0 || entity.confidence > 1) {
      throw new Error('Invalid or overlapping detection span');
    }
    const label = entity.label.toUpperCase().replaceAll(' ', '_');
    const key = `${label}:${input.slice(entity.start, entity.end)}`;
    let alias = aliases.get(key);
    if (!alias) {
      const count = (counts.get(label) ?? 0) + 1;
      counts.set(label, count);
      alias = `[${label}_${count}]`;
      aliases.set(key, alias);
    }
    output += input.slice(end, entity.start) + alias;
    end = entity.end;
  }
  return output + input.slice(end);
}

export function createLocalPrivacyProcessor(detector: LocalEntityDetector): PrivacyProcessor {
  let ready = false;
  let generation = 0;
  return {
    provider: 'local',
    async initialise() {
      const current = ++generation;
      ready = false;
      await detector.initialise();
      if (current === generation) ready = true;
    },
    async process(input, options) {
      if (!ready) throw new Error('Local privacy model is not ready');
      if (!input.trim() || input.length > 10000) throw new Error('Unsupported privacy input length');
      const current = generation;
      const detectedEntities = await detector.detect(input);
      if (!ready || current !== generation) throw new Error('Privacy processing session ended');
      const sanitised = replaceDetectedSpans(input, detectedEntities);
      return {
        sanitised: options?.distance ? applyPerspectiveDistancing(sanitised) : sanitised,
        detectedEntities,
        provider: 'local',
        modelVersion: detector.modelVersion,
        review: 'required',
        distancing: options?.distance ? 'existing_phrase_rules' : 'none',
      };
    },
    async dispose() {
      ready = false;
      generation++;
      await detector.dispose();
    },
  };
}
