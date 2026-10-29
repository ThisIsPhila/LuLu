export type AppTheme = 'light' | 'dark';
export type ThemePreference = AppTheme | 'system';

export type AppPreferences = {
  /** The device's saved choice. `system` means follow the OS. */
  theme: ThemePreference;
  /** False means this device has never made a theme choice. */
  themeSet: boolean;
  reduceMotion: boolean;
};

const STORAGE_KEY = 'lulu.app-preferences.v1';
const DEFAULT_PREFERENCES: AppPreferences = { theme: 'system', themeSet: false, reduceMotion: false };
let sessionPreferences: AppPreferences = DEFAULT_PREFERENCES;

export function getSystemTheme(): AppTheme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveAppTheme(
  preferences: AppPreferences,
  accountTheme: ThemePreference | null = null,
  systemTheme: AppTheme = getSystemTheme(),
): AppTheme {
  if (preferences.themeSet) return preferences.theme === 'system' ? systemTheme : preferences.theme;
  if (accountTheme) return accountTheme === 'system' ? systemTheme : accountTheme;
  return systemTheme;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readAppPreferences(): AppPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return sessionPreferences;
    const stored = value as Record<string, unknown>;
    const hasNewPreference = typeof stored.themeSet === 'boolean' && isThemePreference(stored.theme);
    // Older builds persisted `light` automatically as their default. Treat that
    // legacy value as unset so a fresh upgrade follows the operating system.
    const legacyTheme: ThemePreference = stored.theme === 'dark' ? 'dark' : 'system';
    sessionPreferences = {
      theme: hasNewPreference ? stored.theme as ThemePreference : legacyTheme,
      themeSet: hasNewPreference ? stored.themeSet as boolean : legacyTheme === 'dark',
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
