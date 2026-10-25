import { access } from 'node:fs/promises';

// Firebase publishes only the main application. The interactive preview, old
// prototype, and internal review library belong to local development only.
for (const path of ['demo', 'docs', 'legacy.html']) {
  let exists = false;
  try { await access(new URL(`../dist/app/${path}`, import.meta.url)); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) throw new Error(`Hosting output contains development-only material: ${path}. Rebuild the main app before deploying.`);
}
console.log('Main app hosting output verified; demo and internal documents excluded.');
