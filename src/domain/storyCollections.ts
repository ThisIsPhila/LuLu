/** Normalize an optional ordinary Story collection label for display and storage. */
export function normalizeStoryCollection(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new TypeError('A Story collection name must be text.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length > 80) throw new RangeError('A Story collection name must be 80 characters or fewer.');
  return name || undefined;
}
