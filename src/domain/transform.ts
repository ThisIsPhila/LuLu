export type EntityType = 'Person' | 'Place' | 'Time' | 'Topic' | 'Pronoun';

export type Entity = {
  id: string;
  original: string;
  alias: string;
  type: EntityType;
  mentions?: number;
  contextSnippet?: string;
};

export const initialEntities: Entity[] = [
  {
    id: 'person-david',
    original: 'David',
    alias: 'John',
    type: 'Person',
    mentions: 4,
    contextSnippet: '...met up with John [David] later to discuss plans...',
  },
  {
    id: 'place-home',
    original: 'home',
    alias: 'the Nest',
    type: 'Place',
    mentions: 2,
    contextSnippet: '...morning breeze at the Nest was crisp and kept thoughts untangled...',
  },
  {
    id: 'place-myplace',
    original: 'my place',
    alias: 'Blue Moon',
    type: 'Place',
    mentions: 1,
    contextSnippet: '...visited my place yesterday...',
  },
  {
    id: 'place-tamboerskloof',
    original: 'house in Tamboerskloof',
    alias: 'The Nest',
    type: 'Place',
    mentions: 1,
    contextSnippet: '...quiet light settling on The Nest...',
  },
  {
    id: 'time-evening',
    original: '9pm',
    alias: 'Blue Moon',
    type: 'Time',
    mentions: 1,
    contextSnippet: '...departed around Blue Moon...',
  },
  {
    id: 'pronoun-me',
    original: 'me / I',
    alias: 'her / she',
    type: 'Pronoun',
    mentions: 3,
    contextSnippet: '...threatened her. She is worried about what might happen next...',
  },
];

export function applyPerspectiveDistancing(text: string): string {
  let out = text;
  const phraseMap: [RegExp, string][] = [
    [/\bI['’]m\b/gi, 'she is'],
    [/\bI['’]ve\b/gi, 'she has'],
    [/\bI['’]ll\b/gi, 'she will'],
    [/\bmy the Nest\b/gi, 'the Nest'],
    [/\bmy place\b/gi, 'Blue Moon'],
    [/\bmy home\b/gi, 'the Nest'],
    [/\bI was\b/g, 'she was'],
    [/\bI am\b/g, 'she is'],
    [/\bI had\b/g, 'she had'],
    [/\bI felt\b/g, 'she felt'],
    [/\bI met\b/g, 'she met'],
    [/\bI left\b/g, 'she left'],
    [/\bI wanted\b/g, 'she wanted'],
    [/\bI managed\b/g, 'she managed'],
    [/\bI survived\b/g, 'she survived'],
    [/\bI could\b/g, 'she could'],
    [/\bI would\b/g, 'she would'],
    [/\bI\b/g, 'she'],
    [/\bme\b/g, 'her'],
    [/\bmy\b/g, 'her'],
    [/\bmyself\b/g, 'herself'],
  ];

  for (const [regex, replacement] of phraseMap) {
    out = out.replace(regex, replacement);
  }

  // Capitalize beginnings of sentences if replacement occurred at start
  out = out.replace(/(^\s*|\.\s+)([a-z])/g, (_match, prefix, char) => `${prefix}${char.toUpperCase()}`);

  return out;
}

export function transform(
  text: string,
  entities: Entity[],
  options: { perspectiveDistancing?: boolean } = { perspectiveDistancing: true }
): string {
  const spans = detectEntitySpans(text, entities);
  let cursor = 0;
  let out = '';
  for (const span of spans) {
    let prefix = text.slice(cursor, span.index);
    if (span.type === 'Place' && span.original.toLowerCase() === 'home') prefix = prefix.replace(/\bmy\s+$/i, '');
    out += prefix + span.alias;
    cursor = span.index + span.length;
  }
  out += text.slice(cursor);
  return options.perspectiveDistancing ? applyPerspectiveDistancing(out) : out;
}

export function recognised(text: string, entities: Entity[]): Entity[] {
  const spans = resolveSpans(text, entities);
  return entities.map(e => ({ ...e, mentions: spans.filter(s => s.entityId === e.id).length })).filter(e => e.mentions > 0);
}

export type DetectedSpan = {
  original: string;
  alias: string;
  type: EntityType;
  index: number;
  length: number;
};

function resolveSpans(text: string, entities: Entity[]): (DetectedSpan & { entityId: string })[] {
  const spans: (DetectedSpan & { entityId: string })[] = [];
  for (const e of entities) {
    if (e.type === 'Pronoun' || !e.original.trim()) continue;
    const escaped = e.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?<![\\p{L}\\p{N}_])' + escaped + '(?![\\p{L}\\p{N}_])', 'giu');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) spans.push({ entityId: e.id, original: match[0], alias: e.alias, type: e.type, index: match.index, length: match[0].length });
  }
  const selected: typeof spans = [];
  let end = 0;
  for (const span of spans.sort((a,b) => a.index - b.index || b.length - a.length)) {
    if (span.index < end) continue;
    selected.push(span); end = span.index + span.length;
  }
  return selected;
}
export function detectEntitySpans(text: string, entities: Entity[]): DetectedSpan[] {
  return resolveSpans(text, entities).map(({ entityId: _id, ...span }) => span);
}
