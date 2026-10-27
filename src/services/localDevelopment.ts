import type { Entry } from '../domain/journal';
import type { AppSession } from './backend/passkeys';
import { normalizeStoryCollection } from '../domain/storyCollections';
import { normalizeOrdinaryTags } from '../domain/ordinaryMetadata';
import type { LibraryItem, LibraryItemDraft, LibraryItemKind } from '../domain/libraryItems';
import catalogueSource from '../../scripts/demo-catalogue-seed.json?raw';

const UID = 'lulu-local-development';
const KEY = 'lulu.development.journal.v1';
const CONTACTS = 'lulu.development.contacts.v1';
const LIBRARY_ITEMS = 'lulu.development.notes-tasks.v1';
const CATALOGUE_MIGRATION = 'lulu.development.catalogue.johannesburg-v1';
const CATALOGUE_CONTENT_MIGRATION = 'lulu.development.catalogue.story-content-v3';
const changed = new EventTarget();

type CatalogueEntry = {
  id: string;
  title: string;
  body: string;
  kind: Entry['kind'];
  protected: false;
  perspective: 'first' | 'third';
  tags: string[];
  curatedDeck?: string;
  createdAt: string;
};
const catalogue = JSON.parse(catalogueSource) as { manifest: { entryIds: string[] }; entries: CatalogueEntry[] };
const previousStoryBodies: Record<string, string> = {
  'demo-story-juniper-01': "When Nia first stopped beside the empty lot on Juniper Street, she was only looking for a place to sit while the rain passed. Rowan was already there, balancing a paper cup on the low brick wall and watching water run toward the storm drain. Between them, the lot held a tangle of grass, two stubborn marigolds, and a broken sign for a shop that had closed years ago.\n\nNia said the space looked like it was waiting for someone to make a decision. Rowan laughed and said it looked like it was waiting for the rain to stop. They both stayed under the awning until the clouds thinned. Before they left, Rowan drew a rectangle in the damp dust with one finger and asked what might fit inside it. Nia said: a table, perhaps. Then they went home separately, carrying the same small question.",
  'demo-story-juniper-02': "A week later, Nia returned with a folded page of measurements. Rowan brought four pots rescued from a storeroom and a jar of screws that had belonged to his grandfather. They began with the table: two borrowed trestles, a wide plank, and a coat of paint that dried darker than the label promised. It wobbled, but only when someone leaned hard on one corner.\n\nPeople passing along Juniper Street slowed to ask what they were making. One neighbour offered mint cuttings; another knew where to find clean compost. A little girl named Amari chose the first marigold pot and insisted it needed a blue stone beside it for luck. By late afternoon, the lot looked almost the same from the road. Up close, it had a place to sit, four green beginnings, and a list of names on the back of Nia's plan.",
  'demo-story-juniper-03': "By the time the first tomatoes ripened, the table had acquired a repaired leg and a collection of mismatched mugs. Nia kept a notebook in the top drawer, where anyone could write down what needed watering or what they had taken home. Rowan added a page for ideas that did not fit anywhere else. Amari's blue stone had moved from the marigold pot to the middle of the table, where it served as a paperweight.\n\nOn the first warm evening of spring, the neighbours cut the tomatoes into a bowl and passed it around with bread. They did not make speeches. Someone asked whether they should try beans next, and three people answered at once. Nia looked at the lot, still uneven and still full of weeds, and saw that it had become a place where a next time could be imagined. She wrote that down before going home.",
  'demo-story-lantern-01': "At the end of the winter festival, Leila found one paper lantern still glowing beneath the arcade roof. Most of the others had gone dark, their painted moons and cranes folded softly against the night. She was supposed to help pack the stalls away, but the lantern's little pool of gold made the tiled passage feel like a room someone had left just for her.\n\nA bookseller named Tomas came by carrying a box of unsold postcards. He asked whether she thought the light would last until morning. Leila said she did not know, so they sat on the step and watched. While they waited, Tomas told her about a postcard he had kept for years without sending. Leila told him about the train trip she kept planning and postponing. When the wick finally dimmed, neither of them had solved the other person's problem. They had, however, made a plan to meet for tea and look at a map.",
  'demo-story-lantern-02': "The next afternoon, Tomas brought the map to the tea shop, folded along a route that crossed three towns and ended by the sea. Leila had expected to talk herself out of the trip. Instead, she noticed the small pencil marks Tomas had added beside places with good bookshops and quiet benches. He said he had drawn them from memory, not advice. That made the route feel less like an itinerary and more like an invitation.\n\nThey chose one weekend, circled the station where Leila would change trains, and left the rest blank. Tomas finally wrote his postcard while they waited for the bill. He addressed it to his sister and kept the message short: he had found a story he wanted to tell her in person. Outside, the arcade was busy again. Leila tucked the map into her bag, no longer needing the lantern to know where to begin.",
};
const previousShortStories = [
  {
    title: 'Small moments',
    body: 'A fictional story for exploring the local app.',
    replacement: "On the morning the rain finally stopped, Mara carried a chair into the courtyard and set it beside the lemon tree. She had meant to go straight to work, but the leaves held bright drops of water and the neighbour's radio was playing softly through an open window. She sat for five minutes, then ten.\n\nA boy from upstairs came down looking for the red kite that had been caught in the branches the day before. Mara helped him reach it with a broom handle. He thanked her as if she had rescued something important, which she had. Before leaving, she noticed a ripe lemon beneath the tree and took it upstairs for tea.\n\nThe day did not change direction. There were still messages to answer and a late bus to catch. But the courtyard had offered a small pause, and Mara carried that feeling with her. On the walk home, she started a list of ordinary things she wanted to notice: the first light in a room, someone making space on a crowded pavement, the smell of bread just before the bakery opened. She kept the list in her coat pocket, where it could gather more moments without needing to become anything grand.",
  },
  {
    title: 'A morning in the garden',
    body: 'A fictional story about noticing new leaves after a week of rain.',
    replacement: "After seven days of rain, Sima found the garden gate swollen in its frame. She pushed with her shoulder until it gave, then stepped around a shallow pool and listened. Water ticked from the gutter into a bucket. A blackbird turned wet leaves over near the wall. The beds looked flatter than she remembered, but the little row of seedlings had lifted their new leaves toward the grey light.\n\nHer grandfather had planted the seeds before his hands became too sore to dig. He had marked each row with a label written in his careful block letters, though the rain had blurred most of the ink. Sima crouched close and found the word 'beans' still legible. She tied a fresh piece of string around the stake and pressed the soil gently back around the stems.\n\nShe stayed until the clouds began to break. When her mother came out with two mugs of tea, Sima showed her the green shoots. They did not talk about what the garden would look like by summer. They sat on the low wall and watched the sunlight reach the wet path, one bright patch at a time. Before going inside, Sima left the gate unlatched so the next person could come through without having to push.",
  },
  {
    title: 'The long way home',
    body: 'A fictional story about taking an unfamiliar street and finding a tiny bookshop before sunset.',
    replacement: "Jonah missed his usual bus by seconds and decided to walk rather than wait for the next one. The unfamiliar street climbed behind the station, past a row of repair shops with their shutters half open. He followed the smell of rain on warm pavement and turned once because a narrow lane looked as if it might lead back toward the main road. Instead, it ended at a blue door with a small brass bell.\n\nInside was a bookshop no wider than a hallway. Its shelves leaned toward one another, and the owner had placed a lamp on the counter even though the sun had not yet set. Jonah asked for a book about the river that ran through the city. The owner found an old collection of local walks, its margins filled with pencil notes from someone who had used it often. On the page about the eastern bank, a sentence had been underlined: 'Go slowly where the stones are uneven.'\n\nJonah bought the book and continued on foot. The route took longer, but it brought him to the river just as the sky turned copper. He read the pencilled notes on a bench, then chose a path he had never taken before. At home he opened the book again and wrote the date inside the cover. He wanted to remember the evening as a route with no hurry in it.",
  },
  {
    title: 'A question of time',
    body: 'A fictional story about an old clock that seems to pause whenever someone tells the truth.',
    replacement: "The clock in Mr. Vale's studio stopped at 4:17 every afternoon. No one knew why. He had cleaned its brass face, replaced the spring, and asked three repairers to look at the mechanism. Each one heard the same small click, then watched the hands hesitate as the late light crossed the workbench.\n\nHis apprentice, Elian, thought the clock paused whenever someone lied. She tested it with small things: she said the tea was cold when it was not, and the second hand slipped forward. She said she had finished sanding the chair when the legs were still rough, and the hands froze again. The day she admitted she was afraid to show Mr. Vale her first carving, the clock continued without a sound.\n\nMr. Vale did not praise the carving. He turned it slowly in his hands and pointed to one place where the wood had split. Elian waited for him to say she had wasted the afternoon. Instead, he asked what she would change if she made another. She answered honestly: she would choose a softer piece of wood and stop trying to hide the knot.\n\nAt 4:17, the clock clicked once. Then it carried on. Elian put the carving on the shelf where the evening light could reach it. The split remained visible, but the shape around it was beginning to feel intentional.",
  },
];

