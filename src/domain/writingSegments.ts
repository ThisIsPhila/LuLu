/** A paragraph is complete only after the user enters a blank line. */
export type CompletedWritingInput = {
  paragraphs: string[];
  remainingText: string;
};

export function extractCompletedWritingInput(
  previousText: string,
  nextText: string,
  caret: number,
): CompletedWritingInput | null {
  const boundaryStart = caret - 2;
  if (boundaryStart < 0 || nextText.slice(boundaryStart, caret) !== '\n\n') return null;
  if (previousText.slice(boundaryStart, caret) === '\n\n') return null;

  const completed = nextText.slice(0, boundaryStart);
  const paragraphs = completed
    .split(/\n{2,}/u)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
  if (!paragraphs.length) return null;

  return {
    paragraphs,
    remainingText: nextText.slice(caret),
  };
}
