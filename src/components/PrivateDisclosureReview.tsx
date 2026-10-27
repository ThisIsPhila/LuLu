import { useState, type FormEvent } from 'react';
import { createLocalDisclosureHandoff } from '../services/privacy/disclosureHandoff';
import type { LocalVault } from '../services/vault/localVault';
import type { DisclosureCopy } from '../domain/privacy/types';

type Props = {
  vault: LocalVault;
  source: { recordId: string; revisionId: string; title: string; text: string };
};

/** Local, one-record review. Nothing is persisted or sent to a recipient. */
export function PrivateDisclosureReview({ vault, source }: Props) {
  const [recipient, setRecipient] = useState('');
  const [purpose, setPurpose] = useState('');
  const [candidate, setCandidate] = useState(source.text);
  const [copy, setCopy] = useState<DisclosureCopy | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const handoff = createLocalDisclosureHandoff(() => vault.assertUnlocked());

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('Preparing a separate copy for review…'); setCopy(null); setReviewed(false);
    try {
      const prepared = await handoff.prepare({
        snapshotId: crypto.randomUUID(),
        sourceRevisions: [{ recordId: source.recordId, revisionId: source.revisionId }],
        purpose: purpose.trim(),
        recipientId: recipient.trim(),
        text: candidate,
      });
      setCopy(prepared);
      setMessage('Review the exact text below. LuLu has not checked it for identifying details.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not prepare this copy. The saved record is unchanged.');
    } finally { setBusy(false); }
  }

  async function copyReviewedText() {
    if (!copy || !reviewed || busy) return;
    setBusy(true); setMessage('');
    try {
      await handoff.copyReviewedText(copy, reviewed);
      setMessage('The reviewed text was copied to this device’s clipboard. LuLu did not send it.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not copy the reviewed text.');
    } finally { setBusy(false); }
  }

  function editCopy() {
    setCandidate(copy?.text ?? candidate);
    setCopy(null); setReviewed(false); setMessage('Edit the separate copy, then prepare it again for review.');
  }

  return <section className="private-disclosure-review" aria-label="Prepare and review a disclosure copy">
    <div className="private-journal-section-heading">
      <span className="private-writing-kicker">PRIVATE REVIEW</span>
      <h2>Prepare a separate copy</h2>
    </div>
    <p className="private-journal-note">This uses one saved revision: “{source.title || 'Untitled record'}”. Edit the copy to remove details you do not want to share. The original is not changed. LuLu does not automatically detect all identifying details, and nothing is sent or saved by this review.</p>

    {!copy ? <form className="private-disclosure-form" onSubmit={event => void prepare(event)}>
      <label>Recipient or role
        <input className="private-disclosure-input" value={recipient} onChange={event => setRecipient(event.target.value)} maxLength={120} placeholder="For example, my counsellor" required />
      </label>
      <label>Purpose
        <input className="private-disclosure-input" value={purpose} onChange={event => setPurpose(event.target.value)} maxLength={240} placeholder="What do you want this copy to help with?" required />
      </label>
      <label>Separate copy
        <textarea className="private-disclosure-text" value={candidate} onChange={event => setCandidate(event.target.value)} rows={8} maxLength={100000} required />
      </label>
      <p className="private-journal-note">Source revision: {source.revisionId}. Only this saved text revision is included; drafts, media and unsaved edits are excluded.</p>
      <button className="private-journal-action private-journal-action-quiet" type="submit" disabled={busy || !candidate.trim()}>{busy ? 'Preparing…' : 'Prepare exact copy for review'}</button>
    </form> : <div className="private-disclosure-preview">
      <div className="private-journal-history-card">
        <strong>Exact copy · {copy.recipientId}</strong>
        <p>Purpose: {copy.purpose}</p>
        <p>Source revision: {copy.sourceRevisions[0]?.revisionId}</p>
        <pre>{copy.text}</pre>
      </div>
      <p className="private-journal-note">This is a manual review only. The preview may still identify you or another person; it is not an anonymisation check. Copying places the text on the device clipboard, where other apps may be able to access it.</p>
      <label className="private-disclosure-ack">
        <input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />
        I reviewed this exact copy for this recipient and purpose.
      </label>
      <div className="private-disclosure-actions">
        <button className="private-journal-action private-journal-action-quiet" type="button" disabled={busy} onClick={editCopy}>Edit copy</button>
        <button className="private-journal-action private-journal-action-primary" type="button" disabled={!reviewed || busy} onClick={() => void copyReviewedText()}>{busy ? 'Copying…' : 'Copy reviewed text'}</button>
      </div>
    </div>}
    {message && <p className="private-journal-note" role="status" aria-live="polite">{message}</p>}
  </section>;
}