export function localDevelopmentAvailable(): boolean {
  // Keep the no-account preview limited to an explicit local HTTP origin. Native
  // app origins and public HTTPS deployments do not expose this entry point.
  return window.location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
}
export function isLocalDevelopment(uid: string): boolean {
  return localDevelopmentAvailable() && uid === UID;
}
export function localDevelopmentSession(): AppSession {
  if (!localDevelopmentAvailable()) throw new Error('Local development access is unavailable.');
  return { uid: UID, expiresAt: Date.now() + 8 * 60 * 60_000, privateUntil: 0 };
}
function assertLocal() {
  if (!localDevelopmentAvailable()) throw new Error('Local development storage is unavailable.');
}
function entry(title: string, body: string, kind: Entry['kind'] = 'Journal', id: string = crypto.randomUUID(), curatedDeck?: string, daysAgo = 0, time = '09:00'): Entry {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return { id, title, body, kind, date: date.toISOString(), timeStr: date.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}),
    wordsCount: body.trim().split(/\s+/).filter(Boolean).length, groupDate: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : 'Earlier', tags: [], favorite: false, protected: false, perspective: 'first',
    ...(curatedDeck ? {curatedDeck} : {}) };
}
function sampleEntries(): Entry[] {
  return catalogue.manifest.entryIds.map(id => {
    const sample = catalogue.entries.find(candidate => candidate.id === id);
    if (!sample || sample.protected !== false || !Number.isFinite(Date.parse(sample.createdAt))) {
      throw new Error('The local starter catalogue is invalid.');
    }
    const date = new Date(sample.createdAt);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    const groupDate = date.toDateString() === today ? 'Today' : date.toDateString() === yesterday ? 'Yesterday' : 'Earlier';
    return {
      id: sample.id,
      title: sample.title,
      body: sample.body,
      kind: sample.kind,
      date: date.toISOString(),
      timeStr: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      wordsCount: sample.body.trim().split(/\s+/).filter(Boolean).length,
      groupDate,
      tags: normalizeOrdinaryTags(sample.tags),
      favorite: false,
      protected: false,
      perspective: sample.perspective,
      ...(sample.curatedDeck ? { curatedDeck: normalizeStoryCollection(sample.curatedDeck) } : {}),
    };
  });
}
function addMissingSamples(entries: Entry[]): Entry[] {
  if (localStorage.getItem(CATALOGUE_MIGRATION) === 'complete') return entries;
  const existing = new Set(entries.map(item => item.id));
  const next = [...entries, ...sampleEntries().filter(item => !existing.has(item.id))];
  localStorage.setItem(KEY, JSON.stringify(next));
  localStorage.setItem(CATALOGUE_MIGRATION, 'complete');
  return next;
}
function updateUneditedStorySamples(entries: Entry[]): Entry[] {
  if (localStorage.getItem(CATALOGUE_CONTENT_MIGRATION) === 'complete') return entries;
  const currentSamples = new Map(sampleEntries().map(sample => [sample.id, sample]));
  let updated = false;
  const next = entries.map(existing => {
    const previousBody = previousStoryBodies[existing.id];
    const latest = currentSamples.get(existing.id);
    if (previousBody && latest && existing.body === previousBody) {
      updated = true;
      return { ...existing, body: latest.body, wordsCount: latest.wordsCount };
    }
    const legacy = previousShortStories.find(sample => sample.title === existing.title && sample.body === existing.body);
    if (existing.kind !== 'Story' || !legacy) return existing;
    updated = true;
    return { ...existing, body: legacy.replacement, wordsCount: legacy.replacement.trim().split(/\s+/).filter(Boolean).length };
  });
  if (updated) localStorage.setItem(KEY, JSON.stringify(next));
  localStorage.setItem(CATALOGUE_CONTENT_MIGRATION, 'complete');
  return next;
}
function read(): Entry[] {
  assertLocal();
  const stored = localStorage.getItem(KEY);
  if (stored !== null) {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('The local development journal could not be read.');
    return updateUneditedStorySamples(addMissingSamples(parsed as Entry[]));
  }
  const starters = sampleEntries();
  localStorage.setItem(KEY, JSON.stringify(starters));
  localStorage.setItem(CATALOGUE_MIGRATION, 'complete');
  return starters;
}
function write(entries: Entry[]) {
  assertLocal();
  localStorage.setItem(KEY, JSON.stringify(entries));
  changed.dispatchEvent(new Event('change'));
}
function readLibraryItems(): LibraryItem[] {
  assertLocal();
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LIBRARY_ITEMS) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is LibraryItem => item && typeof item.id === 'string' &&
      (item.kind === 'note' || item.kind === 'task') && typeof item.title === 'string' && typeof item.body === 'string' && typeof item.completed === 'boolean' &&
      typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)) && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt))) : [];
  } catch { return []; }
}
function writeLibraryItems(items: LibraryItem[]) {
  assertLocal();
  localStorage.setItem(LIBRARY_ITEMS, JSON.stringify(items));
  changed.dispatchEvent(new Event('change'));
}
export const developmentJournal = {
  watch(receive: (entries: Entry[]) => void, fail: (error: Error) => void) {
    const send = () => { try { receive(read()); } catch (error) { fail(error instanceof Error ? error : new Error('Local journal unavailable.')); } };
    const storage = (event: StorageEvent) => { if (event.key === KEY) send(); };
    changed.addEventListener('change', send); window.addEventListener('storage', storage); send();
    return () => { changed.removeEventListener('change', send); window.removeEventListener('storage', storage); };
  },
  save(data: {entryId?: string; title: string; body: string; kind?: Entry['kind']; protected?: boolean; curatedDeck?: string; favorite?: boolean; tags?: string[]}) {
    if (data.protected) throw new Error('Use the encrypted private editor.');
    if (!data.body.trim() || data.body.length > 50_000) throw new Error('Write between 1 and 50,000 characters.');
    const kind = data.kind ?? 'Journal';
    const curatedDeck = normalizeStoryCollection(data.curatedDeck);
    if (curatedDeck && kind !== 'Story') throw new Error('Only ordinary Story entries can belong to a Story collection.');
    const tags = normalizeOrdinaryTags(data.tags ?? []);
    if (data.favorite !== undefined && typeof data.favorite !== 'boolean') throw new Error('Favorite must be enabled or disabled.');
    const id = data.entryId ?? crypto.randomUUID();
    const entries = read();
    if (entries.some(item => item.id === id)) throw new Error('This entry identifier is already in use.');
    write([{...entry(data.title.slice(0, 200), data.body, kind, id, curatedDeck), favorite:data.favorite === true,tags}, ...entries]);
  },
  update(id: string, data: {title: string; body: string; kind?: Entry['kind']; curatedDeck?: string; favorite?: boolean; tags?: string[]}) {
    if (!data.body.trim() || data.body.length > 50_000 || data.title.length > 200) throw new Error('Use a title up to 200 characters and write between 1 and 50,000 characters.');
    const entries = read(), prior = entries.find(item => item.id === id);
    if (!prior) throw new Error('This local entry is no longer available.');
    const kind = data.kind ?? prior.kind;
    const curatedDeck = data.curatedDeck === undefined ? (data.kind === 'Journal' ? undefined : prior.curatedDeck) : normalizeStoryCollection(data.curatedDeck);
    if (curatedDeck && kind !== 'Story') throw new Error('Only ordinary Story entries can belong to a Story collection.');
    if (data.favorite !== undefined && typeof data.favorite !== 'boolean') throw new Error('Favorite must be enabled or disabled.');
    const tags = data.tags === undefined ? undefined : normalizeOrdinaryTags(data.tags);
    write(entries.map(item => item.id === id ? {...entry(data.title, data.body, kind, id, curatedDeck), favorite:data.favorite ?? item.favorite, tags:tags ?? item.tags} : item));
  },
  remove(id: string) { write(read().filter(item => item.id !== id)); },
  contacts(): {id: string; name: string; phone: string}[] { assertLocal(); return JSON.parse(localStorage.getItem(CONTACTS) ?? '[]'); },
  saveContacts(contacts: {id: string; name: string; phone: string}[]) { assertLocal(); localStorage.setItem(CONTACTS, JSON.stringify(contacts)); },
};

export const developmentLibraryItems = {
  watch(receive: (items: LibraryItem[]) => void, fail: (error: Error) => void) {
    const send = () => { try { receive(readLibraryItems()); } catch (error) { fail(error instanceof Error ? error : new Error('Local notes and tasks are unavailable.')); } };
    const storage = (event: StorageEvent) => { if (event.key === LIBRARY_ITEMS) send(); };
    changed.addEventListener('change', send); window.addEventListener('storage', storage); send();
    return () => { changed.removeEventListener('change', send); window.removeEventListener('storage', storage); };
  },
  create(kind: LibraryItemKind, draft: LibraryItemDraft) {
    const now = new Date().toISOString();
    writeLibraryItems([{ id: crypto.randomUUID(), kind, ...draft, completed: false, createdAt: now, updatedAt: now }, ...readLibraryItems()]);
  },
  update(id: string, draft: LibraryItemDraft, completed?: boolean) {
    const now = new Date().toISOString();
    writeLibraryItems(readLibraryItems().map(item => item.id === id ? { ...item, ...draft, ...(completed === undefined ? {} : { completed }), updatedAt: now } : item));
  },
  remove(id: string) { writeLibraryItems(readLibraryItems().filter(item => item.id !== id)); },
};
