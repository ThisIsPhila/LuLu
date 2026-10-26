import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = 'dist/app';
const forbidden = /(^|\/)(demo|docs\/hackathon|docs\/testing|tests?)(\/|$)|\.test\.[cm]?[jt]sx?$/i;
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(root);
if (!files.some(path => relative(root, path) === 'index.html')) throw new Error('The LuLu app package has no index.html.');
const leaked = files.map(path => relative(root, path).replaceAll('\\', '/')).filter(path => forbidden.test(path));
if (leaked.length) throw new Error(`Demo, review, or test content entered dist/app: ${leaked.join(', ')}`);
const html = await readFile(join(root, 'index.html'), 'utf8');
if (/https?:\/\/(?!khora-lulu-2026\.(?:web|firebase)app\.com)/i.test(html)) {
  throw new Error('The app shell contains a remote server URL instead of only local web assets.');
}
console.log(`Verified ${files.length} bundled LuLu app files; demo, review, and test fixture paths are absent.`);
