import type { DetectedEntity } from './contracts.ts';

export type LuTextAction =
  | { kind: 'navigate'; destination: 'home' | 'journal' | 'stories' | 'library' | 'reader' | 'write' | 'settings' }
  | { kind: 'quick'; action: 'dictate' | 'record' | 'camera' | 'upload' | 'private-content' };

/** Accepts only a bounded action command plus optional generic placeholders. */
export function validateScrubbedLuCommand(input: string): string | null {
  const command = input.trim().replace(/\s+/gu, ' ');
  if (!command || command.length > 240) return null;
  const pageCommand = /^(?:(?:please )?(?:open|go to|show|take me to) (?:home|journal|stories|library|reader|write|settings))$/iu;
  const quickCommand = /^(?:(?:please )?(?:start|open) (?:dictation|voice note|recording|camera|upload|private content))$/iu;
  const placeholder = /(?: for (?:Person|Place|Organization|Date|Email|Phone|Relationship|Detail) [A-Z]{1,2})?$/iu;
  if (!placeholder.test(command) || !(pageCommand.test(command.replace(placeholder, '')) || quickCommand.test(command.replace(placeholder, '')))) return null;
  return command;
}

function genericLabel(label: string): string {
  const normalized = label.toLocaleLowerCase('und').replace(/\s+/gu, ' ').trim();
  if (normalized === 'person') return 'Person';
  if (normalized === 'place' || normalized === 'location') return 'Place';
  if (normalized === 'organization') return 'Organization';
  if (normalized === 'time' || normalized === 'date') return 'Date';
  if (normalized === 'email') return 'Email';
  if (normalized === 'phone number') return 'Phone';
  if (normalized === 'relationship') return 'Relationship';
  return 'Detail';
}

function alphabetic(index: number): string {
  let value = index + 1;
  let suffix = '';
  while (value > 0) {
    value--;
    suffix = String.fromCharCode(65 + value % 26) + suffix;
    value = Math.floor(value / 26);
  }
  return suffix;
}

/** Replaces detected spans with generic, repeatable labels. Never includes the source value. */
export function scrubForLu(input: string, entities: readonly DetectedEntity[]): string {
  const ordered = [...entities].sort((a, b) => a.start - b.start || b.end - a.end);
  const identities = new Map<string, string>();
  const counts = new Map<string, number>();
  let cursor = 0;
  let output = '';
  for (const entity of ordered) {
    if (!Number.isSafeInteger(entity.start) || !Number.isSafeInteger(entity.end) || entity.start < cursor || entity.end <= entity.start || entity.end > input.length || !entity.label.trim()) {
      throw new Error('Local text scan returned an invalid span.');
    }
    output += input.slice(cursor, entity.start);
    const kind = genericLabel(entity.label);
    const source = input.slice(entity.start, entity.end).normalize('NFKC').trim().toLocaleLowerCase('und');
    const key = `${kind}:${source}`;
    let replacement = identities.get(key);
    if (!replacement) {
      const index = counts.get(kind) ?? 0;
      counts.set(kind, index + 1);
      replacement = `${kind} ${alphabetic(index)}`;
      identities.set(key, replacement);
    }
    output += replacement;
    cursor = entity.end;
  }
  return output + input.slice(cursor);
}

/** Small, deterministic local command matcher. It only receives already-scrubbed text. */
export function matchLuTextAction(scrubbedText: string): LuTextAction | null {
  const text = scrubbedText.toLocaleLowerCase('und');
  const has = (...patterns: RegExp[]) => patterns.some(pattern => pattern.test(text));
  if (has(/\b(dictate|dictation|speech to text|transcribe)\b/u)) return { kind: 'quick', action: 'dictate' };
  if (has(/\b(record|recording|voice note|audio)\b/u)) return { kind: 'quick', action: 'record' };
  if (has(/\b(camera|take a photo|take a picture)\b/u)) return { kind: 'quick', action: 'camera' };
  if (has(/\b(upload|choose a file|attach a file)\b/u)) return { kind: 'quick', action: 'upload' };
  if (has(/\b(private content|private writing|protected writing|private space)\b/u)) return { kind: 'quick', action: 'private-content' };
  if (has(/\b(settings|preferences|account settings)\b/u)) return { kind: 'navigate', destination: 'settings' };
  if (has(/\b(stories|story collection)\b/u)) return { kind: 'navigate', destination: 'stories' };
  if (has(/\b(library|notes|tasks)\b/u)) return { kind: 'navigate', destination: 'library' };
  if (has(/\b(journal|entries)\b/u)) return { kind: 'navigate', destination: 'journal' };
  if (has(/\b(reader|read the latest|open latest)\b/u)) return { kind: 'navigate', destination: 'reader' };
  if (has(/\b(write|new entry|start writing|compose)\b/u)) return { kind: 'navigate', destination: 'write' };
  if (has(/\b(home|dashboard)\b/u)) return { kind: 'navigate', destination: 'home' };
  return null;
}

export function labelLuAction(action: LuTextAction): string {
  if (action.kind === 'navigate') {
    const names: Record<typeof action.destination, string> = {
      home: 'Home', journal: 'Journal', stories: 'Stories', library: 'Library', reader: 'Reader', write: 'Write', settings: 'Settings',
    };
    return `Open ${names[action.destination]}`;
  }
  const names: Record<typeof action.action, string> = {
    dictate: 'Start dictation', record: 'Record a voice note', camera: 'Open camera', upload: 'Choose a file', 'private-content': 'Open private content',
  };
  return names[action.action];
}
