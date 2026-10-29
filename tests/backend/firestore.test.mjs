import {readFileSync} from 'node:fs';
import {before,after,beforeEach,test} from 'node:test';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,getDocs,collection,query,orderBy,limit,serverTimestamp,Timestamp} from 'firebase/firestore';
let env;
const session={uid:'alice',expiresAt:Date.now()+3600000,privateUntil:Date.now()+600000};
const entry=()=>({ownerId:'alice',title:'A record',body:'A thought',kind:'Journal',protected:false,perspective:'first',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
const envelope=()=>({version:1,iv:'abcdefghijklmnop',ciphertext:'a'.repeat(40),updatedAt:serverTimestamp()});
const db=(uid='alice',sid='session')=>env.authenticatedContext(uid,{passkey:true,sid}).firestore();
const [emulatorHost,emulatorPort]= (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085').split(':');
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-lulu-backend',firestore:{host:emulatorHost,port:Number(emulatorPort),rules:readFileSync('firestore.rules','utf8')}});});
after(async()=>env?.cleanup());
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'_sessions/session'),session);});});
test('owner can create, read and query the actual journal shape',async()=>{
 const d=db();await assertSucceeds(setDoc(doc(d,'users/alice/entries/one'),entry()));
 await assertSucceeds(getDoc(doc(d,'users/alice/entries/one')));
 await assertSucceeds(getDocs(query(collection(d,'users/alice/entries'),orderBy('createdAt','desc'),limit(100))));
 await assertSucceeds(updateDoc(doc(d,'users/alice/entries/one'),{title:'Updated',updatedAt:serverTimestamp()}));
 await assertSucceeds(deleteDoc(doc(d,'users/alice/entries/one')));
});
test('anonymous, another account, missing and expired sessions cannot access journal',async()=>{
 for(const d of [env.unauthenticatedContext().firestore(),db('bob'),db('alice','missing')]) {
  await assertFails(getDoc(doc(d,'users/alice/entries/one')));
  await assertFails(setDoc(doc(d,'users/alice/entries/one'),entry()));
  await assertFails(getDocs(query(collection(d,'users/alice/entries'),limit(100))));
 }
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'_sessions/session'),{...session,expiresAt:1}));
 await assertFails(getDoc(doc(db(),'users/alice/entries/one')));
});
test('strict schema prevents source leakage, ownership changes, type corruption, oversized input and update bypass',async()=>{
 const ref=doc(db(),'users/alice/entries/one');
 for(const patch of [{originalBody:'source'},{ownerId:'bob'},{body:'a'.repeat(50001)},{body:2},{kind:'Admin'},{createdAt:Timestamp.fromMillis(1)},{role:'admin'}])
   await assertFails(setDoc(ref,{...entry(),...patch}));
 await assertSucceeds(setDoc(ref,entry()));
 for(const patch of [{originalBody:'source'},{ownerId:'bob'},{body:2},{title:'a'.repeat(201)},{createdAt:Timestamp.fromMillis(1)},{protected:true}])
   await assertFails(updateDoc(ref,{...patch,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{body:'missing fields'}));
});
test('protected entries require a generic title on create and update',async()=>{
 const ref=doc(db(),'users/alice/entries/protected');
 const protectedEntry={...entry(),title:'Journal entry',protected:true,perspective:'third'};
 await assertSucceeds(setDoc(ref,protectedEntry));
 await assertFails(setDoc(doc(db(),'users/alice/entries/leaked-title'),{...protectedEntry,title:'David visited'}));
 await assertFails(updateDoc(ref,{title:'David visited',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref,{body:'A concealed update',updatedAt:serverTimestamp()}));
});
test('server credentials/challenges/sessions cannot be read, listed or modified by clients',async()=>{
 for(const name of ['_sessions','_credentials','_challenges','_rateLimits']){
 const d=db();await assertFails(getDoc(doc(d,name,'session')));await assertFails(setDoc(doc(d,name,'session'),{uid:'alice'}));await assertFails(getDocs(collection(d,name)));
 }
});
test('private encrypted records require recent step-up, strict format and owner session',async()=>{
 const ref=doc(db(),'users/alice/private/one');
 await assertSucceeds(setDoc(ref,envelope()));await assertSucceeds(getDoc(ref));
 await assertFails(updateDoc(ref,{originalBody:'plaintext',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{ciphertext:3,updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(db('bob'),'users/alice/private/one')));
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'_sessions/session'),{...session,privateUntil:1}));
 await assertFails(getDoc(ref));await assertFails(setDoc(ref,envelope()));await assertFails(deleteDoc(ref));
});
test('signed-in active passkey sessions can read the catalogue manifest and validated samples only',async()=>{
 const manifestPath='demoCatalogues/johannesburg-v1';
 const path=`${manifestPath}/entries/demo-one`;
 const manifest={version:1,label:'Fictional demo catalogue',entryIds:['demo-one']};
 const sample={title:'A fictional sample',body:'A short invented scene.',kind:'Story',protected:false,perspective:'first',curatedDeck:'Demo collection',tags:['Demo'],createdAt:Timestamp.fromMillis(1)};
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),manifestPath),manifest);
  await setDoc(doc(ctx.firestore(),path),sample);
 });
 await assertSucceeds(getDoc(doc(db(),manifestPath)));
 await assertSucceeds(getDoc(doc(db(),path)));
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'demoCatalogues/johannesburg-v1/entries/leaked'),{...sample,originalBody:'source text'}));
 await assertFails(getDoc(doc(db(),'demoCatalogues/johannesburg-v1/entries/leaked')));
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'demoCatalogues/johannesburg-v1/entries/invalid-collection'),{...sample,curatedDeck:'x'.repeat(81)}));
 await assertFails(getDoc(doc(db(),'demoCatalogues/johannesburg-v1/entries/invalid-collection')));
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'demoCatalogues/johannesburg-v1/entries/journal-collection'),{...sample,kind:'Journal'}));
 await assertFails(getDoc(doc(db(),'demoCatalogues/johannesburg-v1/entries/journal-collection')));
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'demoCatalogues/unsafe'),{...manifest,source:'leaked'}));
 await assertFails(getDoc(doc(db(),'demoCatalogues/unsafe')));
 const bob=db('bob','bob-session');
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'_sessions/bob-session'),{...session,uid:'bob'}));
 await assertSucceeds(getDoc(doc(bob,manifestPath)));
 await assertSucceeds(getDoc(doc(bob,path)));
 for(const d of [env.unauthenticatedContext().firestore(),db('alice','missing')]) {
  await assertFails(getDoc(doc(d,manifestPath)));
  await assertFails(getDoc(doc(d,path)));
 }
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),path)));
 await assertFails(getDocs(collection(db(),'demoCatalogues')));
 await assertFails(getDocs(collection(db(),'demoCatalogues/johannesburg-v1/entries')));
 await assertFails(setDoc(doc(db(),manifestPath),manifest));
 await assertFails(setDoc(doc(db(),path),sample));
 await assertFails(updateDoc(doc(db(),path),{title:'Changed'}));
 await assertFails(deleteDoc(doc(db(),path)));
});

