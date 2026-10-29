import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { ThemePreference } from '../appPreferences';
import { isLocalDevelopment } from '../localDevelopment';
import { database } from './firebase';

const cachePrefix = 'lulu.account-appearance.v1:';

function validTheme(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readCachedAccountTheme(uid: string): ThemePreference | null {
  try {
    const saved = localStorage.getItem(`${cachePrefix}${uid}`);
    return validTheme(saved) ? saved : null;
  } catch {
    return null;
  }
}

function cacheAccountTheme(uid: string, theme: ThemePreference | null) {
  try {
    if (theme) localStorage.setItem(`${cachePrefix}${uid}`, theme);
    else localStorage.removeItem(`${cachePrefix}${uid}`);
  } catch {
    // The remote account value remains available even if this device cache is not.
  }
}

export type AccountThemeRead = {
  theme: ThemePreference | null;
  source: 'account' | 'cache' | 'none' | 'unavailable';
};

export async function readAccountTheme(uid: string): Promise<AccountThemeRead> {
  if (isLocalDevelopment(uid)) return { theme: null, source: 'none' };
  const cachedTheme = readCachedAccountTheme(uid);
  try {
    const snapshot = await getDoc(doc(database, 'users', uid, 'preferences', 'appearance'));
    if (!snapshot.exists()) {
      cacheAccountTheme(uid, null);
      return { theme: null, source: 'none' };
    }
    const theme = snapshot.data().theme;
    if (!validTheme(theme)) return { theme: cachedTheme, source: cachedTheme ? 'cache' : 'unavailable' };
    cacheAccountTheme(uid, theme);
    return { theme, source: 'account' };
  } catch {
    return { theme: cachedTheme, source: cachedTheme ? 'cache' : 'unavailable' };
  }
}

export async function writeAccountTheme(uid: string, theme: ThemePreference): Promise<'saved' | 'local-only'> {
  if (!validTheme(theme)) throw new TypeError('Choose system, light, or dark appearance.');
  if (isLocalDevelopment(uid)) return 'local-only';
  await setDoc(doc(database, 'users', uid, 'preferences', 'appearance'), {
    theme,
    updatedAt: serverTimestamp(),
  });
  cacheAccountTheme(uid, theme);
  return 'saved';
}
