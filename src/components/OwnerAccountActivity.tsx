import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { request } from '../services/backend/request';

type Account = {createdAt:string; email:string|null; signInMethods:string[]};
type Result = {owner:boolean; accounts?:Account[]; truncated?:boolean};

/** Account metadata is returned only by the server to the verified owner. */
export function OwnerAccountActivity({uid}: {uid:string}) {
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
  },[uid]);
  if(!accounts)return null;
  const unseen=accounts.filter(account=>Date.parse(account.createdAt)>seen).length;
  function show(){
    setAnnouncement('');
    setOpen(value=>!value);
    const now=Date.now();setSeen(now);
    try {localStorage.setItem(`lulu.account-activity.seen.${uid}`,String(now));} catch { /* Works until this tab closes. */ }
  }
  return <section className="owner-account-activity" aria-label="Notifications">
    <button type="button" className="topbar-circle-btn owner-notification-button" onClick={show} aria-expanded={open} aria-label={unseen ? `Notifications, ${unseen} unread` : 'Notifications'} title="Notifications"><Bell size={18} aria-hidden="true" />{unseen > 0 && <span className="owner-notification-badge" aria-hidden="true">{unseen > 99 ? '99+' : unseen}</span>}</button>
    {open && <section className="owner-notification-panel" aria-label="Notifications"><strong>Notifications</strong><p>New accounts</p>
      {accounts.length===0 ? <p>No other accounts yet.</p> : <ul>{accounts.map((account,index)=><li key={`${account.createdAt}-${index}`}><span>{account.email || 'Passkey account'}</span> <time>{new Date(account.createdAt).toLocaleString()}</time></li>)}</ul>}
      {truncated && <p>More accounts may not be shown.</p>}
      <small>Visible only to the verified owner. Updates while LuLu is open. Read status is saved on this device. Account alert emails go to the team inbox when a new account completes sign-in.</small>
    </section>}
    {announcement && !open && <div className="owner-notification-toast" role="status"><span>{announcement}</span><button type="button" onClick={show}>View</button><button type="button" onClick={() => setAnnouncement('')} aria-label="Dismiss notification">×</button></div>}
  </section>;
}
