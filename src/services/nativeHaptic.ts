import {Capacitor} from '@capacitor/core';
import {NativeRefresh} from '../platform/nativeRefresh';
export async function nativeHaptic(){
 if(Capacitor.getPlatform()==='ios'&&Capacitor.isPluginAvailable('NativeRefresh')){try{await NativeRefresh.haptic();return;}catch{}}
 try{navigator.vibrate?.(24);}catch{}
}
