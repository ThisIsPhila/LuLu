import { Capacitor } from '@capacitor/core';

export type LuLuPlatform = 'ios' | 'android' | 'web';

export function isNativePlatform(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export function getPlatform(): LuLuPlatform {
  try {
    const platform = Capacitor.getPlatform();
    return platform === 'ios' || platform === 'android' ? platform : 'web';
  } catch { return 'web'; }
}
