/** Normalize ordinary-entry tags at the UI/service boundary. */
export function normalizeOrdinaryTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new TypeError('Use up to 12 topics, separated by commas.');
  }
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') throw new TypeError('Each topic must be text.');
    const tag = item.trim().replace(/^#+/, '').trim();
    if (!tag) continue;
    if (tag.length > 40) throw new TypeError('Each topic must be 40 characters or fewer.');
    const key = tag.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}
