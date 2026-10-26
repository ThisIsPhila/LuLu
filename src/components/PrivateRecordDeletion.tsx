import { useLayoutEffect, useRef, useState } from 'react';
import type { LocalVault } from '../services/vault/localVault';
import type { LocalMediaVault } from '../services/vault/localMediaVault';

type DeletePlan = { revisionCount: number; draftCount: number; confirm: () => Promise<void> };
type Props =
  | { kind: 'text'; vault: LocalVault; recordId: string; onDeleted: () => void }
  | { kind: 'media'; vault: LocalMediaVault; recordId: string; onDeleted: () => void };

/** Explicitly confirms deletion of one local record and only its linked drafts. */
export function PrivateRecordDeletion(props: Props) {
  const [plan, setPlan] = useState<DeletePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState('');
  const mounted = useRef(false);
  const operation = useRef(0);
  const planRef = useRef<DeletePlan | null>(null);

  function cancel() {
    operation.current += 1;
    planRef.current = null;
    setPlan(null);
    setAcknowledged(false);
    setBusy(false);
    setStatus('');
  }

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current += 1;
      planRef.current = null;
    };
  }, [props.vault, props.recordId]);

  async function prepare() {
    if (busy) return;
    const token = ++operation.current;
    setBusy(true);
    setStatus('Checking this record and its linked recovery drafts…');
    try {
      const nextPlan = props.kind === 'text'
        ? await props.vault.prepareDeletion(props.recordId)
        : await props.vault.prepareDeletion(props.recordId);
      if (!mounted.current || token !== operation.current) return;
      props.vault.assertUnlocked();
      planRef.current = nextPlan;
      setPlan(nextPlan);
      setAcknowledged(false);
      setStatus('Review the scope and confirm below.');
    } catch {
      if (mounted.current && token === operation.current) setStatus('Could not prepare deletion. Nothing was deleted; refresh the private list and try again.');
    } finally {
      if (mounted.current && token === operation.current) setBusy(false);
    }
  }

  async function confirm() {
    const currentPlan = planRef.current;
    if (!currentPlan || !acknowledged || busy || !mounted.current) return;
    const token = ++operation.current;
    setBusy(true);
    setStatus('Deleting this local record…');
    try {
      props.vault.assertUnlocked();
      await currentPlan.confirm();
      if (!mounted.current || token !== operation.current) return;
      planRef.current = null;
      setPlan(null);
      props.onDeleted();
    } catch {
      if (mounted.current && token === operation.current) {
        planRef.current = null;
        setPlan(null);
        setAcknowledged(false);
        setStatus('Could not confirm whether deletion completed. Refresh the private list before trying again.');
      }
    } finally {
      if (mounted.current && token === operation.current) setBusy(false);
    }
  }

  return <section className="private-record-export" aria-label="Delete private record">
    {!plan ? <button className="private-journal-action private-journal-action-quiet" type="button" disabled={busy} onClick={() => void prepare()}>
      {props.kind === 'text' ? 'Delete this private record' : 'Delete this private media'}
    </button> : <>
      <p className="private-journal-note">
        This permanently removes this {props.kind === 'text' ? 'text record' : 'media file'} from this browser.
        {props.kind === 'text' && <> It includes 1 original and {Math.max(0, plan.revisionCount - 1)} saved revision{plan.revisionCount - 1 === 1 ? '' : 's'}, plus {plan.draftCount} linked recovery draft{plan.draftCount === 1 ? '' : 's'}.</>}
        {props.kind === 'media' && <> It includes 1 original media file.</>}
        {' '}Downloaded copies, cloud records, and device encryption keys are not removed.
      </p>
      <label className="private-journal-note">
        <input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} />
        {' '}I understand this permanently deletes the selected local record{props.kind === 'text' ? ' and its linked recovery drafts' : ''}.
      </label>
      <button className="private-journal-action private-journal-action-quiet" type="button" disabled={!acknowledged || busy} onClick={() => void confirm()}>
        Delete permanently
      </button>
      <button className="private-journal-action private-journal-action-quiet" type="button" disabled={busy} onClick={cancel}>Cancel deletion</button>
    </>}
    {status && <p className="private-journal-note" role="status" aria-live="polite">{status}</p>}
  </section>;
}
