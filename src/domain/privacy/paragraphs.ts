export type Paragraph = { id: string; text: string };
export type ParagraphPrivacyState = Readonly<Record<string, 'visible' | 'concealed'>>;
export type ParagraphPrivacyAction =
  | { type: 'conceal'; paragraphId: string }
  | { type: 'reveal'; paragraphId: string }
  | { type: 'conceal_all' };

/** State only controls presentation; source paragraphs remain unchanged. */
export function reduceParagraphPrivacy(
  state: ParagraphPrivacyState,
  action: ParagraphPrivacyAction,
  paragraphs: readonly Paragraph[],
): ParagraphPrivacyState {
  const validIds = new Set(paragraphs.map(paragraph => paragraph.id));
  if (action.type === 'conceal_all') {
    return Object.fromEntries(paragraphs.map(paragraph => [paragraph.id, 'concealed'])) as ParagraphPrivacyState;
  }
  if (!validIds.has(action.paragraphId)) return { ...state };
  if (action.type === 'conceal') return { ...state, [action.paragraphId]: 'concealed' };
  // Revealing a different paragraph conceals the previous one (paragraph-away behavior).
  return Object.fromEntries(paragraphs.map(paragraph => [paragraph.id, paragraph.id === action.paragraphId ? 'visible' : 'concealed'])) as ParagraphPrivacyState;
}

/**
 * Safe view projection: concealed text is not copied into the view model,
 * including the field used by assistive technology.
 */
export function projectParagraphs(
  paragraphs: readonly Paragraph[],
  state: ParagraphPrivacyState,
  sessionUnlocked = false,
): readonly ParagraphView[] {
  return paragraphs.map(paragraph => {
    if (!sessionUnlocked || state[paragraph.id] !== 'visible') {
      return { id: paragraph.id, concealed: true, displayText: 'Concealed paragraph', accessibleText: 'Concealed paragraph' };
    }
    return { id: paragraph.id, concealed: false, displayText: paragraph.text, accessibleText: paragraph.text };
  });
}

export type ParagraphView = {
  id: string;
  concealed: boolean;
  displayText: string;
  accessibleText: string;
};
