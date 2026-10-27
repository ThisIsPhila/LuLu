import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import type { LibraryItem, LibraryItemDraft, LibraryItemKind } from '../../domain/libraryItems.ts';
import { normalizeLibraryItemDraft } from '../../domain/libraryItems.ts';
import { database } from './firebase.ts';
import { developmentLibraryItems, isLocalDevelopment } from '../localDevelopment.ts';

const collectionPath = (uid: string) => collection(database, 'users', uid, 'notesTasks');

function assertUid(uid: string): void {
  if (typeof uid !== 'string' || !uid.trim() || uid.length > 128 || uid.includes('/')) throw new TypeError('A valid signed-in account is required.');
}

function assertId(id: string): void {
  if (typeof id !== 'string' || !id.trim() || id.length > 200 || id.includes('/')) throw new TypeError('A valid note or task is required.');
}

export function watchLibraryItems(uid: string, receive: (items: LibraryItem[]) => void, fail: (error: Error) => void) {
  assertUid(uid);
  if (isLocalDevelopment(uid)) return developmentLibraryItems.watch(receive, fail);
  const items = query(collectionPath(uid), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(items, snapshot => {
    receive(snapshot.docs.flatMap(record => {
      const data = record.data();
      const createdAt = data.createdAt?.toDate?.();
      const updatedAt = data.updatedAt?.toDate?.();
      if (data.ownerId !== uid || !createdAt || !updatedAt || !['note', 'task'].includes(data.kind) ||
          typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200 ||
          typeof data.body !== 'string' || data.body.length > 10000 || typeof data.completed !== 'boolean') return [];
      return [{ id: record.id, kind: data.kind as LibraryItemKind, title: data.title, body: data.body,
        completed: data.kind === 'task' && data.completed === true, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() }];
    }));
  }, fail);
}

export async function createLibraryItem(uid: string, kind: LibraryItemKind, draft: LibraryItemDraft, firestore: Firestore = database): Promise<void> {
  assertUid(uid);
  if (!['note', 'task'].includes(kind)) throw new TypeError('Choose note or task.');
  const normalized = normalizeLibraryItemDraft(draft);
  if (isLocalDevelopment(uid)) return developmentLibraryItems.create(kind, normalized);
  await addDoc(collection(firestore, 'users', uid, 'notesTasks'), {
    ownerId: uid, kind, ...normalized, completed: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function updateLibraryItem(uid: string, id: string, draft: LibraryItemDraft, completed?: boolean, firestore: Firestore = database): Promise<void> {
  assertUid(uid); assertId(id);
  const normalized = normalizeLibraryItemDraft(draft);
  if (completed !== undefined && typeof completed !== 'boolean') throw new TypeError('Task status must be complete or open.');
  if (isLocalDevelopment(uid)) return developmentLibraryItems.update(id, normalized, completed);
  const reference = doc(firestore, 'users', uid, 'notesTasks', id);
  await updateDoc(reference, { ...normalized, ...(completed === undefined ? {} : { completed }), updatedAt: serverTimestamp() });
}

export async function deleteLibraryItem(uid: string, id: string, firestore: Firestore = database): Promise<void> {
  assertUid(uid); assertId(id);
  if (isLocalDevelopment(uid)) return developmentLibraryItems.remove(id);
  await deleteDoc(doc(firestore, 'users', uid, 'notesTasks', id));
}
