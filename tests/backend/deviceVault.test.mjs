import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptPrivate,decryptPrivate} from '../../src/services/backend/deviceVault.ts';
test('originals round-trip without plaintext in envelope and use fresh nonces',async()=>{
 const original={originalBody:'Private original text',title:'Source title',entities:[{original:'name'}]};
 const first=await encryptPrivate('alice','one',original),second=await encryptPrivate('alice','one',original);
 assert.notEqual(first.iv,second.iv);assert.ok(!JSON.stringify(first).includes('Private original'));
 assert.deepEqual(await decryptPrivate('alice','one',first),original);
 await assert.rejects(()=>decryptPrivate('alice','two',first));
 await assert.rejects(()=>decryptPrivate('bob','one',first));
 await assert.rejects(()=>decryptPrivate('alice','one',{...first,ciphertext:'a'.repeat(44)}));
});
test('concurrent saves retain one account key',async()=>{
 const records=await Promise.all(Array.from({length:4},(_,i)=>encryptPrivate('concurrent',String(i),{i})));
 for(let i=0;i<records.length;i++)assert.deepEqual(await decryptPrivate('concurrent',String(i),records[i]),{i});
});
