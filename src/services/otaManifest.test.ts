import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {parseUpdateManifest, compareUpdateVersions} from './otaManifest.ts';
const valid={version:'1.0.1',nativeVersion:'1.0',url:'https://lulu.thisisphila.co.za/updates/lulu-1.0.1.zip',checksum:'signed',sessionKey:'signed'};
test('only complete signed metadata on the LuLu update host is accepted',()=>{
 assert.ok(parseUpdateManifest(valid));
 assert.equal(parseUpdateManifest({...valid,url:'https://example.com/update.zip'}),null);
 assert.equal(parseUpdateManifest({...valid,checksum:''}),null);
 assert.equal(parseUpdateManifest({...valid,sessionKey:''}),null);
 assert.equal(parseUpdateManifest({status:'none'}),null);
});
test('version comparisons do not offer the same or an older release',()=>{
 assert.ok(compareUpdateVersions('1.0.1','1.0')>0);
 assert.equal(compareUpdateVersions('1.0.1','1.0.1'),0);
 assert.ok(compareUpdateVersions('1.0.0','1.0.1')<0);
});
