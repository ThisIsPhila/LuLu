/** Split at two consecutive line breaks. A single line break stays in the draft.
 * Preserve all other characters, including spacing, for later editing. */
export function splitCompletedSegments(input: string): { completed: string[]; draft: string } {
  const normalized = input.replace(/\r\n?/g, '\n');
  const parts = normalized.split('\n\n');
  const draft = parts.pop() ?? '';
  return { completed: parts, draft };
}
