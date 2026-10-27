import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

type Result = { text: string; final: boolean };
type Failure = { message: string };
type DictationPlugin = {
  start(): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  addListener(event: 'result', callback: (result: Result) => void): Promise<PluginListenerHandle>;
  addListener(event: 'failure', callback: (failure: Failure) => void): Promise<PluginListenerHandle>;
};
const plugin = registerPlugin<DictationPlugin>('LuDictation');

/** Only the native on-device recognizer is used for private speech. */
export function createPrivateDictation(onResult: (text: string) => void, onFailure: (message: string) => void) {
  let closed = false;
  let listeners: PluginListenerHandle[] = [];
  return {
    async start() {
      if (!['ios', 'android'].includes(Capacitor.getPlatform())) throw new Error('On-device dictation is not available on this device yet. Use your keyboard microphone to dictate.');
      await Promise.all(listeners.map(listener => listener.remove())); listeners = [];
      const result = await plugin.addListener('result', value => { if (!closed) onResult(value.text); });
      if (closed) { await result.remove(); return; }
      listeners.push(result);
      const failure = await plugin.addListener('failure', value => { if (!closed) onFailure(value.message); });
      if (closed) { await failure.remove(); return; }
      listeners.push(failure);
      await plugin.start();
      if (closed) await plugin.cancel();
    },
    async stop() { if (!closed) await plugin.stop(); },
    async cancel() { closed = true; if (['ios', 'android'].includes(Capacitor.getPlatform())) await plugin.cancel(); await Promise.all(listeners.map(listener => listener.remove())); listeners = []; },
  };
}
