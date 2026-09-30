#!/usr/bin/env node
/**
 * npm run photos:prune
 *
 * Removes entries from src/content/showcase.json whose image files no longer
 * exist in public/ (for example after renaming photos and running
 * `npm run photos` again).
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT = path.join(ROOT, 'src', 'content', 'showcase.json');

const exists = (p) => !p || /^https?:/.test(p) || existsSync(path.join(ROOT, 'public', p));

const content = JSON.parse(await readFile(CONTENT, 'utf8'));
const removed = content.photos.filter((e) => !exists(e.afterUrl) || !exists(e.beforeUrl));
content.photos = content.photos.filter((e) => !removed.includes(e));

if (removed.length) {
  await writeFile(CONTENT, `${JSON.stringify(content, null, 2)}\n`);
  for (const e of removed) console.log(`✖ removed "${e.title}" (${e.afterUrl})`);
}
console.log(`${removed.length} removed, ${content.photos.length} left.`);
