/** Downloads public model artifacts only; writes outside the app bundle. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const source = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(process.argv[2] || '/tmp/lulu-privacy-spike');
if (target === source || target.startsWith(path.resolve(source,'../..') + path.sep)) throw Error('Use an isolated directory outside the repository');
const manifest = JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
await fs.mkdir(target,{recursive:true});
for(const name of ['index.html','main.js','gliner-codec.mjs','package.json','package-lock.json']) await fs.copyFile(path.join(source,name),path.join(target,name));
for(const artifact of manifest.artifacts) {
  const destination=path.join(target,artifact.name);
  const valid=bytes=>bytes.length===artifact.bytes&&createHash('sha256').update(bytes).digest('hex')===artifact.sha256;
  try { if(valid(await fs.readFile(destination))) { console.log(`Verified ${artifact.name}`); continue; } } catch {}
  console.log(`Downloading ${artifact.name} (${artifact.bytes} bytes)`);
  const response=await fetch(artifact.url);
  if(!response.ok) throw Error(`Download failed: ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(!valid(bytes)) throw Error(`Integrity mismatch: ${artifact.name}`);
  await fs.writeFile(destination+'.partial',bytes);
  await fs.rename(destination+'.partial',destination);
}
