import { hydrateIcons } from '../../components/icons';
import { parseHomeContent } from '../../content/home';
import { loadPublishedPhotos } from '../../content/published';
import { roomLabel } from '../../config/constants';
import { byDateDesc, formatDate } from '../../utils/dates';
import { byId } from '../../utils/dom';
import { html, safeImageUrl, setHtml } from '../../utils/html';
import { createAreaMap, type AreaMap } from './areaMap';
import { initHeroVideo } from './heroVideo';

const LATEST_COUNT = 4;

export interface HomePage {
  /** Called by the tab controller whenever the active tab changes. */
  onTabChange(tab: string): void;
}

function renderLatestPhotos(): void {
  const photos = loadPublishedPhotos().sort(byDateDesc).slice(0, LATEST_COUNT);
  byId('latest-section').hidden = photos.length === 0;
  setHtml(
    byId('latest-photos'),
    html`${photos.map(
      (p) => html`
        <a href="#showcase" class="group card overflow-hidden">
          <img
            src="${safeImageUrl(p.afterUrl, '')}"
            alt="${p.title}"
            class="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div class="p-3">
            <p class="truncate text-sm font-semibold text-slate-800">${p.title}</p>
            <p class="text-xs text-slate-500">${roomLabel(p.room)} · ${formatDate(p.date)}</p>
          </div>
        </a>
      `,
    )}`,
  );
}

function renderPlaces(content: ReturnType<typeof parseHomeContent>): void {
  const items = [
    ...(content.map.house ? [{ name: '324 S Howard St', note: 'The house', kind: 'house' }] : []),
    ...content.map.places.map((p) => ({ ...p, kind: 'place' })),
  ];
  setHtml(
    byId('map-places'),
    html`${items.map(
      (i) =>
        html`<li class="flex items-start gap-2">
          <span class="legend-dot legend-dot-${i.kind}" aria-hidden="true"></span>
          <span
            ><strong class="text-slate-800">${i.name}</strong
            >${i.note ? html` · ${i.note}` : ''}</span
          >
        </li>`,
    )}`,
  );
}

export function initHome(): HomePage {
  const content = parseHomeContent();
  const video = initHeroVideo(
    byId('hero-media'),
    byId<HTMLButtonElement>('hero-toggle'),
    content.hero,
  );
  renderLatestPhotos();
  renderPlaces(content);
  hydrateIcons(byId('panel-home'));

  let map: Promise<AreaMap> | undefined;

  return {
    onTabChange(tab) {
      const active = tab === 'home';
      video.setVisible(active);
      if (!active) return;
      // Leaflet needs a visible, sized container: create it on first view,
      // and re-measure on later visits.
      if (!map) {
        map = createAreaMap(byId('area-map'), content.map).catch((err) => {
          console.error(err);
          byId('area-map').textContent = 'The map could not be loaded.';
          throw err;
        });
      } else {
        map.then((m) => m.refresh()).catch(() => {});
      }
    },
  };
}
