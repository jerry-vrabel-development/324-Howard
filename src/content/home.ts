import content from './home.json';

/**
 * Settings for the Home page, kept in home.json so they can be changed
 * without touching code:
 *
 * - hero.video / hero.poster: filled in by `npm run video` (paths relative to /public).
 * - map.house: the pin for the house, { "lat": 41.6, "lng": -87.2 }. Leave null to
 *   show the neighborhood without a house pin.
 * - map.places: nearby points of interest.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  name: string;
  note: string;
}

export interface HomeContent {
  hero: { video: string; poster: string };
  map: { zoom: number; house: LatLng | null; places: Place[] };
}

const isCoord = (v: unknown, limit: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;

export function isLatLng(v: unknown): v is LatLng {
  if (typeof v !== 'object' || v === null) return false;
  const { lat, lng } = v as Record<string, unknown>;
  return isCoord(lat, 90) && isCoord(lng, 180);
}

export function parseHomeContent(raw: unknown = content): HomeContent {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const hero = (data.hero ?? {}) as Record<string, unknown>;
  const map = (data.map ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const places = Array.isArray(map.places) ? map.places : [];

  return {
    hero: { video: str(hero.video), poster: str(hero.poster) },
    map: {
      zoom: isCoord(map.zoom, 19) && (map.zoom as number) >= 1 ? (map.zoom as number) : 14,
      house: isLatLng(map.house) ? { lat: map.house.lat, lng: map.house.lng } : null,
      places: places
        .filter((p): p is Place => isLatLng(p) && typeof (p as Place).name === 'string')
        .map((p) => ({ name: p.name, note: str(p.note), lat: p.lat, lng: p.lng })),
    },
  };
}
