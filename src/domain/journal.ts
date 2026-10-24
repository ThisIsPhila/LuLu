export type Entry = {
  id: string;
  title: string;
  body: string;
  originalBody?: string;
  kind: 'Journal' | 'Story';
  date: string;
  timeStr?: string;
  groupDate?: 'Today' | 'Yesterday' | 'Earlier';
  favorite: boolean;
  protected: boolean;
  perspective?: 'first' | 'third';
  entitiesRecognized?: string[];
};

export const seed: Entry[] = [
  {
    id: 'entry-1',
    title: 'A calm morning',
    body: 'Started the day with a walk. The air was crisp and it helped me think more clearly about what I want to work on this month.\n\nI met up with David later and we discussed a few ideas for the project. It felt like a good conversation and I left feeling motivated.',
    kind: 'Journal',
    date: '2026-10-24T09:14:00',
    timeStr: '09:14',
    groupDate: 'Today',
    favorite: false,
    protected: false,
  },
  {
    id: 'entry-2',
    title: 'Notes on focus',
    body: 'Some thoughts on where I want to put my creative energy. Less noise, more craft.\n\nFocusing on building things that feel thoughtful, private and enduring.',
    kind: 'Journal',
    date: '2026-10-24T08:02:00',
    timeStr: '08:02',
    groupDate: 'Today',
    favorite: true,
    protected: false,
  },
  {
    id: 'entry-3',
    title: 'The conversation',
    body: 'John came to the Nest at Blue Moon and we discussed a few ideas for the project. It felt like a good conversation and I left feeling motivated.\n\nThere are still a few things to consider, but overall it was a positive step forward. I want to build on this and keep the momentum going.',
    originalBody: 'David came to my home at 9pm and threatened me. We argued about a few things for the project. It felt like a dangerous conversation and I left feeling terrified.\n\nThere are still a few things to report, but overall I survived. I want to build on this and keep myself safe.',
    kind: 'Journal',
    date: '2026-10-23T21:36:00',
    timeStr: '21:36',
    groupDate: 'Yesterday',
    favorite: true,
    protected: true,
    perspective: 'third',
    entitiesRecognized: ['John', 'The Nest', 'Blue Moon'],
  },
  {
    id: 'entry-4',
    title: 'Ideas for the studio',
    body: 'Things to explore this week: tactile interactions, quiet typography, and building software that feels like an open notebook rather than a transaction.',
    kind: 'Story',
    date: '2026-10-23T17:11:00',
    timeStr: '17:11',
    groupDate: 'Yesterday',
    favorite: false,
    protected: false,
  },
  {
    id: 'entry-5',
    title: 'The long walk home',
    body: 'There is a quiet rhythm to walking after sunset. The city turns down its volume just enough for thoughts to complete themselves.',
    kind: 'Story',
    date: '2026-10-11T19:40:00',
    timeStr: '19:40',
    groupDate: 'Earlier',
    favorite: false,
    protected: false,
  },
  {
    id: 'entry-6',
    title: 'A question of time',
    body: 'She asked how long it takes to know someone. Sometimes a minute. Sometimes three seasons. Most times, we are only meeting ourselves in another mirror.',
    kind: 'Story',
    date: '2026-10-06T14:15:00',
    timeStr: '14:15',
    groupDate: 'Earlier',
    favorite: false,
    protected: false,
  },
];

const STORAGE_KEY = 'lulu.app.entries.v1';

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const v = JSON.parse(raw);
    if (Array.isArray(v) && v.length > 0) return v;
  } catch {
    // fallback
  }
  return seed;
}

export function persistEntries(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export const persist = persistEntries;
