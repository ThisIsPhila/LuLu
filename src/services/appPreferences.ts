export type AppTheme = 'light' | 'dark';

export type AppPreferences = {
  theme: AppTheme;
  reduceMotion: boolean;
};

const STORAGE_KEY = 'lulu.app-preferences.v1';
const DEFAULT_PREFERENCES: AppPreferences = { theme: 'light', reduceMotion: false };
let sessionPreferences: AppPreferences = DEFAULT_PREFERENCES;

export function readAppPreferences(): AppPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return sessionPreferences;
    const stored = value as Record<string, unknown>;
    sessionPreferences = {
      theme: stored.theme === 'dark' ? 'dark' : 'light',
      reduceMotion: stored.reduceMotion === true,
    };
    return sessionPreferences;
  } catch {
    return sessionPreferences;
  }
}

export function writeAppPreferences(preferences: AppPreferences): void {
  sessionPreferences = { ...preferences };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPreferences));
  } catch {
    // Preferences remain usable for this app session if local storage is unavailable.
  }
}