test('starter marker is owner-only, strict and immutable after creation',async()=>{
 const ref=doc(db(),'users/alice/starterCatalogues/johannesburg-v1');
 const marker={catalogueId:'johannesburg-v1',version:1,entryIds:['starter-johannesburg-v1-one'],completedAt:serverTimestamp()};
 await assertFails(setDoc(doc(db('bob'),'users/alice/starterCatalogues/johannesburg-v1'),marker));
 await assertFails(setDoc(ref,{...marker,entryIds:[3]}));
 await assertFails(setDoc(ref,{...marker,role:'admin'}));
 await assertSucceeds(setDoc(ref,marker));
 await assertSucceeds(getDoc(ref));
 await assertFails(getDoc(doc(db('bob'),'users/alice/starterCatalogues/johannesburg-v1')));
 await assertFails(updateDoc(ref,{version:2}));await assertFails(deleteDoc(ref));
});

test('account appearance is owner-only and accepts only system, light or dark',async()=>{
 const ref=doc(db(),'users/alice/preferences/appearance');
 await assertSucceeds(setDoc(ref,{theme:'dark',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref));
 await assertSucceeds(updateDoc(ref,{theme:'system',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{theme:'sepia',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{theme:'light',updatedAt:Timestamp.fromMillis(1)}));
 await assertFails(setDoc(ref,{theme:'light',updatedAt:serverTimestamp(),extra:'not allowed'}));
 await assertFails(getDoc(doc(db('bob'),'users/alice/preferences/appearance')));
 await assertFails(setDoc(doc(db('bob'),'users/alice/preferences/appearance'),{theme:'light',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(db(),'users/alice/preferences/profile')));
 await assertFails(getDocs(collection(db(),'users/alice/preferences')));
});
