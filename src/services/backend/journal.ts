import { collection, doc, onSnapshot, query, orderBy, limit, writeBatch, serverTimestamp, getDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { database } from './firebase.ts';
import { encryptPrivate, decryptPrivate, type Envelope } from './deviceVault.ts';
import type { Entry } from '../../domain/journal';
import type { Entity } from '../../domain/transform';

export function watchEntries(uid: string, receive: (entries: Entry[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(database,'users',uid,'entries'),orderBy('createdAt','desc'),limit(100)), snapshot => {
    receive(snapshot.docs.map(record => {
      const d=record.data(), date=d.createdAt?.toDate?.() ?? new Date();
      const today=new Date().toDateString(), yesterday=new Date(Date.now()-86400000).toDateString();
      return {id:record.id,title:d.title,body:d.body,kind:d.kind,protected:d.protected,perspective:d.perspective,
        date:date.toISOString(),timeStr:date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
        wordsCount:d.body.trim().split(/\s+/).length,groupDate:date.toDateString()===today?'Today':date.toDateString()===yesterday?'Yesterday':'Earlier',
        favorite:false,tags:[]};
    }));
  },fail);
}
type EntryKind = Entry['kind'];
const validEntryKind = (value: unknown): value is EntryKind => value === 'Journal' || value === 'Story';

export async function saveEntry(
  uid: string,
  data: {title:string;body:string;originalBody:string;protected:boolean;entities:Entity[];kind?:EntryKind},
  firestore: Firestore = database,
) {
  if (data.kind !== undefined && !validEntryKind(data.kind)) throw new Error('Choose Journal or Story for this entry.');
  if(!data.body.trim() || data.body.length>50000 || data.originalBody.length>50000) throw new Error('Write between 1 and 50,000 characters.');
  const ref=doc(collection(firestore,'users',uid,'entries'));
  const batch=writeBatch(firestore);
  // Explicit whitelist prevents originalBody, source titles, and entity mappings leaking into display documents.
  batch.set(ref,{ownerId:uid,title:data.protected?'Journal entry':data.title.slice(0,200),body:data.body,kind:data.protected?'Journal':data.kind ?? 'Journal',protected:data.protected,
    perspective:data.protected?'third':'first',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  if(data.protected) {
    const envelope=await encryptPrivate(uid,ref.id,{originalBody:data.originalBody,title:data.title,entities:data.entities});
    batch.set(doc(firestore,'users',uid,'private',ref.id),{...envelope,updatedAt:serverTimestamp()});
  }
  await batch.commit();
}

/** Update an ordinary display entry without touching any protected payload. */
export async function updateEntry(uid: string, id: string, data: {title:string;body:string;kind?:EntryKind}, firestore: Firestore = database) {
  if (typeof uid !== 'string' || !uid || typeof id !== 'string' || !id || id.includes('/') ||
      typeof data?.title !== 'string' || data.title.length > 200 ||
      typeof data?.body !== 'string' || !data.body.trim() || data.body.length > 50000 ||
      (data.kind !== undefined && !validEntryKind(data.kind))) {
    throw new Error('Use a title up to 200 characters, write between 1 and 50,000 characters, and choose Journal or Story.');
  }
  const ref = doc(firestore, 'users', uid, 'entries', id);
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error('This entry is no longer available.');
  if (existing.data().protected !== false) throw new Error('Protected entries must be edited through protected access.');
  await updateDoc(ref, {
    title: data.title,
    body: data.body,
    ...(data.kind === undefined ? {} : { kind: data.kind }),
    updatedAt: serverTimestamp(),
  });
}

export async function readOriginal(uid: string, id: string) {
  const record=await getDoc(doc(database,'users',uid,'private',id));
  if(!record.exists()) throw new Error('The original record is unavailable.');
  return decryptPrivate<{originalBody:string;title:string;entities:Entity[]}>(uid,id,record.data() as Envelope);
}

export type TrustedContact={id:string;name:string;phone:string};
export async function loadContacts(uid:string):Promise<TrustedContact[]> {
  const record=await getDoc(doc(database,'users',uid,'private','trusted-contacts'));
  if(!record.exists())return [];
  const payload=await decryptPrivate<{contacts:TrustedContact[]}>(uid,'trusted-contacts',record.data() as Envelope);
  return payload.contacts;
}
export async function saveContacts(uid:string,contacts:TrustedContact[]) {
  if(contacts.length>20 || contacts.some(c=>!c.name.trim() || c.name.length>100 || !/^[+\d ()-]{3,30}$/.test(c.phone)))throw new Error('Add a name and a valid phone number, up to 20 contacts.');
  const envelope=await encryptPrivate(uid,'trusted-contacts',{contacts});
  const batch=writeBatch(database);
  batch.set(doc(database,'users',uid,'private','trusted-contacts'),{...envelope,updatedAt:serverTimestamp()});
  await batch.commit();
}
