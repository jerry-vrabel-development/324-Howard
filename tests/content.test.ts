import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPublishedPhotos, resolveAssetPath } from '../src/content/published';
import content from '../src/content/showcase.json';
import { toPhoto } from '../src/store/validate';
import { parseHomeContent } from '../src/content/home';
import homeContent from '../src/content/home.json';

/**
 * Guards the committed showcase: CI fails if an entry is malformed or points
 * at an image that isn't in public/, instead of a broken card going live.
 */
describe('src/content/showcase.json', () => {
  const entries: unknown[] = content.photos;

  it('has only valid entries', () => {
    const invalid = entries.filter((e) => toPhoto(e) === null);
    expect(invalid, 'Check room, date (YYYY-MM-DD), id and title').toEqual([]);
  });

  it('has unique ids', () => {
    const ids = entries.map((e) => (e as { id: string }).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references images that exist in public/', () => {
    const missing = entries
      .flatMap((e) => {
        const { beforeUrl, afterUrl } = e as { beforeUrl: string; afterUrl: string };
        return [beforeUrl, afterUrl];
      })
      .filter((p) => p && !/^https?:/.test(p))
      .filter((p) => !existsSync(path.join('public', p)));
    expect(missing).toEqual([]);
  });

  it('has an after image for every entry', () => {
    expect(entries.filter((e) => !(e as { afterUrl: string }).afterUrl)).toEqual([]);
  });
});

describe('published photos', () => {
  it('resolves repo paths against the base URL and leaves full URLs alone', () => {
    expect(resolveAssetPath('photos/a.webp', '/324-Howard/')).toBe('/324-Howard/photos/a.webp');
    expect(resolveAssetPath('/photos/a.webp', '/')).toBe('/photos/a.webp');
    expect(resolveAssetPath('https://x.com/a.jpg', '/324-Howard/')).toBe('https://x.com/a.jpg');
    expect(resolveAssetPath('', '/')).toBe('');
  });

  it('marks entries as published and read-only', () => {
    const photos = loadPublishedPhotos([
      {
        id: 'pub-a',
        room: 'kitchen',
        title: 'A',
        description: '',
        beforeUrl: '',
        afterUrl: 'photos/a.webp',
        date: '2026-05-14',
      },
      { id: 'bad' },
    ]);
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ published: true, afterUrl: '/photos/a.webp' });
  });
});

describe('src/content/home.json', () => {
  it('parses without dropping anything', () => {
    const raw = homeContent as { map: { places: unknown[]; house: unknown } };
    const parsed = parseHomeContent();
    expect(parsed.map.places).toHaveLength(raw.map.places.length);
    if (raw.map.house !== null)
      expect(parsed.map.house, 'house needs numeric lat/lng').not.toBeNull();
  });

  it('only references hero files that exist in public/', () => {
    const { hero } = parseHomeContent();
    const missing = [hero.video, hero.poster].filter(
      (p) => p && !existsSync(path.join('public', p)),
    );
    expect(missing).toEqual([]);
  });

  it('rejects coordinates that are out of range or not numbers', () => {
    const parsed = parseHomeContent({
      map: { house: { lat: '41.6', lng: -87.2 }, places: [{ name: 'x', lat: 200, lng: 0 }] },
    });
    expect(parsed.map.house).toBeNull();
    expect(parsed.map.places).toEqual([]);
  });
});
