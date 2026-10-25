import { useEffect, useState } from 'react';
import type { LocalVault, LocalVaultRevision } from '../services/vault/localVault';
import { readPrivateText, revisePrivateText } from '../services/privateCapture';
import { PrivateParagraphEditor } from './PrivateParagraphEditor';

type Props = { vault: LocalVault; onExit: () => void; onCompose: () => void };

/** Mounted only within a live private session; no ordinary preview receives these values. */
export function LocalPrivateJournal({vault, onExit, onCompose}: Props) {
  const [records, setRecords] = useState<LocalVaultRevision[]>([]);
  const [selected, setSelected] = useState<LocalVaultRevision | null>(null);
  const [history, setHistory] = useState<LocalVaultRevision[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setBusy(true);
    vault.listRecords().then(rows => { if (active) setRecords(rows); })
      .catch(() => { if (active) setError('Could not read this browser’s private journal. Your stored records were left unchanged.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [vault, refresh]);

  useEffect(() => {
    let active = true;
    setHistory([]);setShowHistory(false);
    if (selected) vault.listRevisions(selected.recordId).then(rows => {if(active) setHistory(rows);})
      .catch(() => {if(active) setError('Could not read the record history.');});
    return () => {active = false;};
  }, [vault, selected]);

  function open(record: LocalVaultRevision) {
    try {
      const text = readPrivateText(record);
      setTitle(text.title); setBody(text.body); setSelected(record); setError('');
    } catch { setError('This record format cannot be opened here.'); }
  }

  async function saveRevision() {
    if (!selected) return;
    setBusy(true);setError('');
    try {
      const next = await revisePrivateText(vault, selected, title, body);
      setSelected(next);setRefresh(value => value + 1);
    } catch { setError('Could not append this revision. Reopen the latest record and try again; your draft is still here.'); }
    finally {setBusy(false);}
  }

  return <section className="stitch-main-stream" aria-label="Local private journal">
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
      <button onClick={onExit}>Quick exit</button>
      <button onClick={onCompose}>Write privately</button>
      {selected && <button onClick={() => {setSelected(null);setTitle('');setBody('');}}>Back to records</button>}
    </div>
    <h1>Private writing</h1>
    <p>New private writing is encrypted in this browser. It is not synced or backed up. Clearing browser data can lose access. Opening a private session currently requires a connection.</p>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Working with local storage…</p>}
    {!selected && <>
      {!busy && records.length === 0 && <p>No local private records yet.</p>}
      <ul>{records.map(record => {
        let label = 'Private record';
        try {label = readPrivateText(record).title || label;} catch {}
        return <li key={record.recordId}><button onClick={() => open(record)}>{label}</button></li>;
      })}</ul>
    </>}
    {selected && <div style={{display:'grid',gap:12}}>
      <label>Title<input value={title} maxLength={200} onChange={event=>setTitle(event.target.value)} /></label>
      <PrivateParagraphEditor key={selected.recordId} value={body} onChange={value=>{setBody(value);setShowHistory(false);}} sessionUnlocked />
      <button disabled={busy || !body.trim()} onClick={()=>void saveRevision()}>Save as a new revision</button>
      <button type="button" aria-expanded={showHistory} onClick={()=>setShowHistory(value=>!value)}>{showHistory?'Conceal history':'Reveal original and revision history'} ({history.length})</button>
      {showHistory && <section aria-label="Original and revision history">
        <p>Times come from this device. History preserves saved versions; it does not prove when an event occurred.</p>
        {history.map(record=><article key={record.revisionId}>
          <strong>{record.kind === 'original' ? 'Original capture' : 'Appended revision'}</strong>
          <p>{record.clientCreatedAt}</p>
          <pre style={{whiteSpace:'pre-wrap'}}>{safeHistoryText(record)}</pre>
        </article>)}
      </section>}
    </div>}
  </section>;
}

function safeHistoryText(record:LocalVaultRevision) {
  try {return readPrivateText(record).body;} catch {return 'This revision format cannot be displayed here.';}
}
