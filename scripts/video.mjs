#!/usr/bin/env node
/**
 * npm run video -- <clip> [--start 5] [--duration 12]
 *
 * Turns a phone video into the Home page background:
 *   public/video/hero.mp4          H.264, 1280px wide, no audio, ~2–6 MB
 *   public/video/hero-poster.webp  first frame, shown while loading and for
 *                                  people who prefer reduced motion
 * and points src/content/home.json at them.
 *
 * All metadata is removed, including the GPS location phones embed in video.
 * Uses the ffmpeg binary bundled with the ffmpeg-static package, so nothing
 * needs installing system-wide.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'video');
const CONTENT = path.join(ROOT, 'src', 'content', 'home.json');
const VIDEO = path.join(OUT_DIR, 'hero.mp4');
const POSTER = path.join(OUT_DIR, 'hero-poster.webp');
const POSTER_TMP = path.join(OUT_DIR, 'hero-poster.tmp.png');

const WIDTH = 1280;
const DEFAULT_DURATION = 15;

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)),
    );
  });
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      start: { type: 'string', default: '0' },
      duration: { type: 'string', default: String(DEFAULT_DURATION) },
    },
  });

  const input = positionals[0];
  if (!input) {
    console.log('Usage: npm run video -- path/to/clip.mp4 [--start 5] [--duration 12]');
    process.exit(1);
  }
  if (!existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }
  if (!ffmpegPath) {
    console.error('The bundled ffmpeg binary is missing. Run `npm install` and try again.');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const start = Number(values.start) || 0;
  const duration = Number(values.duration) || DEFAULT_DURATION;

  console.log(`Encoding ${duration}s from ${start}s of ${path.basename(input)}…`);
  // prettier-ignore
  await run([
    '-ss', String(start),
    '-t', String(duration),
    '-i', input,
    '-an', // no audio track: background video is always muted
    '-vf', `scale='min(${WIDTH},iw)':-2,fps=30`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '27',
    '-pix_fmt', 'yuv420p', // plays everywhere, including Safari
    '-movflags', '+faststart', // starts playing before the whole file downloads
    '-map_metadata', '-1', // drop GPS location, device and date metadata
    '-map_chapters', '-1',
    VIDEO,
  ]);

  await run(['-i', VIDEO, '-frames:v', '1', POSTER_TMP]);
  const posterInfo = await sharp(POSTER_TMP).webp({ quality: 75 }).toFile(POSTER);
  await rm(POSTER_TMP);

  const content = JSON.parse(await readFile(CONTENT, 'utf8'));
  content.hero = { video: 'video/hero.mp4', poster: 'video/hero-poster.webp' };
  await writeFile(CONTENT, `${JSON.stringify(content, null, 2)}\n`);

  const inMb = (await stat(input)).size / 1e6;
  const outMb = (await stat(VIDEO)).size / 1e6;
  console.log(`✔ public/video/hero.mp4  (${inMb.toFixed(1)} MB → ${outMb.toFixed(1)} MB)`);
  console.log(`✔ public/video/hero-poster.webp  (${posterInfo.width}×${posterInfo.height})`);
  if (posterInfo.height > posterInfo.width) {
    console.warn(
      '⚠ This clip is portrait. It will be cropped heavily on wide screens; a landscape clip works best.',
    );
  }
  if (outMb > 8) {
    console.warn('⚠ Over 8 MB. Try a shorter --duration so the page loads quickly on phones.');
  }
  console.log('\nUpdated src/content/home.json. Preview with `npm run dev`, then commit.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
