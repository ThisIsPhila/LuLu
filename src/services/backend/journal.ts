import { collection, doc, onSnapshot, query, orderBy, limit, writeBatch, serverTimestamp, getDoc, updateDoc, deleteDoc, deleteField, type Firestore } from 'firebase/firestore';
import { database } from './firebase.ts';
import { encryptPrivate, decryptPrivate, type Envelope } from './deviceVault.ts';
import type { Entry } from '../../domain/journal';
import type { Entity } from '../../domain/transform';
import { isLocalDevelopment, developmentJournal } from '../localDevelopment';
import { normalizeStoryCollection } from '../../domain/storyCollections';
import { normalizeOrdinaryTags } from '../../domain/ordinaryMetadata';

export function watchEntries(uid: string, receive: (entries: Entry[]) => void, fail: (error: Error) => void) {
  if (isLocalDevelopment(uid)) return developmentJournal.watch(receive, fail);
  return onSnapshot(query(collection(database,'users',uid,'entries'),orderBy('createdAt','desc'),limit(100)), snapshot => {
    receive(snapshot.docs.map(record => {
      const d=record.data(), date=d.createdAt?.toDate?.() ?? new Date();
      const today=new Date().toDateString(), yesterday=new Date(Date.now()-86400000).toDateString();
      let curatedDeck: string | undefined;
      try {
        if (d.kind === 'Story' && typeof d.curatedDeck === 'string') curatedDeck = normalizeStoryCollection(d.curatedDeck);
      } catch { /* Ignore malformed collection metadata without hiding the saved entry. */ }
      let tags: string[] = [];
      try { tags = normalizeOrdinaryTags(d.tags ?? []); } catch { /* Malformed optional metadata must not hide the saved entry. */ }
      return {id:record.id,title:d.title,body:d.body,kind:d.kind,protected:d.protected,perspective:d.perspective,
        date:date.toISOString(),timeStr:date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
        wordsCount:d.body.trim().split(/\s+/).length,groupDate:date.toDateString()===today?'Today':date.toDateString()===yesterday?'Yesterday':'Earlier',
        favorite:d.protected === false && d.favorite === true,tags:d.protected === false ? tags : [],...(curatedDeck ? {curatedDeck} : {})};
    }));
  },fail);
}
type EntryKind = Entry['kind'];
const validEntryKind = (value: unknown): value is EntryKind => value === 'Journal' || value === 'Story';

