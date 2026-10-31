import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface NativeRefreshPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  end(): Promise<void>;
  haptic(): Promise<void>;
  addListener(event: 'refresh', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'progress', listener: (value: { distance: number; refreshing: boolean }) => void): Promise<PluginListenerHandle>;
}

/** Single shared registration; registering twice logs a Capacitor warning. */
export const NativeRefresh = registerPlugin<NativeRefreshPlugin>('NativeRefresh');
