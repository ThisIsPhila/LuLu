import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptRecoveryFile,decryptRecoveryFile,MAX_RECOVERY_PAYLOAD_BYTES} from '../src/services/recoveryFileCrypto.ts';
const unlocked=()=>{};
const phrase='  a long recovery phrase 🌻  ';

test('recovery file preserves arbitrary bytes and Unicode without depending on a browser device key',async()=>{
  const bytes=new Uint8Array([0,255,128,10,1,...new TextEncoder().encode('Original words — isiZulu 🌻')]);
  const encrypted=await encryptRecoveryFile(new Blob([bytes]),phrase,unlocked);
  assert.equal(encrypted.type,'application/octet-stream');
  assert.equal(encrypted.size,bytes.length+56);
  const recovered=await decryptRecoveryFile(encrypted,phrase,unlocked);
  assert.deepEqual(new Uint8Array(await recovered.arrayBuffer()),bytes);
  assert.equal((await encrypted.text()).includes('Original words'),false);
  await assert.rejects(decryptRecoveryFile(encrypted,phrase.trim(),unlocked),/could not be opened/);
});

test('each encrypted file has fresh salt/IV, and wrong passphrases or altered bytes fail authentication',async()=>{
  const payload=new Blob(['private original']);
  const first=await encryptRecoveryFile(payload,phrase,unlocked);
  const second=await encryptRecoveryFile(payload,phrase,unlocked);
  const a=new Uint8Array(await first.arrayBuffer()), b=new Uint8Array(await second.arrayBuffer());
  assert.notDeepEqual(a.slice(12,40),b.slice(12,40));
  await assert.rejects(decryptRecoveryFile(first,'a different recovery phrase',unlocked),/could not be opened/);
  for(const offset of [12,28,40,a.length-1]){
    const changed=a.slice();changed[offset]^=1;
    await assert.rejects(decryptRecoveryFile(new Blob([changed]),phrase,unlocked),/could not be opened/);
  }
});

test('hostile KDF headers and invalid sizes/passphrases are rejected',async()=>{
  const valid=new Uint8Array(await (await encryptRecoveryFile(new Blob(['one']),phrase,unlocked)).arrayBuffer());
  valid[8]=255;
  await assert.rejects(decryptRecoveryFile(new Blob([valid]),phrase,unlocked),/Unsupported/);
  await assert.rejects(decryptRecoveryFile(new Blob(['truncated']),phrase,unlocked),/size/);
  await assert.rejects(encryptRecoveryFile(new Blob([]),phrase,unlocked),/payload/);
  await assert.rejects(encryptRecoveryFile(new Blob(['one']),'short',unlocked),/passphrase/);
  await assert.rejects(encryptRecoveryFile(new Blob(['one']),'long phrase \ud800 broken',unlocked),/Unicode/);
  class TooLarge extends Blob { get size(){return MAX_RECOVERY_PAYLOAD_BYTES+1;} async arrayBuffer(){throw new Error('must not read');} }
  await assert.rejects(encryptRecoveryFile(new TooLarge(),phrase,unlocked),/payload/);
});

test('lock after asynchronous work prevents encrypted or decrypted results from escaping',async()=>{
  const payload=new Blob(['secret bytes']);
  let checks=0;
  await assert.rejects(encryptRecoveryFile(payload,phrase,()=>{if(++checks===3)throw new Error('locked');}),/locked/);
  const file=await encryptRecoveryFile(payload,phrase,unlocked);
  checks=0;
  await assert.rejects(decryptRecoveryFile(file,phrase,()=>{if(++checks===6)throw new Error('locked');}),/locked/);
});
