import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateCaptureWriter } from '../src/services/privateQuickCapture.ts';
import { LocalVault } from '../src/services/vault/localVault.ts';
import { LocalMediaVault } from '../src/services/vault/localMediaVault.ts';
import { readPrivateText } from '../src/services/privateCapture.ts';

test('account capture creates private records without exposing a read API; reading requires a verified session', async () => {
  let accountActive = true;
  const writer = createPrivateCaptureWriter('quick-test-owner', () => accountActive);
  assert.deepEqual(Object.keys(writer).sort(), ['media', 'text']);
  await writer.text('Synthetic quick capture.');
  await writer.media(new Blob(['synthetic'], {type:'image/png'}), {mediaId:'quick-test-image',source:'file'});
  const locked = {ownerId:'quick-test-owner',generation:()=>1,isUnlocked:()=>false};
  assert.throws(() => new LocalVault(locked));
  assert.throws(() => new LocalMediaVault(locked));
  const verified = {ownerId:'quick-test-owner',generation:()=>1,isUnlocked:()=>true};
  const records = await new LocalVault(verified).listRecords();
  assert.equal(readPrivateText(records[0]).body, 'Synthetic quick capture.');
  assert.equal((await new LocalMediaVault(verified).get('quick-test-image')).blob.size, 9);
  const other = {ownerId:'another-quick-test-owner',generation:()=>1,isUnlocked:()=>true};
  assert.equal((await new LocalVault(other).listRecords()).length, 0);
  assert.equal((await new LocalMediaVault(other).list()).length, 0);
  accountActive = false;
  await assert.rejects(() => writer.text('Must not save after sign-out.'));
  await assert.rejects(() => writer.media(new Blob(['x'], {type:'image/png'}), {source:'file'}));
});
