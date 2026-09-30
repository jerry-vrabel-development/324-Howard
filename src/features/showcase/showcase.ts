import { ROOMS, isRoomId, roomLabel } from '../../config/constants';
import { confirmAction } from '../../components/confirm';
import { closeDialog, openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { attempt } from '../../components/attempt';
import { getViewer, onViewerChange } from '../../backend/viewer';
import type { DataService } from '../../services/dataService';
import type { Store } from '../../store/store';
import { loadPublishedPhotos } from '../../content/published';
import type { Photo } from '../../types';
import { byDateDesc, formatDate, isIsoDate, todayIso } from '../../utils/dates';
import { byId, fillSelect, formValue } from '../../utils/dom';
import { html, safeImageUrl, setHtml } from '../../utils/html';
import {
  AFTER_PLACEHOLDER,
  BEFORE_PLACEHOLDER,
  compareSliderMarkup,
  enhanceCompareSliders,
} from './compareSlider';

function imageSrc(url: string, fallback: string): string {
  return url ? safeImageUrl(url, fallback) : fallback;
}

/** Before/after pairs get the comparison slider; a single progress photo is shown as-is. */
function photoMedia(photo: Photo) {
  const afterSrc = imageSrc(photo.afterUrl, AFTER_PLACEHOLDER);
  if (!photo.beforeUrl) {
    return html`<div class="compare">
      <img
        class="compare-img"
        src="${afterSrc}"
        alt="${photo.title}"
        data-fallback="after"
        loading="lazy"
        decoding="async"
      />
    </div>`;
  }
  return compareSliderMarkup({
    title: photo.title,
    beforeSrc: imageSrc(photo.beforeUrl, BEFORE_PLACEHOLDER),
    afterSrc,
  });
}

function photoCard(photo: Photo) {
  return html`
    <article class="card flex flex-col overflow-hidden">
      <header
        class="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4"
      >
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge bg-coastal-100 text-coastal-800">${roomLabel(photo.room)}</span>
            ${photo.sample ? html`<span class="badge badge-sample">Sample</span>` : ''}
            ${
              !photo.sample && !photo.published && getViewer().mode === 'local'
                ? html`<span
                    class="badge badge-local"
                    title="Saved in this browser only. Visitors can't see it."
                    >This device only</span
                  >`
                : ''
            }
          </div>
          <h3 class="mt-1.5 text-base font-bold text-slate-900">${photo.title}</h3>
        </div>
        ${
          photo.published || getViewer().role !== 'admin'
            ? ''
            : html`<button
                type="button"
                class="icon-btn hover:text-rose-600"
                data-action="delete-photo"
                data-id="${photo.id}"
                aria-label="Delete ${photo.title}"
              >
                <i data-lucide="trash-2" class="size-4"></i>
              </button>`
        }
      </header>

      ${photoMedia(photo)}

      <div class="flex flex-1 flex-col justify-between p-4">
        ${
          photo.description
            ? html`<p class="text-sm leading-relaxed text-slate-600">${photo.description}</p>`
            : ''
        }
        <p class="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <time datetime="${photo.date}">${formatDate(photo.date)}</time>
        </p>
      </div>
    </article>
  `;
}

function emptyState(filtered: boolean) {
  return html`
    <div class="empty-state col-span-full">
      <i data-lucide="image-off" class="mx-auto mb-3 size-12 text-slate-400"></i>
      <p class="font-medium text-slate-700">
        ${filtered ? 'No transformations for this area yet.' : 'No transformations yet.'}
      </p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          data-action="add-photo"
          data-requires="admin"
        >
          <i data-lucide="plus" class="size-3.5"></i> Add transformation
        </button>
        ${
          filtered
            ? ''
            : html`<button
                type="button"
                class="btn btn-ghost btn-sm"
                data-action="load-samples"
                data-requires="local"
              >
                Load sample data
              </button>`
        }
      </div>
    </div>
  `;
}

export function initShowcase(store: Store, service: DataService): void {
  const grid = byId('showcase-grid');
  const filter = byId<HTMLSelectElement>('gallery-room-filter');
  const dialog = byId<HTMLDialogElement>('dialog-photo');
  const form = byId<HTMLFormElement>('photo-form');
  const published = loadPublishedPhotos();

  fillSelect(filter, ROOMS, 'All areas');
  fillSelect(byId<HTMLSelectElement>('photo-room'), ROOMS);

  function render(): void {
    const room = filter.value;
    const photos = [...published, ...store.getState().photos]
      .filter((p) => room === 'all' || p.room === room)
      .sort(byDateDesc);
    setHtml(grid, photos.length ? html`${photos.map(photoCard)}` : emptyState(room !== 'all'));
    hydrateIcons(grid);
  }

  function openForm(): void {
    form.reset();
    byId<HTMLInputElement>('photo-date').value = todayIso();
    openDialog(dialog);
  }

  enhanceCompareSliders(grid);
  filter.addEventListener('change', render);
  byId('add-photo').addEventListener('click', openForm);

  grid.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'add-photo') openForm();
    if (button.dataset.action === 'delete-photo' && button.dataset.id) {
      const photo = store.getState().photos.find((p) => p.id === button.dataset.id);
      if (photo && (await confirmAction(`Delete "${photo.title}"? This can't be undone.`))) {
        await attempt(() => service.deletePhoto(photo.id), { button });
      }
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const room = formValue(form, 'room');
    const date = formValue(form, 'date');
    if (!isRoomId(room)) return;
    const file = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.files?.[0] ?? null;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const label = submit?.textContent ?? '';
    if (submit && service.mode === 'remote') submit.textContent = 'Uploading…';

    void attempt(
      () =>
        service.addPhoto({
          room,
          title: formValue(form, 'title'),
          description: formValue(form, 'description'),
          date: isIsoDate(date) ? date : todayIso(),
          beforeFile: file('beforeFile'),
          afterFile: file('afterFile'),
          beforeUrl: formValue(form, 'beforeUrl'),
          afterUrl: formValue(form, 'afterUrl'),
        }),
      { button: submit, success: service.mode === 'remote' ? 'Photo uploaded.' : undefined },
    ).then((ok) => {
      if (submit) submit.textContent = label;
      if (ok) closeDialog(dialog);
    });
  });

  // Only re-render when photos actually changed, so slider positions survive
  // unrelated updates (like editing a task).
  store.subscribe((state, previous) => {
    if (state.photos !== previous.photos) render();
  });
  onViewerChange(render);
  render();
}
