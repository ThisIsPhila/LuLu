import { useEffect, useMemo, useState } from 'react';
import {
  projectParagraphs,
  reduceParagraphPrivacy,
  type Paragraph,
} from '../domain/privacy/paragraphs.ts';
import './PrivateParagraphEditor.css';

type PrivateParagraphEditorProps = {
  value: string;
  onChange: (value: string) => void;
  sessionUnlocked: boolean;
};

type ParagraphBlock = Paragraph & { separator: string };

/**
 * Paragraph-at-a-time editor for an already-authorized private session.
 * Only the active paragraph's text is placed in an editable DOM value.
 */
export function PrivateParagraphEditor({ value, onChange, sessionUnlocked }: PrivateParagraphEditorProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const blocks = useMemo(() => splitParagraphs(value), [value]);
  const paragraphs = useMemo(() => blocks.map(({ id, text }) => ({ id, text })), [blocks]);
  const activeParagraphId = activeIndex !== null && paragraphs[activeIndex] ? paragraphs[activeIndex].id : null;
  const privacyState = activeParagraphId
    ? reduceParagraphPrivacy({}, { type: 'reveal', paragraphId: activeParagraphId }, paragraphs)
    : {};
  const projection = projectParagraphs(paragraphs, privacyState, sessionUnlocked);

  useEffect(() => {
    if (!sessionUnlocked) setActiveIndex(null);
  }, [sessionUnlocked]);

  const replaceParagraph = (index: number, text: string) => {
    if (!sessionUnlocked) return;
    const original = blocks[index];
    if (!original) return;
    const editedParts = splitParagraphs(text);
    const replacement = editedParts.map((part, partIndex) => ({
      ...part,
      separator: partIndex < editedParts.length - 1 ? part.separator : original.separator,
    }));
    const nextBlocks = [...blocks.slice(0, index), ...replacement, ...blocks.slice(index + 1)];
    setActiveIndex(index);
    onChange(joinParagraphs(nextBlocks));
  };

  const addParagraph = () => {
    if (!sessionUnlocked) return;
    const insertionIndex = activeIndex === null ? blocks.length : Math.min(activeIndex + 1, blocks.length);
    if (blocks.length === 1 && blocks[0].text === '' && blocks[0].separator === '') {
      setActiveIndex(0);
      return;
    }

    const nextBlocks = blocks.map(block => ({ ...block }));
    const previous = insertionIndex > 0 ? nextBlocks[insertionIndex - 1] : undefined;
    const following = nextBlocks[insertionIndex];
    const boundary = previous?.separator || '\n\n';
    if (previous) previous.separator = boundary;
    nextBlocks.splice(insertionIndex, 0, { id: '', text: '', separator: following ? boundary : '' });
    const normalized = assignIndexIds(nextBlocks);
    setActiveIndex(insertionIndex);
    onChange(joinParagraphs(normalized));
  };

  return (
    <section className="private-paragraph-editor" aria-label="Private writing">
      <div className="private-paragraph-list">
        {projection.map((view, index) => view.concealed ? (
          <button
            className="private-paragraph-concealed"
            key={view.id}
            type="button"
            aria-label={`Reveal paragraph ${index + 1}`}
            onClick={() => sessionUnlocked && setActiveIndex(index)}
            disabled={!sessionUnlocked}
          >
            <span aria-hidden="true">••••••••••••••••</span>
            <span className="private-paragraph-reveal-label">Reveal paragraph {index + 1}</span>
          </button>
        ) : (
          <textarea
            className="private-paragraph-active"
            key={view.id}
            value={view.displayText}
            onChange={event => replaceParagraph(index, event.target.value)}
            aria-label={`Edit paragraph ${index + 1}`}
            rows={Math.max(3, Math.min(12, view.displayText.split('\n').length + 1))}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
        ))}
      </div>
      <button className="private-paragraph-add" type="button" onClick={addParagraph} disabled={!sessionUnlocked}>
        Add paragraph
      </button>
    </section>
  );
}

function splitParagraphs(value: string): ParagraphBlock[] {
  const blocks: ParagraphBlock[] = [];
  const separatorPattern = /(?:\r?\n[\t ]*\r?\n)+/g;
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = separatorPattern.exec(value)) !== null) {
    blocks.push({ id: `paragraph-${blocks.length}`, text: value.slice(start, match.index), separator: match[0] });
    start = match.index + match[0].length;
  }
  blocks.push({ id: `paragraph-${blocks.length}`, text: value.slice(start), separator: '' });
  return blocks;
}

function joinParagraphs(blocks: readonly ParagraphBlock[]): string {
  return blocks.map(block => block.text + block.separator).join('');
}

function assignIndexIds(blocks: readonly ParagraphBlock[]): ParagraphBlock[] {
  return blocks.map((block, index) => ({ ...block, id: `paragraph-${index}` }));
}
