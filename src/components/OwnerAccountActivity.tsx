import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { request } from '../services/backend/request';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { compareUpdateVersions, parseUpdateManifest } from '../services/otaManifest';

type Account = {createdAt:string; email:string|null; signInMethods:string[]};
type Result = {owner:boolean; accounts?:Account[]; truncated?:boolean};

/** Account metadata is returned only by the server to the verified owner. */
export function OwnerAccountActivity({uid, enabled = true, onOpenSettings}: {uid:string; enabled?:boolean; onOpenSettings:()=>void}) {
  const [updateVersion,setUpdateVersion]=useState('');
  const [seenUpdate,setSeenUpdate]=useState(() => { try { return localStorage.getItem('lulu.update-notification.seen') || ''; } catch { return ''; } });
  const [accounts,setAccounts]=useState<Account[]|null>(null);
  const [open,setOpen]=useState(false);
  const [announcement,setAnnouncement]=useState('');
  const latest=useRef<number | null>(null);
  const [seen,setSeen]=useState(()=>{
    try { return Number(localStorage.getItem(`lulu.account-activity.seen.${uid}`)) || 0; } catch { return 0; }
  });
  const [truncated,setTruncated]=useState(false);
  useEffect(()=>{
    let active=true;
    if (!enabled) return () => { active=false; };
    const load=async()=>{
      try {
        const result=await request<Result>('/owner/account-activity');
        if(!active)return;
        if(result.owner) {
          const next=result.accounts ?? [];
          const newest=Math.max(0,...next.map(account=>Date.parse(account.createdAt) || 0));
          if(latest.current !== null && newest > latest.current) setAnnouncement('A new account was created. Open notifications to see details.');
          latest.current=newest;setAccounts(next);setTruncated(result.truncated===true);
        }
        else setAccounts(null);
      } catch { /* Do not interrupt a user's journal if activity is unavailable. */ }
    };
    void load();
    const timer=window.setInterval(()=>void load(),60_000);
    return()=>{active=false;window.clearInterval(timer);};
  },[uid, enabled]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active=true;
    const check=async () => {
      try {
        const [info,current,response]=await Promise.all([NativeApp.getInfo(),CapacitorUpdater.current(),CapacitorHttp.get({url:`https://lulu.thisisphila.co.za/updates/latest.json?check=${Date.now()}`,headers:{'Cache-Control':'no-cache'}})]);
        const update=response.status===200 ? parseUpdateManifest(response.data) : null;
        if (active) setUpdateVersion(update && update.nativeVersion===info.version && compareUpdateVersions(update.version,current.bundle.version)>0 ? update.version : '');
      } catch { /* A failed check must not interrupt the app. */ }
    };
    void check();
    const timer=window.setInterval(() => void check(), 15*60_000);
    const listener=NativeApp.addListener('appStateChange', state => {if(state.isActive) void check();});
    return () => {active=false;window.clearInterval(timer);void listener.then(handle => handle.remove());};
  }, []);
  const unseen=(accounts ?? []).filter(account=>Date.parse(account.createdAt)>seen).length + (updateVersion && updateVersion !== seenUpdate ? 1 : 0);
  function show(){
    setAnnouncement('');
    if (updateVersion) {setSeenUpdate(updateVersion);try {localStorage.setItem('lulu.update-notification.seen',updateVersion);} catch { /* Keep the read state for this session. */ }}
    setOpen(value=>!value);
    const now=Date.now();setSeen(now);
    try {localStorage.setItem(`lulu.account-activity.seen.${uid}`,String(now));} catch { /* Works until this tab closes. */ }
  }
  return <section className="owner-account-activity" aria-label="Notifications">
    <button type="button" className="topbar-circle-btn owner-notification-button" onClick={show} aria-expanded={open} aria-label={unseen ? `Notifications, ${unseen} unread` : 'Notifications'} title="Notifications"><Bell size={18} aria-hidden="true" />{unseen > 0 && <span className="owner-notification-badge" aria-hidden="true">{unseen > 99 ? '99+' : unseen}</span>}</button>
    {open && <section className="owner-notification-panel" aria-label="Notifications"><strong>Notifications</strong>{updateVersion && <button type="button" className="update-notification-item" onClick={() => {setOpen(false);onOpenSettings();}}><strong>LuLu update available</strong><span>Version {updateVersion} is ready. Open Settings to install it.</span></button>}{accounts && <p>New accounts</p>}
      {!accounts ? !updateVersion && <p>No notifications available yet.</p> : accounts.length===0 ? <p>No other accounts yet.</p> : <ul>{accounts.map((account,index)=><li key={`${account.createdAt}-${index}`}><span>{account.email || 'Passkey account'}</span> <time>{new Date(account.createdAt).toLocaleString()}</time></li>)}</ul>}
      {truncated && <p>More accounts may not be shown.</p>}
      {accounts && <small>Visible only to the verified owner. Updates while LuLu is open. Read status is saved on this device. Account alert emails go to the team inbox when a new account completes sign-in.</small>}
    </section>}
    {announcement && !open && <div className="owner-notification-toast" role="status"><span>{announcement}</span><button type="button" onClick={show}>View</button><button type="button" onClick={() => setAnnouncement('')} aria-label="Dismiss notification">×</button></div>}
  </section>;
}
