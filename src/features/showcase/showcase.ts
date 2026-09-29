import { ROOMS, isRoomId, roomLabel } from '../../config/constants';
import { confirmAction } from '../../components/confirm';
import { closeDialog, openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { addPhoto, deletePhoto } from '../../store/actions';
import type { Store } from '../../store/store';
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
          </div>
          <h3 class="mt-1.5 text-base font-bold text-slate-900">${photo.title}</h3>
        </div>
        <button
          type="button"
          class="icon-btn hover:text-rose-600"
          data-action="delete-photo"
          data-id="${photo.id}"
          aria-label="Delete ${photo.title}"
        >
          <i data-lucide="trash-2" class="size-4"></i>
        </button>
      </header>

      ${compareSliderMarkup({
        title: photo.title,
        beforeSrc: photo.beforeUrl
          ? safeImageUrl(photo.beforeUrl, BEFORE_PLACEHOLDER)
          : BEFORE_PLACEHOLDER,
        afterSrc: photo.afterUrl
          ? safeImageUrl(photo.afterUrl, AFTER_PLACEHOLDER)
          : AFTER_PLACEHOLDER,
      })}

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
        <button type="button" class="btn btn-primary btn-sm" data-action="add-photo">
          <i data-lucide="plus" class="size-3.5"></i> Add transformation
        </button>
        ${
          filtered
            ? ''
            : html`<button type="button" class="btn btn-ghost btn-sm" data-action="load-samples">
                Load sample data
              </button>`
        }
      </div>
    </div>
  `;
}

export function initShowcase(store: Store): void {
  const grid = byId('showcase-grid');
  const filter = byId<HTMLSelectElement>('gallery-room-filter');
  const dialog = byId<HTMLDialogElement>('dialog-photo');
  const form = byId<HTMLFormElement>('photo-form');

  fillSelect(filter, ROOMS, 'All areas');
  fillSelect(byId<HTMLSelectElement>('photo-room'), ROOMS);

  function render(): void {
    const room = filter.value;
    const photos = store
      .getState()
      .photos.filter((p) => room === 'all' || p.room === room)
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
        store.update((s) => deletePhoto(s, photo.id));
      }
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const room = formValue(form, 'room');
    const date = formValue(form, 'date');
    if (!isRoomId(room)) return;
    store.update((s) =>
      addPhoto(s, {
        room,
        title: formValue(form, 'title'),
        description: formValue(form, 'description'),
        beforeUrl: formValue(form, 'beforeUrl'),
        afterUrl: formValue(form, 'afterUrl'),
        date: isIsoDate(date) ? date : todayIso(),
      }),
    );
    closeDialog(dialog);
  });

  // Only re-render when photos actually changed, so slider positions survive
  // unrelated updates (like editing a task).
  store.subscribe((state, previous) => {
    if (state.photos !== previous.photos) render();
  });
  render();
}
