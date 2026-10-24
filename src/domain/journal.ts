export type Entry = {
  id: string;
  title: string;
  body: string;
  originalBody?: string;
  kind: 'Journal' | 'Story';
  date: string;
  timeStr: string;
  wordsCount: number;
  groupDate: 'Today' | 'Yesterday' | 'Earlier';
  tags: string[];
  imageUrl?: string;
  favorite: boolean;
  protected: boolean;
  perspective?: 'first' | 'third';
  entitiesRecognized?: string[];
  curatedDeck?: string;
};

export const seed: Entry[] = [
  {
    id: 'entry-1',
    title: 'A calm morning',
    body: 'Started the day with a walk. The air was crisp and it helped me think more clearly about what I want to work on this month. The leaves were still damp with dew.',
    kind: 'Journal',
    date: '2026-05-14T09:14:00',
    timeStr: '09:14',
    wordsCount: 324,
    groupDate: 'Today',
    tags: ['Morning Walk', 'Reflection'],
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=300&q=80',
    favorite: false,
    protected: false,
  },
  {
    id: 'entry-2',
    title: 'Notes on focus',
    body: 'Some thoughts on where I want to put my energy before the workshop starts. Eliminating secondary priorities until the narrative backbone is completely solidified.',
    kind: 'Journal',
    date: '2026-05-14T08:02:00',
    timeStr: '08:02',
    wordsCount: 180,
    groupDate: 'Today',
    tags: ['Deep Work'],
    favorite: true,
    protected: false,
  },
  {
    id: 'entry-3',
    title: 'The conversation',
    body: 'John came to the Nest at Blue Moon and we discussed a few ideas for the project. It felt like a good conversation and I left feeling motivated.\n\nThere are still a few things to consider, but overall it was a positive step forward. I want to build on this and keep the momentum going as the winter approaches.\n\nWalking back under the lamplight, the silence of the city felt grounding rather than lonely. Sometimes all you need is a mirror that keeps your secrets safe while letting you see them clearly.',
    originalBody: 'David came to my place yesterday and threatened me. I am worried about what might happen next...\n\nHe shouted at my house in Tamboerskloof around 9pm. I managed to lock the door and call someone I trust, but I felt terrified.\n\nI am keeping this private record here so there is an exact timeline if I need to report this.',
    kind: 'Journal',
    date: '2026-05-13T21:36:00',
    timeStr: '21:36',
    wordsCount: 245,
    groupDate: 'Yesterday',
    tags: ['Protected', 'Enclave'],
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80',
    favorite: true,
    protected: true,
    perspective: 'third',
    entitiesRecognized: ['John', 'The Nest', 'Blue Moon'],
  },
  {
    id: 'entry-4',
    title: 'Project ideas & exploratory themes',
    body: 'Things to explore this week with the creative circle: ceramic textures, quiet typography, and building software that feels like an open notebook rather than a transaction.',
    kind: 'Story',
    date: '2026-05-13T17:11:00',
    timeStr: '17:11',
    wordsCount: 412,
    groupDate: 'Yesterday',
    tags: ['Studio Roadmap', 'Materiality'],
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80',
    favorite: false,
    protected: false,
  },
  {
    id: 'entry-5',
    title: 'Spring Monologue',
    body: 'Quiet daylight drifting through linen curtains. Notes on stillness, the cadence of early tea, and the small rituals that keep life anchored.',
    kind: 'Story',
    date: '2026-05-11T12:30:00',
    timeStr: '12:30',
    wordsCount: 195,
    groupDate: 'Earlier',
    tags: ['Archival Sheets'],
    imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80',
    curatedDeck: 'Curated Deck • 4 archival sheets',
    favorite: false,
    protected: false,
  },
];

const STORAGE_KEY = 'lulu.stitch.entries.v3';

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const v = JSON.parse(raw);
    if (Array.isArray(v) && v.length > 0) return v;
  } catch {}
  return seed;
}

export function persistEntries(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export const persist = persistEntries;
export const loadJournal = loadEntries;
