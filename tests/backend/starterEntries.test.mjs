import {readFileSync} from 'node:fs';
import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc,updateDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import {ensureStarterEntries} from '../../src/services/backend/demoCatalogue.ts';

let env;
const session={uid:'alice',expiresAt:Date.now()+3600000,privateUntil:Date.now()+600000};
const catalogueId='johannesburg-v1';
const manifestPath=`demoCatalogues/${catalogueId}`;
const catalogueSeed=JSON.parse(readFileSync('scripts/demo-catalogue-seed.json','utf8'));
const ids=catalogueSeed.manifest.entryIds;
const targetId=id=>`starter-${catalogueId}-${id.slice('demo-'.length)}`;
const db=(uid='alice',sid='session')=>env.authenticatedContext(uid,{passkey:true,sid}).firestore();
const [emulatorHost,emulatorPort]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8085').split(':');

before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-lulu-starter',firestore:{host:emulatorHost,port:Number(emulatorPort),rules:readFileSync('firestore.rules','utf8')}});
});
after(async()=>env?.cleanup());
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const firestore=ctx.firestore();
    await setDoc(doc(firestore,'_sessions/session'),session);
    await setDoc(doc(firestore,manifestPath),catalogueSeed.manifest);
    for(const entry of catalogueSeed.entries){
      const {id,createdAt,...fields}=entry;
      await setDoc(doc(firestore,manifestPath,'entries',id),{
        ...fields,
        createdAt:Timestamp.fromDate(new Date(createdAt)),
      });
    }
  });
});

test('concurrent initializations create each starter once and record one marker',async()=>{
  const firestore=db();
  const results=await Promise.all([
    ensureStarterEntries('alice',firestore),
    ensureStarterEntries('alice',firestore),
  ]);
  assert.deepEqual(results.sort((a,b)=>a-b),[0,ids.length]);
  for(const id of ids) assert.equal((await getDoc(doc(firestore,'users/alice/entries',targetId(id)))).exists(),true);
  const marker=await getDoc(doc(firestore,'users/alice/starterCatalogues',catalogueId));
  assert.equal(marker.exists(),true);
  assert.deepEqual(marker.data().entryIds,ids.map(targetId));
  assert.equal((await getDoc(doc(firestore,'users/alice/entries',targetId('demo-story-juniper-02')))).data().curatedDeck,'Juniper Street Garden');
  assert.deepEqual((await getDoc(doc(firestore,'users/alice/entries',targetId('demo-story-juniper-02')))).data().tags,['Fiction','Neighbourhood','Part 2']);
  assert.equal(await ensureStarterEntries('alice',firestore),0);
});

test('reinitialization preserves an edit and does not restore a deleted starter',async()=>{
  const firestore=db();
  await ensureStarterEntries('alice',firestore);
  const editedId=targetId(ids[0]);
  const deletedId=targetId(ids[1]);
  const before=await getDoc(doc(firestore,'users/alice/entries',editedId));
  await updateDoc(doc(firestore,'users/alice/entries',editedId),{title:'My edit',body:'My revised ordinary entry.',updatedAt:serverTimestamp()});
  await assertSucceeds(deleteDoc(doc(firestore,'users/alice/entries',deletedId)));

  assert.equal(await ensureStarterEntries('alice',firestore),0);
  const edited=await getDoc(doc(firestore,'users/alice/entries',editedId));
  assert.equal(edited.data().title,'My edit');
  assert.equal(edited.data().body,'My revised ordinary entry.');
  assert.equal(edited.data().kind,before.data().kind);
  assert.equal(edited.data().createdAt.toMillis(),before.data().createdAt.toMillis());
  assert.equal(edited.data().protected,false);
  assert.equal((await getDoc(doc(firestore,'users/alice/entries',deletedId))).exists(),false);
});

test('a preexisting record at a starter ID is preserved while other starters are added',async()=>{
  const firestore=db();
  const existingId=targetId(ids[0]);
  await setDoc(doc(firestore,'users/alice/entries',existingId),{
    ownerId:'alice',title:'My existing entry',body:'Keep this content.',kind:'Story',protected:false,
    perspective:'first',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),
  });

  assert.equal(await ensureStarterEntries('alice',firestore),ids.length - 1);
  const existing=await getDoc(doc(firestore,'users/alice/entries',existingId));
  assert.equal(existing.data().title,'My existing entry');
  assert.equal(existing.data().body,'Keep this content.');
  assert.equal(existing.data().kind,'Story');
  for(const id of ids.slice(1)) assert.equal((await getDoc(doc(firestore,'users/alice/entries',targetId(id)))).exists(),true);
});
