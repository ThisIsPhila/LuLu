import {Capacitor, registerPlugin} from '@capacitor/core';
const NativeRefresh=registerPlugin<{haptic():Promise<void>}>('NativeRefresh');
export async function nativeHaptic(){
 if(Capacitor.getPlatform()==='ios'&&Capacitor.isPluginAvailable('NativeRefresh')){try{await NativeRefresh.haptic();return;}catch{}}
 try{navigator.vibrate?.(24);}catch{}
}
