import { useLayoutEffect, useRef, useState } from 'react';
import type { LocalVault } from '../services/vault/localVault';
import type { LocalMediaVault } from '../services/vault/localMediaVault';
import { prepareTextBackup, prepareMediaBackup, prepareBackupRestore } from '../services/privateBackup';

type RecordProps={kind:'text';vault:LocalVault;recordId:string}|{kind:'media';vault:LocalMediaVault;recordId:string};
type PreparedBackup=Awaited<ReturnType<typeof prepareTextBackup>>;
type RestorePlan=Awaited<ReturnType<typeof prepareBackupRestore>>;
const longEnough=(value:string)=>[...value].length>=12 && [...value].length<=1024;

export function PrivateRecordBackup(props:RecordProps){
  const[open,setOpen]=useState(false),[passphrase,setPassphrase]=useState(''),[repeat,setRepeat]=useState('');
  const[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[status,setStatus]=useState('');
  const active=useRef(false),operation=useRef(0);
  const prepared=useRef<(PreparedBackup & {url:string})|null>(null);
  const urls=useRef(new Set<string>()),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
  function revoke(url:string){URL.revokeObjectURL(url);urls.current.delete(url);}
  function cancel(){operation.current++;if(prepared.current)revoke(prepared.current.url);prepared.current=null;setOpen(false);setReady(false);setBusy(false);setPassphrase('');setRepeat('');setStatus('');}
  useLayoutEffect(()=>{active.current=true;return()=>{active.current=false;operation.current++;prepared.current=null;for(const timer of timers.current)clearTimeout(timer);for(const url of urls.current)URL.revokeObjectURL(url);timers.current.clear();urls.current.clear();};},[props.vault,props.recordId]);
  async function prepare(){
    if(busy || !longEnough(passphrase) || passphrase!==repeat)return;
    const token=++operation.current;setBusy(true);setStatus('Encrypting this saved record…');
    try{
      const result=props.kind==='text'?await prepareTextBackup(props.vault,props.recordId,passphrase):await prepareMediaBackup(props.vault,props.recordId,passphrase);
      if(!active.current || token!==operation.current)return;
      result.assertCurrent();const url=URL.createObjectURL(result.blob);urls.current.add(url);prepared.current={...result,url};setPassphrase('');setRepeat('');setReady(true);setStatus('Encrypted backup ready. Keep the file and its passphrase safe.');
    }catch{if(active.current && token===operation.current)setStatus('Could not prepare this backup. Keep private access open and try again. Stored records are unchanged.');}
    finally{if(active.current && token===operation.current)setBusy(false);}
  }
  function download(){
    const result=prepared.current;if(!result)return;
    try{
      result.assertCurrent();const link=document.createElement('a');link.href=result.url;link.download=result.fileName;link.hidden=true;document.body.append(link);link.click();link.remove();prepared.current=null;setReady(false);setOpen(false);setStatus('Encrypted backup download requested. Keep its passphrase separately.');
      const timer=setTimeout(()=>{revoke(result.url);timers.current.delete(timer);},1000);timers.current.add(timer);
    }catch{cancel();setStatus('Private access ended. Unlock again before backing up.');}
  }
  return <section className="private-record-export" aria-label="Encrypted record backup">
    {!open?<button className="private-journal-action private-journal-action-quiet" type="button" onClick={()=>{setOpen(true);setStatus('');}}>Back up this record</button>:<>
      <p className="private-journal-note">Backs up this saved record{props.kind==='text'?' and all saved versions':''}. Recovery drafts and unsaved edits are excluded. You need this passphrase and the same LuLu account to restore it. LuLu cannot recover a forgotten backup passphrase.</p>
      {!ready?<fieldset className="private-draft-inputs" disabled={busy}>
        <label className="private-draft-title-label">Backup passphrase<input className="private-draft-title" type="password" aria-label="Backup passphrase" autoComplete="off" spellCheck={false} maxLength={1024} value={passphrase} onChange={event=>setPassphrase(event.target.value)}/></label>
        <label className="private-draft-title-label">Repeat passphrase<input className="private-draft-title" type="password" aria-label="Repeat backup passphrase" autoComplete="off" spellCheck={false} maxLength={1024} value={repeat} onChange={event=>setRepeat(event.target.value)}/></label>
        <p className="private-journal-note">Use at least 12 characters, preferably several unrelated words.</p>
        <button className="private-journal-action private-journal-action-quiet" type="button" disabled={busy || !longEnough(passphrase) || passphrase!==repeat} onClick={()=>void prepare()}>Prepare encrypted backup</button>
      </fieldset>:<button className="private-journal-action private-journal-action-quiet" type="button" onClick={download}>Download encrypted backup</button>}
      <button className="private-journal-action private-journal-action-quiet" type="button" onClick={cancel}>Cancel backup</button>
    </>}
    {status && <p className="private-journal-note" role="status" aria-live="polite">{status}</p>}
  </section>;
}

export function PrivateBackupRestore({vault,mediaVault,onRestored}:{vault:LocalVault;mediaVault:LocalMediaVault;onRestored:()=>void}){
  const[open,setOpen]=useState(false),[file,setFile]=useState<File|null>(null),[passphrase,setPassphrase]=useState('');
  const[plan,setPlan]=useState<RestorePlan|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const input=useRef<HTMLInputElement>(null),active=useRef(false),operation=useRef(0),current=useRef<RestorePlan|null>(null);
  function cancel(){operation.current++;current.current=null;setPlan(null);setFile(null);setPassphrase('');setOpen(false);setBusy(false);setStatus('');}
  useLayoutEffect(()=>{active.current=true;return()=>{active.current=false;operation.current++;current.current=null;};},[vault,mediaVault]);
  async function prepare(){
    if(!file || !longEnough(passphrase) || busy)return;
    const token=++operation.current;setBusy(true);setStatus('Checking and decrypting the backup…');
    try{
      const result=await prepareBackupRestore(vault,mediaVault,file,passphrase);
      if(!active.current || token!==operation.current)return;
      vault.assertUnlocked();mediaVault.assertUnlocked();current.current=result;setPlan(result);setPassphrase('');setFile(null);setStatus('Backup checked. Review the scope before restoring.');
    }catch{if(active.current && token===operation.current)setStatus('Could not open this backup. Check its file, passphrase and account. No conflicting record was overwritten.');}
    finally{if(active.current && token===operation.current)setBusy(false);}
  }
  async function restore(){
    const result=current.current;if(!result || busy)return;
    const token=++operation.current;setBusy(true);setStatus('Restoring this saved record…');
    try{
      vault.assertUnlocked();mediaVault.assertUnlocked();await result.confirm();
      if(active.current && token===operation.current){current.current=null;setPlan(null);setOpen(false);setStatus(result.existing?'This exact saved record is already present.':'Saved record restored in this browser.');onRestored();}
    }catch{if(active.current && token===operation.current){current.current=null;setPlan(null);setStatus('Could not confirm restore. Refresh the private list before trying again; conflicting records are not overwritten.');}}
    finally{if(active.current && token===operation.current)setBusy(false);}
  }
  return <section className="private-record-export" aria-label="Restore encrypted backup">
    {!open?<button className="private-journal-action private-journal-action-quiet" type="button" onClick={()=>{setOpen(true);setStatus('');}}>Restore encrypted backup</button>:<>
      <p className="private-journal-note">Restore one saved record from its encrypted backup into the same LuLu account. Existing conflicting records are not overwritten. This does not recover an account or passkey.</p>
      {!plan?<fieldset className="private-draft-inputs" disabled={busy}>
        <button className="private-journal-action private-journal-action-quiet" type="button" onClick={()=>input.current?.click()}>Choose encrypted backup</button>
        <input ref={input} type="file" accept=".lulubackup,application/octet-stream" hidden onChange={event=>{setFile(event.currentTarget.files?.[0]??null);event.currentTarget.value='';setStatus('');}}/>
        {file && <p className="private-journal-note">Selected: {file.name}</p>}
        <label className="private-draft-title-label">Recovery passphrase<input className="private-draft-title" type="password" aria-label="Recovery passphrase" autoComplete="off" spellCheck={false} maxLength={1024} value={passphrase} onChange={event=>setPassphrase(event.target.value)}/></label>
        <button className="private-journal-action private-journal-action-quiet" type="button" disabled={!file || !longEnough(passphrase) || busy} onClick={()=>void prepare()}>Prepare restore</button>
      </fieldset>:<>
        <p className="private-journal-note">{plan.existing?'This exact record is already present; no overwrite is needed.':plan.kind==='text'?`Restore the original and ${Math.max(0,plan.revisionCount-1)} saved ${plan.revisionCount===2?'revision':'revisions'}.`:'Restore one original media record.'}</p>
        <button className="private-journal-action private-journal-action-quiet" type="button" disabled={busy} onClick={()=>void restore()}>Confirm restore</button>
      </>}
      <button className="private-journal-action private-journal-action-quiet" type="button" disabled={busy} onClick={cancel}>Cancel restore</button>
    </>}
    {status && <p className="private-journal-note" role="status" aria-live="polite">{status}</p>}
  </section>;
}
