#!/usr/bin/env node
// Optional community package interoperability. No downloaded code is executed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const validName = name => typeof name === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name);
const profiles = ['general','web','api','mobile','cli','full-stack','monorepo'];
function validate(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'sdd-pack.json'),'utf8'));
  if (manifest.schemaVersion !== 1 || !validName(manifest.name) || !Array.isArray(manifest.skills) || !manifest.skills.length || manifest.skills.length > 100 || new Set(manifest.skills).size !== manifest.skills.length || manifest.skills.some(name => !validName(name))) throw new Error('Invalid sdd-pack.json schema');
  const composition = String(manifest.profile || 'general').split('+');
  if (!profiles.includes(composition[0]) || composition.slice(1).some(name => !['devsecops','devops','mlops'].includes(name))) throw new Error('Unsupported profile composition');
  if (!fs.existsSync(path.join(root,'SKILL.md'))) throw new Error('Pack requires SKILL.md');
  for (const name of manifest.skills) {
    const content = fs.readFileSync(path.join(root,'skills',name,'SKILL.md'),'utf8');
    if (!/^---\r?\n/.test(content) || !/^name:\s*\S+/m.test(content) || !/^description:\s*\S+/m.test(content)) throw new Error(`Invalid skill frontmatter: ${name}`);
  }
  return manifest;
}
function files(root, prefix = '', list = []) {
  for (const item of fs.readdirSync(path.join(root,prefix),{withFileTypes:true})) {
    const relative = path.join(prefix,item.name), full = path.join(root,relative);
    if (item.isSymbolicLink()) throw new Error('Packages cannot include symlinks');
    if (item.isDirectory()) files(root,relative,list);
    else if (item.isFile()) {
      if (list.length >= 2000 || fs.statSync(full).size > 4*1024*1024) throw new Error('Package exceeds file limits');
      list.push(relative);
    } else throw new Error('Unsupported package file');
  }
  return list.sort();
}
function digest(root) {
  const hash = crypto.createHash('sha256');
  for (const file of files(root)) { hash.update(file.split(path.sep).join('/')); hash.update(fs.readFileSync(path.join(root,file))); }
  return hash.digest('hex');
}
function install(source, projectRoot, update) {
  source = fs.realpathSync(source); projectRoot = fs.realpathSync(projectRoot);
  if (!fs.statSync(path.join(projectRoot,'.sdd')).isDirectory()) throw new Error('Target must be an SDD project');
  for (const target of ['.sdd', 'skills']) {
    const folder = path.join(projectRoot, target);
    if (fs.existsSync(folder)) { const relative = path.relative(projectRoot, fs.realpathSync(folder)); if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Target directory escapes project'); }
  }
  const manifest = validate(source); files(source);
  const lockDir = path.join(projectRoot,'.sdd/skill-packs');
  const lockPath = path.join(lockDir,manifest.name+'.json');
  const previous = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath,'utf8')) : null;
  const changes = [];
  for (const name of manifest.skills) {
    const from = path.join(source,'skills',name), to = path.join(projectRoot,'skills',name);
    const hash = digest(from);
    if (fs.existsSync(to)) {
      const relative = path.relative(projectRoot, fs.realpathSync(to));
      if (relative.startsWith('..') || path.isAbsolute(relative) || fs.lstatSync(to).isSymbolicLink()) throw new Error('Installed skill escapes project or is linked');
      if (digest(to) === hash) { changes.push({name,hash}); continue; }
      if (!update || !previous?.installed?.some(record => record.name === name && record.hash === digest(to))) throw new Error(`Refusing to overwrite local/unmanaged skill ${name}; --update only replaces unchanged managed installations`);
    }
    changes.push({name,hash,from,to});
  }
  for (const change of changes.filter(item => item.from)) {
    fs.mkdirSync(path.dirname(change.to),{recursive:true});
    const staging = change.to+'.sdd-staging-'+process.pid;
    fs.cpSync(change.from,staging,{recursive:true,errorOnExist:true,force:false});
    fs.rmSync(change.to,{recursive:true,force:true}); fs.renameSync(staging,change.to);
  }
  fs.mkdirSync(lockDir,{recursive:true});
  const record = {...manifest,source,installed:changes.map(({name,hash})=>({name,hash})),updatedAt:new Date().toISOString()};
  const temp = lockPath+'.tmp'; fs.writeFileSync(temp,JSON.stringify(record,null,2)+'\n'); fs.renameSync(temp,lockPath);
  return record;
}
if (require.main === module) {
  try {
    const [command, source, ...args] = process.argv.slice(2);
    if (!source || !['validate','install'].includes(command)) throw new Error('Usage: skill-pack.cjs validate <folder> | install <folder> [--project <root>] [--update]');
    const projectIndex = args.indexOf('--project');
    const result = command === 'validate' ? validate(fs.realpathSync(source)) : install(source,projectIndex >= 0 ? args[projectIndex+1] : process.cwd(),args.includes('--update'));
    console.log(JSON.stringify(result,null,2));
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
module.exports = { validate, install, digest };
