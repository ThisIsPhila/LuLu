import React, { useMemo, useState } from 'react';
import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import type { LibraryItem, LibraryItemDraft, LibraryItemKind } from '../domain/libraryItems';

type Props = {
  kind: LibraryItemKind;
  startWithCreate?: boolean;
  items: LibraryItem[];
  query: string;
  loading: boolean;
  loadError?: string;
  onRetry: () => void;
  onCreate: (kind: LibraryItemKind, draft: LibraryItemDraft) => Promise<void>;
  onUpdate: (id: string, draft: LibraryItemDraft, completed?: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function LibraryItemsPanel({ kind, startWithCreate = false, items, query, loading, loadError, onRetry, onCreate, onUpdate, onDelete }: Props) {
  const [formOpen, setFormOpen] = useState(startWithCreate);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isTask = kind === 'task';
  const visibleItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return items.filter(item => item.kind === kind && (!term || `${item.title} ${item.body}`.toLocaleLowerCase().includes(term)));
  }, [items, kind, query]);

  function beginCreate() {
    setEditing(null); setTitle(''); setBody(''); setError(''); setDeleting(null); setFormOpen(true);
  }
  function beginEdit(item: LibraryItem) {
    setEditing(item); setTitle(item.title); setBody(item.body); setError(''); setDeleting(null); setFormOpen(true);
  }
  function cancelForm() { setFormOpen(false); setEditing(null); setTitle(''); setBody(''); setError(''); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const draft = { title, body };
      if (editing) await onUpdate(editing.id, draft);
      else await onCreate(kind, draft);
      cancelForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not save this ${isTask ? 'task' : 'note'}.`);
    } finally { setBusy(false); }
  }

  async function toggleTask(item: LibraryItem) {
    if (!isTask || busy) return;
    setBusy(true); setError('');
    try { await onUpdate(item.id, { title: item.title, body: item.body }, !item.completed); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this task.'); }
    finally { setBusy(false); }
  }

  async function confirmDelete(id: string) {
    if (busy) return;
    setBusy(true); setError('');
    try { await onDelete(id); setDeleting(null); if (editing?.id === id) cancelForm(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : `Could not delete this ${isTask ? 'task' : 'note'}.`); }
    finally { setBusy(false); }
  }

  return (
    <section className="library-items-panel" aria-label={isTask ? 'Tasks' : 'Notes'}>
      <div className="library-items-toolbar">
        <p>{isTask ? 'Small next steps, kept with your writing.' : 'Short thoughts to keep close to your writing.'}</p>
        {!formOpen && <button type="button" className="library-item-add" onClick={beginCreate}><Plus size={15} aria-hidden="true" /> Add {isTask ? 'task' : 'note'}</button>}
      </div>

      {formOpen && <form className="library-item-form" onSubmit={event => void submit(event)}>
        <h2>{editing ? `Edit ${isTask ? 'task' : 'note'}` : `New ${isTask ? 'task' : 'note'}`}</h2>
        <label>Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required autoFocus /></label>
        <label>{isTask ? 'Details (optional)' : 'Note'}<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={10000} rows={isTask ? 2 : 4} /></label>
        {error && <p className="library-item-error" role="alert">{error}</p>}
        <div className="library-item-actions">
          <button type="button" className="library-item-secondary" onClick={cancelForm} disabled={busy}><X size={14} aria-hidden="true" /> Cancel</button>
          <button type="submit" className="library-item-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : `Save ${isTask ? 'task' : 'note'}`}</button>
        </div>
      </form>}

      {loadError && <p className="library-item-error" role="alert">{loadError} <button type="button" onClick={onRetry}>Try again</button></p>}
      {error && !formOpen && <p className="library-item-error" role="alert">{error}</p>}
      {loading ? <p className="leaves-empty-state" role="status">Loading {isTask ? 'tasks' : 'notes'}…</p> : visibleItems.length === 0 ? (
        !formOpen && <p className="leaves-empty-state" role="status">{query.trim() ? `No ${isTask ? 'tasks' : 'notes'} match this search.` : `No ${isTask ? 'tasks' : 'notes'} yet.`}</p>
      ) : <div className="library-items-list">{visibleItems.map(item => <article className={`library-item-card ${item.completed ? 'is-complete' : ''}`} key={item.id}>
        <div className="library-item-content">
          {isTask && <button type="button" className="library-task-toggle" aria-pressed={item.completed} aria-label={`${item.completed ? 'Mark open' : 'Complete'}: ${item.title}`} disabled={busy} onClick={() => void toggleTask(item)}>{item.completed && <Check size={13} aria-hidden="true" />}</button>}
          <div className="library-item-copy"><h3>{item.title}</h3>{item.body && <p>{item.body}</p>}<time dateTime={item.updatedAt}>Updated {new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(new Date(item.updatedAt))}</time></div>
        </div>
        {deleting === item.id ? <div className="library-item-delete-confirm"><span>Delete this {isTask ? 'task' : 'note'} permanently?</span><button type="button" disabled={busy} onClick={() => void confirmDelete(item.id)}>Delete</button><button type="button" disabled={busy} onClick={() => setDeleting(null)}>Keep</button></div> : <div className="library-item-actions">
          <button type="button" className="library-item-secondary" disabled={busy} onClick={() => beginEdit(item)}><Edit3 size={13} aria-hidden="true" /> Edit</button>
          <button type="button" className="library-item-secondary" disabled={busy} onClick={() => setDeleting(item.id)}><Trash2 size={13} aria-hidden="true" /> Delete</button>
        </div>}
      </article>)}</div>}
    </section>
  );
}
