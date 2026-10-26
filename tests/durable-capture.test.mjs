import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {LocalVault} from '../src/services/vault/localVault.ts';
import {createPrivateDraftAutosave} from '../src/services/privateDraftAutosave.ts';

globalThis.indexedDB=indexedDB;globalThis.IDBKeyRange=IDBKeyRange;
beforeEach(async()=>{
  for(const name of ['lulu.local-vault.v1','lulu.device-vault.v1']) await new Promise((resolve,reject)=>{
    const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);
  });
});
const text=body=>({format:'lulu-private-text-v1',mediaType:'text/plain',title:'',body,languages:[]});
function session() {
  const state={generation:1,unlocked:true};
  return {state,value:{ownerId:'durable-owner',generation:()=>state.generation,isUnlocked:()=>state.unlocked}};
}

test('acknowledged autosave reopens only through a fresh unlocked session and promotes exact text',async()=>{
  const {state,value}=session();
  const vault=new LocalVault(value);
  const statuses=[];
  const writer=createPrivateDraftAutosave({vault,draftId:'draft',expectedVersion:null,onStatus:status=>statuses.push(status.state)});
  const exact='  Ngibhala lapha 🌿\r\n\r\nKe ngola mona.  ';
  writer.acceptSnapshot(text(exact));await writer.flush();
  assert.equal(writer.status.state,'saved');
  assert.equal((await vault.listRecords()).length,0,'autosave must not create evidence originals');
  writer.stop();state.unlocked=false;state.generation++;
  await assert.rejects(()=>vault.getDraft('draft'));
  assert.throws(()=>new LocalVault(value));
  state.unlocked=true;
  const reopened=new LocalVault(value),draft=await reopened.getDraft('draft');
  assert.equal(draft.content.body,exact);
  const resumed=createPrivateDraftAutosave({vault:reopened,draftId:draft.draftId,expectedVersion:draft.version,initialContent:draft.content});
  const original=await resumed.finalize();
  assert.equal(original.content.body,exact);
  assert.equal(await reopened.getDraft('draft'),null);
  assert.equal((await reopened.listRecords()).length,1);
  assert.ok(statuses.includes('saving'));
});

test('exit drops queued changes and late callbacks, preserving the last completed encrypted snapshot',async()=>{
  const {state,value}=session();const vault=new LocalVault(value);
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  const store={
    saveDraft:async input=>{if(input.content.body==='uncommitted')await held;return vault.saveDraft(input);},
    getDraft:id=>vault.getDraft(id),listDrafts:()=>vault.listDrafts(),finalizeDraft:input=>vault.finalizeDraft(input),
  };
  const statuses=[];
  const writer=createPrivateDraftAutosave({vault:store,draftId:'draft',expectedVersion:null,onStatus:status=>statuses.push(status.state)});
  writer.acceptSnapshot(text('committed'));await writer.flush();
  writer.acceptSnapshot(text('uncommitted'));
  const pending=writer.flush();
  writer.stop();state.generation++;state.unlocked=false;
  const count=statuses.length;
  release();await assert.rejects(pending);
  // Drain the rejected in-flight operation; the old generation must not commit it.
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(statuses.length,count);
  state.unlocked=true;
  assert.equal((await new LocalVault(value).getDraft('draft')).content.body,'committed');
});

test('a lost finalization acknowledgement leaves exactly one record and no orphan draft',async()=>{
  const {value}=session();const vault=new LocalVault(value);
  const store={
    saveDraft:input=>vault.saveDraft(input),getDraft:id=>vault.getDraft(id),listDrafts:()=>vault.listDrafts(),
    getRevision:(recordId,revisionId)=>vault.getRevision(recordId,revisionId),
    finalizeDraft:async input=>{await vault.finalizeDraft(input);throw new DOMException('Interrupted after commit','AbortError');},
  };
  const writer=createPrivateDraftAutosave({vault:store,draftId:'draft',expectedVersion:null});
  writer.acceptSnapshot(text('original'));
  const saved=await writer.finalize();
  assert.equal(saved.content.body,'original');
  assert.equal(writer.status.state,'finalized');
  await assert.rejects(()=>writer.finalize());
  assert.equal((await vault.listRecords()).length,1);
  assert.equal((await vault.listRevisions('draft')).length,1);
  assert.equal((await vault.listDrafts()).length,0);
});

test('recovered edit autosaves then appends while exact original remains unchanged',async()=>{
  const {state,value}=session();let vault=new LocalVault(value);
  const original=await vault.createOriginal({recordId:'record',revisionId:'original',provenance:'user-authored',content:text('first saved bytes')});
  const writer=createPrivateDraftAutosave({vault,draftId:'edit',expectedVersion:null,target:{recordId:'record',parentRevisionId:'original'}});
  writer.acceptSnapshot(text('revised'));await writer.flush();writer.stop();state.generation++;
  vault=new LocalVault(value);const draft=await vault.getDraft('edit');
  const resumed=createPrivateDraftAutosave({vault,draftId:'edit',expectedVersion:draft.version,initialContent:draft.content,target:draft.target});
  await resumed.finalize();
  assert.deepEqual((await vault.getRevision('record','original')).content,original.content);
  assert.deepEqual((await vault.listRevisions('record')).map(row=>row.content.body),['first saved bytes','revised']);
});
