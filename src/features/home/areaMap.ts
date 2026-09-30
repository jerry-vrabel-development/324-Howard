import type { HomeContent, LatLng } from '../../content/home';
import { escapeHtml } from '../../utils/html';

/**
 * Neighborhood map (Leaflet + OpenStreetMap tiles).
 *
 * Leaflet is loaded only when the Home page is first shown, so it doesn't slow
 * down the other pages. Markers are plain HTML (divIcon) rather than Leaflet's
 * default PNG pins, which break under bundlers and don't match the palette.
 */

// Miller Beach, used only if home.json has no house or places.
const FALLBACK_CENTER: LatLng = { lat: 41.607, lng: -87.26 };

export interface AreaMap {
  /** Call after the map's container becomes visible again (e.g. switching tabs). */
  refresh(): void;
}

export async function createAreaMap(
  container: HTMLElement,
  config: HomeContent['map'],
): Promise<AreaMap> {
  const [{ default: L }] = await Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ]);

  container.replaceChildren();
  const points: LatLng[] = [...(config.house ? [config.house] : []), ...config.places];
  const center = config.house ?? config.places[0] ?? FALLBACK_CENTER;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  const map = L.map(container, {
    center: [center.lat, center.lng],
    zoom: config.zoom,
    scrollWheelZoom: false, // don't hijack page scrolling
    dragging: !touch, // on phones one finger scrolls the page; zoom buttons still work
    attributionControl: true,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const icon = (kind: 'house' | 'place') =>
    L.divIcon({
      className: `map-pin map-pin-${kind}`,
      html: '<span></span>',
      iconSize: kind === 'house' ? [22, 22] : [16, 16],
    });

  if (config.house) {
    L.marker([config.house.lat, config.house.lng], {
      icon: icon('house'),
      title: '324 S Howard St',
    })
      .addTo(map)
      .bindPopup('<strong>324 S Howard St</strong><br>The house');
  }
  for (const place of config.places) {
    L.marker([place.lat, place.lng], { icon: icon('place'), title: place.name })
      .addTo(map)
      .bindPopup(
        `<strong>${escapeHtml(place.name)}</strong>${place.note ? `<br>${escapeHtml(place.note)}` : ''}`,
      );
  }

  if (points.length > 1) {
    map.fitBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [48, 48], maxZoom: config.zoom },
    );
  }

  return { refresh: () => map.invalidateSize() };
}
