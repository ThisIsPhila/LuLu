import type { DetectedEntity } from './contracts.ts';

const EMAIL = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?)+/gu;
const PHONE = /(?<!\w)(?:\+?\d[\d ()-]{7,}\d)(?!\w)/gu;
// 12-hour forms allow 1–12 with optional am/pm; 24-hour forms require HH.
// Both paths enforce valid ranges and reject partial matches in invalid times.
const TIME = /(?<![\p{L}\p{N}:])(?:(?:0?[1-9]|1[0-2]):[0-5]\d(?:\s*(?:a\.?m\.?|p\.?m\.?))?|(?:[01]\d|2[0-3]):[0-5]\d)(?![\p{L}\p{N}:]|\s*(?:a\.?m\.?|p\.?m\.?))/giu;

/** Deterministic format checks; spans address the unchanged UTF-16 source. */
export function detectFormattedPii(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];
  const patterns: readonly [RegExp, string][] = [
    [EMAIL, 'email'],
    [PHONE, 'phone number'],
    [TIME, 'time'],
  ];
  for (const [pattern, label] of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;
      entities.push({ start: match.index, end: match.index + match[0].length, label, confidence: 1, detector: 'format check' });
    }
  }
  return entities.sort((a, b) => a.start - b.start || a.end - b.end || a.label.localeCompare(b.label));
}

/** Select a deterministic non-overlapping set, with format checks winning ties. */
export function mergeDetectedEntities(model: readonly DetectedEntity[], formatted: readonly DetectedEntity[]): DetectedEntity[] {
  const candidates = [...model, ...formatted].sort((a, b) =>
    b.confidence - a.confidence ||
    Number(b.detector === 'format check') - Number(a.detector === 'format check') ||
    a.start - b.start || a.end - b.end || a.label.localeCompare(b.label) || a.detector.localeCompare(b.detector));
  const selected: DetectedEntity[] = [];
  for (const candidate of candidates) {
    if (!selected.some(existing => candidate.start < existing.end && existing.start < candidate.end)) selected.push(candidate);
  }
  return selected.sort((a, b) => a.start - b.start || a.end - b.end || a.label.localeCompare(b.label));
}
