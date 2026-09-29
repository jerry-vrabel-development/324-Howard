import type { Photo } from '../types';
import { toPhoto } from '../store/validate';
import content from './showcase.json';

/**
 * Photos committed to the repo and deployed with the site, so every visitor
 * sees them. Add them with `npm run photos` (see README → Adding photos).
 *
 * Image paths in showcase.json are relative to /public ("photos/x.webp") and
 * are resolved against Vite's base URL, so they work both locally and under
 * /324-Howard/ on GitHub Pages. Full http(s) URLs are left alone.
 */

export function resolveAssetPath(path: string, base: string = import.meta.env.BASE_URL): string {
  if (!path || /^(https?:|data:)/i.test(path)) return path;
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`;
}

export function loadPublishedPhotos(raw: unknown = content.photos): Photo[] {
  if (!Array.isArray(raw)) return [];
  const photos: Photo[] = [];
  for (const entry of raw) {
    const photo = toPhoto(entry);
    if (!photo) {
      if (import.meta.env.DEV) console.warn('Skipping invalid entry in showcase.json', entry);
      continue;
    }
    photos.push({
      ...photo,
      beforeUrl: resolveAssetPath(photo.beforeUrl),
      afterUrl: resolveAssetPath(photo.afterUrl),
      published: true,
    });
  }
  return photos;
}
