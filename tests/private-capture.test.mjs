import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { LocalVault } from '../src/services/vault/localVault.ts';
import { capturePrivateText, readPrivateText, revisePrivateText } from '../src/services/privateCapture.ts';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

beforeEach(async () => {
  for (const name of ['lulu.local-vault.v1', 'lulu.device-vault.v1']) {
    await new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);
      request.onsuccess=resolve;request.onerror=()=>reject(request.error);
    });
  }
});

test('private text capture and revision survive a new vault instance without network', async () => {
  const oldFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Private capture must not make a network request');};
  try {
    let epoch=1;
    const session={ownerId:'capture-owner',generation:()=>epoch,isUnlocked:()=>true};
    const vault=new LocalVault(session);
    const source=await capturePrivateText(vault,'Incwadi','Ngibhala lapha.\n\nKe ngola mona. 🌿');
    const edited=await revisePrivateText(vault,source,'Incwadi','A later annotation.');
    epoch++;
    await assert.rejects(()=>vault.listRecords());
    const reopened=new LocalVault(session);
    const records=await reopened.listRecords();
    assert.equal(records.length,1);
    assert.equal(readPrivateText(records[0]).body,'A later annotation.');
    assert.equal(records[0].revisionId,edited.revisionId);
    const history=await reopened.listRevisions(source.recordId);
    assert.equal(readPrivateText(history[0]).body,'Ngibhala lapha.\n\nKe ngola mona. 🌿');
    assert.deepEqual(readPrivateText(history[0]).languages,[]);
    assert.equal(history[1].parentRevisionId,source.revisionId);
  } finally {globalThis.fetch=oldFetch;}
});

test('invalid private capture does not create a record',async()=>{
  const vault=new LocalVault({ownerId:'capture-owner',generation:()=>1,isUnlocked:()=>true});
  await assert.rejects(()=>capturePrivateText(vault,'title','  '));
  await assert.rejects(()=>capturePrivateText(vault,'x'.repeat(201),'body'));
  assert.deepEqual(await vault.listRecords(),[]);
});
