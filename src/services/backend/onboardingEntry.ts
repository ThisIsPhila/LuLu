import { doc, getDoc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { database } from './firebase.ts';
import { clearOnboardingDraft, loadOnboardingDraft } from '../onboardingDraft.ts';

/** A stable target ID makes interrupted and repeated imports idempotent. */
export async function retainFirstOnboardingEntry(uid: string, firestore: Firestore = database): Promise<'saved' | 'none'> {
  if (!uid || uid.length > 128 || uid.includes('/')) throw new Error('A verified account is required.');
  const draft = await loadOnboardingDraft();
  if (!draft || draft.ownerUid !== uid) return 'none';
  const body = draft.state.firstEntryText;
  if (!draft.entrySaved || typeof body !== 'string' || !body.trim()) {
    await clearOnboardingDraft(draft.id);
    return 'none';
  }
  const id = `onboarding-${draft.id}`;
  const ref = doc(firestore, 'users', uid, 'entries', id);
  await runTransaction(firestore, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists()) {
      if (existing.data().ownerId !== uid) {
        throw new Error('The first-entry destination is already occupied.');
      }
      return;
    }
    tx.set(ref, {
      ownerId: uid,
      title: 'My first entry',
      body,
      kind: 'Journal',
      protected: false,
      perspective: 'first',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  // Confirm the committed record before deleting the only local encrypted copy.
  const committed = await getDoc(ref);
  if (!committed.exists() || committed.data().ownerId !== uid) {
    throw new Error('The first entry could not be confirmed in your journal. Retry when connected.');
  }
  await clearOnboardingDraft(draft.id);
  return 'saved';
}
