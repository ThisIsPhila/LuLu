import {useEffect, useState} from 'react';
import {Capacitor, CapacitorHttp} from '@capacitor/core';
import {App as NativeApp} from '@capacitor/app';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
import './AppUpdateNotice.css';

import {parseUpdateManifest, compareUpdateVersions, type LuLuUpdate} from '../services/otaManifest';
const manifestUrl='https://lulu.thisisphila.co.za/updates/latest.json';

export function AppUpdateNotice() {
  const [update,setUpdate]=useState<LuLuUpdate|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if (!Capacitor.isNativePlatform()) return;
    let active=true;
    async function check(manual=false) {
      try {
        const [info,current,response]=await Promise.all([NativeApp.getInfo(),CapacitorUpdater.current(),CapacitorHttp.get({url:`${manifestUrl}?check=${Date.now()}`,headers:{'Cache-Control':'no-cache'}})]);
        if (!active) return;
        const next=parseUpdateManifest(response.data);
        if (!next || response.status!==200) {if(manual)setMessage('No app update is available.');return;}
        if(next.nativeVersion!==info.version){if(manual)setMessage('This update requires a new native app build.');return;}
        if(compareUpdateVersions(next.version,current.bundle.version)>0){setUpdate(next);setMessage('A LuLu update is ready to download.');}
        else if(manual)setMessage('LuLu is up to date.');
      } catch {if(active && manual)setMessage('Could not check for updates. Check your connection and try again.');}
    }
    const manual=()=>void check(true);window.addEventListener('lulu:check-update',manual);
    const listener=NativeApp.addListener('appStateChange',state=>{if(state.isActive)void check();});
    void check();
    return()=>{active=false;window.removeEventListener('lulu:check-update',manual);void listener.then(handle=>handle.remove());};
  },[]);
  if(!Capacitor.isNativePlatform() || (!message && !update))return null;
  async function apply() {
    if(!update || busy)return;
    setBusy(true);setMessage('Downloading and verifying your update…');
    try {const bundle=await CapacitorUpdater.download(update);await CapacitorUpdater.set({id:bundle.id});}
    catch {setBusy(false);setMessage('The update could not be installed. Your current app is still available.');}
  }
  return <aside className="app-update-notice" role="status"><span>{message}</span>{update && <button type="button" disabled={busy} onClick={()=>void apply()}>{busy?'Updating…':'Update'}</button>}<button type="button" disabled={busy} aria-label="Dismiss update notice" onClick={()=>{setMessage('');setUpdate(null);}}>×</button></aside>;
}
