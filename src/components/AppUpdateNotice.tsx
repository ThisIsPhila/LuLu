import {useEffect, useState} from 'react';
import {CapacitorHttp} from '@capacitor/core';
import {App as NativeApp} from '@capacitor/app';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
import { RefreshCw } from 'lucide-react';
import {parseUpdateManifest, compareUpdateVersions, type LuLuUpdate} from '../services/otaManifest';

const manifestUrl='https://lulu.thisisphila.co.za/updates/latest.json';

/** Update status and actions live within Settings, never over the app content. */
export function AppUpdateSettings() {
  const [update,setUpdate]=useState<LuLuUpdate|null>(null);
  const [nativeVersion,setNativeVersion]=useState('');
  const [currentVersion,setCurrentVersion]=useState('');
  const [message,setMessage]=useState('Checking for updates…');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [progress,setProgress]=useState<number|null>(null);
  async function check() {
    setLoading(true);setMessage('Checking for updates…');setUpdate(null);
    try {
      const [info,current]=await Promise.all([NativeApp.getInfo(),CapacitorUpdater.current()]);
      setNativeVersion(`${info.version} (build ${info.build})`);setCurrentVersion(current.bundle.id === 'builtin' ? 'Bundled interface' : current.bundle.version);
      const response=await CapacitorHttp.get({url:`${manifestUrl}?check=${Date.now()}`,headers:{'Cache-Control':'no-cache'}});
      if(response.status!==200)throw new Error('The update server is unavailable.');
      if(response.data && typeof response.data==='object' && response.data.status==='none') {setMessage('LuLu is up to date.');return;}
      const next=parseUpdateManifest(response.data);
      if(!next)throw new Error('The update information could not be read.');
      if(next.nativeVersion!==info.version){setMessage(compareUpdateVersions(next.nativeVersion,info.version)<0 ? 'LuLu is up to date.' : 'A new native app build is needed for the latest update.');return;}
      if(compareUpdateVersions(next.version,current.bundle.version)>0){setUpdate(next);setMessage(`Version ${next.version} is available.`);}
      else setMessage('LuLu is up to date.');
    } catch (error) {setMessage(error instanceof Error ? `${error.message} Please try again.` : 'Could not check for updates. Please try again.');}
    finally {setLoading(false);}
  }
  useEffect(()=>{void check(); const listener=CapacitorUpdater.addListener('updaterEvent',event=>{if(event.type==='download') setProgress(Math.max(0,Math.min(100,Math.round(event.data.percent))));}); return ()=>{void listener.then(handle=>handle.remove());};},[]);
  async function apply() {
    if(!update || busy)return;
    setBusy(true);setProgress(0);setMessage('Downloading and verifying your update…');
    try {const bundle=await CapacitorUpdater.download(update);await CapacitorUpdater.set({id:bundle.id});}
    catch {setBusy(false);setProgress(null);setMessage('The update could not be installed. Your current app is still available.');}
  }
  return <section className="profile-settings-section" aria-labelledby="app-updates-heading"><h2 id="app-updates-heading">App updates</h2><div className="profile-settings-card">
    <div className="profile-settings-row static-row"><span className="profile-settings-copy"><strong>Current version</strong><small>{currentVersion ? `${currentVersion} · iPhone app ${nativeVersion}` : 'Loading version…'}</small></span></div>
    <div className="profile-settings-row static-row"><span className="profile-settings-copy"><strong>{update ? 'Update available' : 'Update status'}</strong><small role="status">{message}</small></span></div>
    {busy && <div className="profile-settings-row"><span className="profile-settings-copy"><strong>Downloading update {progress === null ? '' : `${progress}%`}</strong><progress max={100} value={progress ?? undefined} aria-label="Update download progress" /></span></div>}
    {update && <button className="profile-settings-link" type="button" disabled={busy || loading} onClick={()=>void apply()}><span className="profile-settings-copy"><strong>{busy?'Installing…':`Install update ${update.version}`}</strong><small>LuLu will reopen to finish the update.</small></span></button>}
    <button className="profile-settings-link" type="button" disabled={busy || loading} onClick={()=>void check()}><span className="profile-settings-copy"><strong className="update-check-label"><RefreshCw size={16} className={loading ? 'update-refresh-spinning' : undefined} aria-hidden="true" />{loading?'Checking…':'Check for updates'}</strong><small>Check the latest version available for this app.</small></span></button>
  </div></section>;
}
