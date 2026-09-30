#!/usr/bin/env node
/**
 * npm run photos
 *
 * Turns raw phone photos in photos-inbox/ into web-ready images in
 * public/photos/ and adds draft entries to src/content/showcase.json.
 *
 * For each photo it:
 *   - applies the camera's rotation, then resizes to at most 1600px
 *   - converts to WebP (typically 150–400 KB instead of 3–10 MB)
 *   - strips ALL metadata, including GPS location and device details
 *   - reads the date the photo was taken (before stripping) for the entry date
 *
 * Naming conventions (all optional):
 *   kitchen-cabinets-before.jpg + kitchen-cabinets-after.jpg -> one before/after pair
 *   kitchen-cabinets.jpg                                     -> a single progress photo
 *   A name starting with a room id (kitchen, living-room, bathroom, basement,
 *   exterior, master-bedroom, general) sets the room automatically.
 *
 * Originals are moved to photos-inbox/processed/ (git-ignored), never committed.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import exifReader from 'exif-reader';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const INBOX = path.join(ROOT, 'photos-inbox');
const PROCESSED = path.join(INBOX, 'processed');
const OUT_DIR = path.join(ROOT, 'public', 'photos');
const CONTENT = path.join(ROOT, 'src', 'content', 'showcase.json');

const MAX_SIZE = 1600;
const QUALITY = 80;
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);
const HEIC = new Set(['.heic', '.heif']);
const ROOMS = [
  'master-bedroom',
  'living-room',
  'exterior',
  'kitchen',
  'bathroom',
  'basement',
  'general',
];

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'photo';

const titleCase = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function takenDate(file, metadata) {
  try {
    const exif = metadata.exif ? exifReader(metadata.exif) : null;
    const taken = exif?.Photo?.DateTimeOriginal ?? exif?.Image?.DateTime;
    if (taken instanceof Date && !Number.isNaN(taken.getTime())) return isoDate(taken);
  } catch {
    // Unreadable EXIF: fall back to the file date.
  }
  return isoDate((await stat(file)).mtime);
}

function uniqueName(base) {
  let name = `${base}.webp`;
  for (let i = 2; existsSync(path.join(OUT_DIR, name)); i++) name = `${base}-${i}.webp`;
  return name;
}

// Default camera names carry no meaning: Pixel "PXL_20260929_164448478.RAW-01.MP.COVER",
// iPhone "IMG_1234", most cameras "DSC_0042". They get a placeholder title instead.
const CAMERA_NAME = /^(pxl|img|dsc|dscn|dscf|mvimg|photo|image|signal)[-_ ]?\d/i;

function parseName(file) {
  // Drop camera suffixes after the first dot (".RAW-01.MP.COVER", ".PORTRAIT", …).
  const base = path.parse(file).name.split('.')[0];
  const slug = slugify(base);
  const match = /^(.*?)-(before|after)$/.exec(slug);
  const key = match ? match[1] : slug;
  const role = match ? match[2] : 'single';
  const room = ROOMS.find((r) => key === r || key.startsWith(`${r}-`)) ?? 'general';
  const title = CAMERA_NAME.test(base) ? 'Untitled photo' : titleCase(key);
  return { slug, key, role, room, title };
}

async function main() {
  if (!existsSync(INBOX)) {
    await mkdir(INBOX, { recursive: true });
    console.log('Created photos-inbox/. Put your photos there and run `npm run photos` again.');
    return;
  }
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(PROCESSED, { recursive: true });

  const files = (await readdir(INBOX, { withFileTypes: true }))
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();

  const heic = files.filter((f) => HEIC.has(path.extname(f).toLowerCase()));
  const images = files.filter((f) => SUPPORTED.has(path.extname(f).toLowerCase()));
  const skipped = files.filter((f) => !heic.includes(f) && !images.includes(f));

  if (!images.length) {
    console.log('No photos to process in photos-inbox/.');
  }

  const groups = new Map();
  for (const file of images) {
    const source = path.join(INBOX, file);
    const info = parseName(file);
    const pipeline = sharp(source, { failOn: 'none' });
    const metadata = await pipeline.metadata();
    const date = await takenDate(source, metadata);
    const outName = uniqueName(info.slug);

    // sharp writes no metadata unless asked to, so EXIF/GPS is dropped here.
    const result = await pipeline
      .rotate()
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(path.join(OUT_DIR, outName));

    await rename(source, path.join(PROCESSED, file));

    const before = (await stat(path.join(PROCESSED, file))).size;
    console.log(
      `✔ ${file} → public/photos/${outName}  (${(before / 1e6).toFixed(1)} MB → ${(result.size / 1e3).toFixed(0)} KB, ${result.width}×${result.height})`,
    );

    const group = groups.get(info.key) ?? { ...info, date };
    group[info.role] = `photos/${outName}`;
    if (date > group.date) group.date = date;
    groups.set(info.key, group);
  }

  const content = JSON.parse(await readFile(CONTENT, 'utf8'));
  const existingIds = new Set(content.photos.map((p) => p.id));
  const added = [];

  for (const g of groups.values()) {
    // A lone "-before" with no "-after" is treated as a single photo.
    const after = g.after ?? g.single ?? g.before;
    const beforeUrl = g.after || g.single ? (g.before ?? '') : '';
    let id = `pub-${g.key}`;
    for (let i = 2; existingIds.has(id); i++) id = `pub-${g.key}-${i}`;
    existingIds.add(id);
    const entry = {
      id,
      room: g.room,
      title: g.title,
      description: '',
      beforeUrl,
      afterUrl: after,
      date: g.date,
    };
    content.photos.unshift(entry);
    added.push(entry);
  }

  if (added.length) {
    await writeFile(CONTENT, `${JSON.stringify(content, null, 2)}\n`);
    console.log(
      `\nAdded ${added.length} draft entr${added.length === 1 ? 'y' : 'ies'} to src/content/showcase.json:`,
    );
    for (const e of added) {
      console.log(`  • ${e.title}  [${e.room}, ${e.date}${e.beforeUrl ? ', before/after' : ''}]`);
    }
    console.log(
      '\nNext: edit the titles, rooms and descriptions, preview with `npm run dev`, then commit.',
    );
  }

  if (heic.length) {
    console.warn(
      `\n⚠ Skipped ${heic.length} HEIC file(s): ${heic.join(', ')}\n` +
        '  Convert them to JPEG first (on iPhone: Settings → Camera → Formats → Most Compatible,\n' +
        '  or export/share as JPEG; on a Mac: open in Preview → File → Export → JPEG).',
    );
  }
  if (skipped.length) console.warn(`\n⚠ Ignored unsupported files: ${skipped.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
