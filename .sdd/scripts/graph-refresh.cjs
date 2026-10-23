#!/usr/bin/env node
// Portable derived graph: no packages, inference, uploads or specification mutations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=fs.realpathSync(process.argv[2] || process.cwd()),sdd=path.join(root,'.sdd');
if(!fs.existsSync(sdd)) throw Error('Project has no .sdd directory');
const nodes=[],edges=[],ids=new Set(),hash=crypto.createHash('sha256');
const add=(id,label,type,source)=>{if(!ids.has(id)){ids.add(id);nodes.push({id,label,type,source});}};
const link=(from,to,label)=>edges.push({from,to,label,provenance:'EXTRACTED'});
for(const scope of ['active','backlog','archive']) {
 const dir=path.join(sdd,'specs',scope);if(!fs.existsSync(dir))continue;
 for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
  if(!entry.isDirectory())continue;
  const phase=entry.name;add(phase,phase,'phase',`.sdd/specs/${scope}/${phase}`);
  const folder=path.join(dir,phase),metadata=path.join(folder,'phase.json');
  if(fs.existsSync(metadata) && !fs.lstatSync(metadata).isSymbolicLink()) {try {const raw=fs.readFileSync(metadata,'utf8');hash.update(raw);const data=JSON.parse(raw);for(const dep of data.dependencies || data.dependsOn || []) if(typeof dep==='string')link(dep,phase,'prerequisite');}catch{}}
  for(const name of ['requirements.md','design.md','tasks.md']) {
   const file=path.join(folder,name);if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>2*1024*1024)continue;
   const content=fs.readFileSync(file,'utf8'),source=path.relative(root,file);hash.update(source).update(content);
   const artifact=phase+'/'+name;add(artifact,name,'artifact',source);link(phase,artifact,'contains');
   if(name==='requirements.md')for(const match of content.matchAll(/\bREQ[- ]\d+(?:\.\d+)?\b/g)){const id=phase+'/'+match[0];add(id,match[0],'requirement',source);link(artifact,id,'declares');}
   if(name==='tasks.md')for(const line of content.split('\n')){const task=line.match(/^\s*- \[[ xX/]\].*?\b(T\d+\.\d+|Task \d+-\d+)\b/);if(!task)continue;const id=phase+'/'+task[1];add(id,task[1],'task',source);link(artifact,id,'declares');for(const req of line.matchAll(/\bREQ[- ]\d+(?:\.\d+)?\b/g))link(id,phase+'/'+req[0],'references');}
  }
 }
}
const seenEdges=new Set();
const uniqueEdges=edges.filter(e=>{const key=[e.from,e.to,e.label].join('\0');if(seenEdges.has(key))return false;seenEdges.add(key);return true;});
const graph={source:'sdd-derived',generatedAt:new Date().toISOString(),sourceRevision:hash.digest('hex'),nodes,edges:uniqueEdges.filter(e=>ids.has(e.from)&&ids.has(e.to))};
const out=path.join(sdd,'graphs');if(fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())throw Error('Refusing symlink graph directory');fs.mkdirSync(out,{recursive:true});const target=path.join(out,'framework.json');if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('Refusing symlink graph output');
fs.writeFileSync(target+'.tmp',JSON.stringify(graph,null,2)+'\n',{flag:'wx'});fs.renameSync(target+'.tmp',target);
console.log(`SDD graph refreshed: ${nodes.length} nodes / ${graph.edges.length} links → .sdd/graphs/framework.json`);
