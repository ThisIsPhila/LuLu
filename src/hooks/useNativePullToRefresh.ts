import { useEffect, useRef, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { NativeRefresh } from '../platform/nativeRefresh';

export function useNativePullToRefresh(enabled: boolean, onRefresh: () => Promise<void>) {
  const [progress,setProgress] = useState({distance:0,refreshing:false});
  const refresh = useRef(onRefresh);
  useEffect(() => { refresh.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;
    let active = true;
    let listener: PluginListenerHandle | undefined;
    let progressListener: PluginListenerHandle | undefined;
    async function setup() {
      try {
        progressListener = await NativeRefresh.addListener('progress', value => {if(active) setProgress(value);});
        listener = await NativeRefresh.addListener('refresh', async () => {
          if (!active) return;
          try { await Promise.all([refresh.current(), new Promise(resolve => setTimeout(resolve, 900))]); }
          finally { await NativeRefresh.end(); }
        });
        if (!active) { await listener.remove(); await progressListener?.remove(); return; }
        await NativeRefresh.setEnabled({enabled});
      } catch { /* Earlier installed native builds use the web fallback. */ }
    }
    void setup();
    return () => {active = false; void listener?.remove(); void progressListener?.remove(); void NativeRefresh.setEnabled({enabled:false}).catch(() => {});};
  }, [enabled]);
  return progress;
}
