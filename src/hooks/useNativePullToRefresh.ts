import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface NativeRefreshPlugin {
  setEnabled(options: {enabled: boolean}): Promise<void>;
  end(): Promise<void>;
  addListener(event: 'refresh', listener: () => void): Promise<PluginListenerHandle>;
}
const NativeRefresh = registerPlugin<NativeRefreshPlugin>('NativeRefresh');

export function useNativePullToRefresh(enabled: boolean, onRefresh: () => Promise<void>) {
  const refresh = useRef(onRefresh);
  useEffect(() => { refresh.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;
    let active = true;
    let listener: PluginListenerHandle | undefined;
    async function setup() {
      try {
        listener = await NativeRefresh.addListener('refresh', async () => {
          if (!active) return;
          try { await Promise.all([refresh.current(), new Promise(resolve => setTimeout(resolve, 900))]); }
          finally { await NativeRefresh.end(); }
        });
        if (!active) { await listener.remove(); return; }
        await NativeRefresh.setEnabled({enabled});
      } catch { /* Earlier installed native builds use the web fallback. */ }
    }
    void setup();
    return () => {active = false; void listener?.remove(); void NativeRefresh.setEnabled({enabled:false}).catch(() => {});};
  }, [enabled]);
}