export async function saveEntry(
  uid: string,
  data: {entryId?:string;title:string;body:string;originalBody:string;protected:boolean;entities:Entity[];kind?:EntryKind;curatedDeck?:string;favorite?:boolean;tags?:string[]},
  firestore: Firestore = database,
) {
  if (isLocalDevelopment(uid)) { developmentJournal.save(data); return; }
  if (data.kind !== undefined && !validEntryKind(data.kind)) throw new Error('Choose Journal or Story for this entry.');
  if(!data.body.trim() || data.body.length>50000 || data.originalBody.length>50000) throw new Error('Write between 1 and 50,000 characters.');
  const kind = data.protected ? 'Journal' : data.kind ?? 'Journal';
  const curatedDeck = normalizeStoryCollection(data.curatedDeck);
  const tags = normalizeOrdinaryTags(data.tags ?? []);
  if (data.favorite !== undefined && typeof data.favorite !== 'boolean') throw new Error('Favorite must be enabled or disabled.');
  if (curatedDeck && kind !== 'Story') throw new Error('Only ordinary Story entries can belong to a Story collection.');
  const ref=data.entryId ? doc(firestore,'users',uid,'entries',data.entryId) : doc(collection(firestore,'users',uid,'entries'));
  const batch=writeBatch(firestore);
  // Explicit whitelist prevents originalBody, source titles, and entity mappings leaking into display documents.
  batch.set(ref,{ownerId:uid,title:data.protected?'Journal entry':data.title.slice(0,200),body:data.body,kind,protected:data.protected,
    ...(!data.protected && curatedDeck ? {curatedDeck} : {}),
    ...(!data.protected ? {favorite:data.favorite === true,tags} : {}),
    perspective:data.protected?'third':'first',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  if(data.protected) {
    const envelope=await encryptPrivate(uid,ref.id,{originalBody:data.originalBody,title:data.title,entities:data.entities});
    batch.set(doc(firestore,'users',uid,'private',ref.id),{...envelope,updatedAt:serverTimestamp()});
  }
  await batch.commit();
}

/** Update an ordinary display entry without touching any protected payload. */
export async function updateEntry(uid: string, id: string, data: {title:string;body:string;kind?:EntryKind;curatedDeck?:string;favorite?:boolean;tags?:string[]}, firestore: Firestore = database) {
  if (isLocalDevelopment(uid)) { developmentJournal.update(id, data); return; }
  if (typeof uid !== 'string' || !uid || typeof id !== 'string' || !id || id.includes('/') ||
      typeof data?.title !== 'string' || data.title.length > 200 ||
      typeof data?.body !== 'string' || !data.body.trim() || data.body.length > 50000 ||
      (data.kind !== undefined && !validEntryKind(data.kind)) ||
      (data.curatedDeck !== undefined && typeof data.curatedDeck !== 'string') ||
      (data.favorite !== undefined && typeof data.favorite !== 'boolean')) {
    throw new Error('Use a title up to 200 characters, write between 1 and 50,000 characters, and choose Journal or Story.');
  }
  const ref = doc(firestore, 'users', uid, 'entries', id);
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error('This entry is no longer available.');
  if (existing.data().protected !== false) throw new Error('Protected entries must be edited through protected access.');
  const nextKind = data.kind ?? existing.data().kind;
  const curatedDeck = data.curatedDeck === undefined ? undefined : normalizeStoryCollection(data.curatedDeck);
  const tags = data.tags === undefined ? undefined : normalizeOrdinaryTags(data.tags);
  if (curatedDeck && nextKind !== 'Story') throw new Error('Only ordinary Story entries can belong to a Story collection.');
  await updateDoc(ref, {
    title: data.title,
    body: data.body,
    ...(data.kind === undefined ? {} : { kind: data.kind }),
    ...(data.favorite === undefined ? {} : { favorite: data.favorite }),
    ...(tags === undefined ? {} : { tags }),
    ...(data.curatedDeck === undefined && data.kind !== 'Journal' ? {} : {
      curatedDeck: nextKind === 'Story' && curatedDeck ? curatedDeck : deleteField(),
    }),
    updatedAt: serverTimestamp(),
  });
}

/** Permanently delete only one owner-scoped ordinary entry. */
export async function deleteEntry(uid: string, id: string, firestore: Firestore = database): Promise<void> {
  if (isLocalDevelopment(uid)) { developmentJournal.remove(id); return; }
  if (typeof uid !== 'string' || !uid.trim() || uid.length > 128 || uid.includes('/') ||
      typeof id !== 'string' || !id.trim() || id.length > 200 || id.includes('/')) {
    throw new TypeError('A valid account and ordinary entry ID are required.');
  }
  const ref = doc(firestore, 'users', uid, 'entries', id);
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error('This entry is no longer available.');
  const data = existing.data();
  if (data.ownerId !== uid) throw new Error('This entry does not belong to the active account.');
  if (data.protected !== false) throw new Error('Protected entries cannot be deleted through ordinary journal actions.');
  await deleteDoc(ref);
}

export async function readOriginal(uid: string, id: string) {
  if (isLocalDevelopment(uid)) throw new Error('Cloud originals are unavailable in the local workspace.');
  const record=await getDoc(doc(database,'users',uid,'private',id));
  if(!record.exists()) throw new Error('The original record is unavailable.');
  return decryptPrivate<{originalBody:string;title:string;entities:Entity[]}>(uid,id,record.data() as Envelope);
}

export type TrustedContact={id:string;name:string;phone:string};
export async function loadContacts(uid:string):Promise<TrustedContact[]> {
  if (isLocalDevelopment(uid)) return developmentJournal.contacts();
  const record=await getDoc(doc(database,'users',uid,'private','trusted-contacts'));
  if(!record.exists())return [];
  const payload=await decryptPrivate<{contacts:TrustedContact[]}>(uid,'trusted-contacts',record.data() as Envelope);
  return payload.contacts;
}
export async function saveContacts(uid:string,contacts:TrustedContact[]) {
  if(contacts.length>20 || contacts.some(c=>!c.name.trim() || c.name.length>100 || !/^[+\d ()-]{3,30}$/.test(c.phone)))throw new Error('Add a name and a valid phone number, up to 20 contacts.');
  if (isLocalDevelopment(uid)) { developmentJournal.saveContacts(contacts); return; }
  const envelope=await encryptPrivate(uid,'trusted-contacts',{contacts});
  const batch=writeBatch(database);
  batch.set(doc(database,'users',uid,'private','trusted-contacts'),{...envelope,updatedAt:serverTimestamp()});
  await batch.commit();
}
