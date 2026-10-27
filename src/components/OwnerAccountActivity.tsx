import { useEffect, useState } from 'react';
import { request } from '../services/backend/request';

type Account = {createdAt:string; email:string|null; signInMethods:string[]};
type Result = {owner:boolean; accounts?:Account[]; truncated?:boolean};

/** Account metadata is returned only by the server to the verified owner. */
export function OwnerAccountActivity({uid}: {uid:string}) {
  const [accounts,setAccounts]=useState<Account[]|null>(null);
  const [open,setOpen]=useState(false);
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
        if(result.owner) {setAccounts(result.accounts ?? []);setTruncated(result.truncated===true);}
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
    setOpen(value=>!value);
    const now=Date.now();setSeen(now);
    try {localStorage.setItem(`lulu.account-activity.seen.${uid}`,String(now));} catch { /* Works until this tab closes. */ }
  }
  return <aside className="owner-account-activity" aria-label="Account activity">
    <button type="button" onClick={show} aria-expanded={open}>New accounts{unseen ? ` (${unseen})` : ''}</button>
    {open && <section aria-label="Recently created accounts"><strong>Recently created accounts</strong>
      {accounts.length===0 ? <p>No other accounts yet.</p> : <ul>{accounts.map((account,index)=><li key={`${account.createdAt}-${index}`}><span>{account.email || 'Passkey account'}</span> <time>{new Date(account.createdAt).toLocaleString()}</time></li>)}</ul>}
      {truncated && <p>More accounts may not be shown.</p>}
      <small>Visible only to the verified owner. Updates while LuLu is open; email alerts are not configured.</small>
    </section>}
    <span className="owner-account-activity-live" role="status">{unseen ? `${unseen} new account${unseen===1?'':'s'}` : ''}</span>
  </aside>;
}
