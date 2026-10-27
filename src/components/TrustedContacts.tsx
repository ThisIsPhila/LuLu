import { useEffect, useState, type FormEvent } from 'react';
import { loadContacts, saveContacts, type TrustedContact } from '../services/backend/journal';

export function TrustedContacts({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    loadContacts(uid).then(value => { if (active) setContacts(value); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load saved contacts.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [uid]);

  function resetForm() {
    setName(''); setPhone(''); setEditingId(null); setError(''); setStatus('');
  }

  async function save(next: TrustedContact[], successMessage = 'Contact saved.', clearForm = true) {
    setBusy(true); setError(''); setStatus('');
    try {
      await saveContacts(uid, next);
      setContacts(next);
      if (clearForm) resetForm();
      setStatus(successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this contact.');
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) { setError('Add a name for this contact.'); return; }
    if (!/^[+\d ()-]{3,30}$/.test(cleanPhone) || (cleanPhone.match(/\d/g)?.length ?? 0) < 3) {
      setError('Enter a valid phone number.'); return;
    }
    const contact = { id: editingId ?? crypto.randomUUID(), name: cleanName, phone: cleanPhone };
    const next = editingId
      ? contacts.map(current => current.id === editingId ? contact : current)
      : [...contacts, contact];
    void save(next);
  }

  function edit(contact: TrustedContact) {
    setEditingId(contact.id); setName(contact.name); setPhone(contact.phone); setError(''); setStatus('');
  }

  return <section className="trusted-contacts-panel" aria-label="Saved contact details">
    <div className="trusted-contacts-heading">
      <div><span className="private-writing-kicker">PRIVATE CONTACTS</span><h2>People you trust</h2></div>
      <button className="sanctuary-pill" type="button" onClick={onClose}>Back</button>
    </div>
    <p className="sanctuary-support-note">These are private phone-number notes. Saving a contact does not send a message, invite a companion, or share journal records.</p>
    {error && <p className="trusted-contacts-error" role="alert">{error}</p>}
    {status && <p className="sanctuary-support-note" role="status" aria-live="polite">{status}</p>}

    {busy && contacts.length === 0 ? <p className="sanctuary-support-note" role="status">Loading saved contacts…</p> : contacts.length === 0
      ? !error && <p className="sanctuary-support-note">No contacts saved yet.</p>
      : <ul className="trusted-contacts-list">{contacts.map(contact => <li key={contact.id}>
          <div className="trusted-contact-summary"><strong>{contact.name}</strong><a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{contact.phone}</a></div>
          <div className="trusted-contact-actions">
            <button type="button" className="sanctuary-pill" disabled={busy} onClick={() => edit(contact)}>Edit</button>
            <button type="button" className="sanctuary-pill" disabled={busy} onClick={() => void save(contacts.filter(value => value.id !== contact.id), 'Contact removed.', editingId === contact.id)}>Remove</button>
          </div>
        </li>)}</ul>}

    <form className="trusted-contact-form" onSubmit={submit}>
      <h3>{editingId ? 'Edit contact' : 'Add a contact'}</h3>
      <label>Name<input aria-label="Contact name" placeholder="Name" value={name} onChange={event => setName(event.target.value)} maxLength={100} required disabled={busy} /></label>
      <label>Phone number<input aria-label="Contact phone" placeholder="Phone number" type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={30} required disabled={busy} /></label>
      <div className="trusted-contact-actions">
        <button className="quick-exit-btn-top" type="submit" disabled={busy || (contacts.length >= 20 && !editingId)}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save contact'}</button>
        {editingId && <button className="sanctuary-pill" type="button" disabled={busy} onClick={resetForm}>Cancel edit</button>}
      </div>
      {contacts.length >= 20 && !editingId && <p className="sanctuary-support-note">You can save up to 20 contacts.</p>}
    </form>
  </section>;
}
