export type AppPreferences = {
  reduceMotion: boolean;
};

const STORAGE_KEY = 'lulu.app-preferences.v1';
const DEFAULT_PREFERENCES: AppPreferences = { reduceMotion: false };

export function readAppPreferences(): AppPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return DEFAULT_PREFERENCES;
    const stored = value as Record<string, unknown>;
    return {
      reduceMotion: stored.reduceMotion === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writeAppPreferences(preferences: AppPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences remain usable for this app session if local storage is unavailable.
  }
}
