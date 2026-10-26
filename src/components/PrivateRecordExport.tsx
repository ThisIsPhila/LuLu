import { useLayoutEffect, useRef, useState } from 'react';
import type { LocalVault } from '../services/vault/localVault';
import type { LocalMediaVault } from '../services/vault/localMediaVault';
import { prepareTextExport, prepareMediaExport, type PreparedPrivateExport } from '../services/privateExport';

type Props = { kind: 'text'; vault: LocalVault; recordId: string } | { kind: 'media'; vault: LocalMediaVault; recordId: string };

/** A user-requested readable copy; never a backup, disclosure transport or autosave. */
export function PrivateRecordExport(props: Props) {
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('');
  const mounted=useRef(false);
  const operation=useRef(0);
  const prepared=useRef<(PreparedPrivateExport & {url:string}) | null>(null);
  const urls=useRef(new Set<string>());
  const timers=useRef(new Set<ReturnType<typeof setTimeout>>());

  function release(url:string) { URL.revokeObjectURL(url);urls.current.delete(url); }
  function cancel() {
    operation.current++;setConfirming(false);setReady(false);setBusy(false);setStatus('');
    if(prepared.current) release(prepared.current.url);
    prepared.current=null;
  }
  useLayoutEffect(()=>{
    mounted.current=true;
    return ()=>{
      mounted.current=false;operation.current++;prepared.current=null;
      for(const timer of timers.current)clearTimeout(timer);
      timers.current.clear();
      for(const url of urls.current)URL.revokeObjectURL(url);
      urls.current.clear();
    };
  },[props.vault,props.recordId]);

  async function prepare() {
    if(busy)return;
    const token=++operation.current;
    setConfirming(true);setReady(false);setBusy(true);setStatus('Preparing readable copy…');
    try {
      const result=props.kind==='text' ? await prepareTextExport(props.vault,props.recordId) : await prepareMediaExport(props.vault,props.recordId);
      if(!mounted.current || token!==operation.current)return;
      result.assertCurrent();
      const url=URL.createObjectURL(result.blob);
      urls.current.add(url);prepared.current={...result,url};setReady(true);setStatus('Readable copy ready.');
    } catch {
      if(mounted.current && token===operation.current)setStatus('Could not prepare this export. Stored originals are unchanged. Cancel and try again while private access is open.');
    } finally {if(mounted.current && token===operation.current)setBusy(false);}
  }

  function download() {
    const result=prepared.current;
    if(!result || !mounted.current)return;
    try {
      result.assertCurrent();
      const link=document.createElement('a');
      link.href=result.url;link.download=result.fileName;link.hidden=true;
      document.body.append(link);link.click();link.remove();
      prepared.current=null;setReady(false);setConfirming(false);setStatus('Download requested. Check your browser downloads.');
      // Give the browser time to consume the user-clicked URL; exit still revokes it immediately.
      const timer=setTimeout(()=>{release(result.url);timers.current.delete(timer);},1000);
      timers.current.add(timer);
    } catch {cancel();setStatus('Private access ended. Unlock again before exporting.');}
  }

  return <div className="private-record-export">
    {!confirming ? <button className="private-journal-action private-journal-action-quiet" type="button" onClick={()=>void prepare()}>{props.kind==='text'?'Export readable record':'Export original media'}</button> : <>
      <p className="private-journal-note">This downloads an unencrypted copy that anyone with the file can read. Quick exit cannot hide a downloaded copy. {props.kind==='text'?'Includes the saved original and every saved revision; unsaved edits are excluded.':'Includes the original file bytes; app metadata is excluded.'} This is not an encrypted recovery backup.</p>
      <button className="private-journal-action private-journal-action-quiet" type="button" disabled={!ready || busy} onClick={download}>Download readable copy</button>
      <button className="private-journal-action private-journal-action-quiet" type="button" onClick={cancel}>Cancel export</button>
    </>}
    {status && <p className="private-journal-note" role="status" aria-live="polite">{status}</p>}
  </div>;
}
