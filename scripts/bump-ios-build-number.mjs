import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectPath = fileURLToPath(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url));
const project = readFileSync(projectPath, 'utf8');
const versions = [...project.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((match) => Number(match[1]));

if (versions.length < 2 || new Set(versions).size !== 1) {
  throw new Error(`Expected matching iOS build numbers in ${projectPath}; found: ${versions.join(', ') || 'none'}`);
}

const nextVersion = versions[0] + 1;
const updated = project.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextVersion};`);
writeFileSync(projectPath, updated);
console.log(`iOS build number: ${versions[0]} → ${nextVersion}`);
