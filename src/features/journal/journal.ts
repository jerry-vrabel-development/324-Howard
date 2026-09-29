import { JOURNAL_TAGS, isJournalTag, tagLabel } from '../../config/constants';
import { confirmAction } from '../../components/confirm';
import { hydrateIcons } from '../../components/icons';
import { addJournalEntry, deleteJournalEntry } from '../../store/actions';
import type { Store } from '../../store/store';
import type { AppData, JournalEntry } from '../../types';
import { byDateDesc, formatDate, isIsoDate, todayIso } from '../../utils/dates';
import { byId, fillSelect, formValue } from '../../utils/dom';
import { pluralize } from '../../utils/format';
import { html, setHtml } from '../../utils/html';

function entryCard(entry: JournalEntry) {
  return html`
    <article class="card space-y-2 p-5">
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="badge border border-slate-200 bg-slate-100 text-slate-700">
            ${tagLabel(entry.tag)}
          </span>
          ${entry.sample ? html`<span class="badge badge-sample">Sample</span>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <time class="text-xs text-slate-500" datetime="${entry.date}"
            >${formatDate(entry.date)}</time
          >
          <button
            type="button"
            class="icon-btn hover:text-rose-600"
            data-action="delete-entry"
            data-id="${entry.id}"
            aria-label="Delete entry: ${entry.title}"
          >
            <i data-lucide="trash-2" class="size-3.5"></i>
          </button>
        </div>
      </div>
      <h4 class="text-base font-bold text-slate-900">${entry.title}</h4>
      <p class="text-sm leading-relaxed whitespace-pre-line text-slate-600">${entry.content}</p>
    </article>
  `;
}

export function initJournal(store: Store): void {
  const list = byId('journal-list');
  const count = byId('journal-count');
  const form = byId<HTMLFormElement>('journal-form');
  const dateInput = byId<HTMLInputElement>('journal-date');

  fillSelect(byId<HTMLSelectElement>('journal-tag'), JOURNAL_TAGS);
  dateInput.value = todayIso();

  function render(state: AppData): void {
    const entries = [...state.journal].sort(byDateDesc);
    count.textContent = pluralize(entries.length, 'entry', 'entries');
    setHtml(
      list,
      entries.length
        ? html`${entries.map(entryCard)}`
        : html`<div class="empty-state text-sm">
            No entries yet. Use the form to record what you find and what you did.
          </div>`,
    );
    hydrateIcons(list);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const tag = formValue(form, 'tag');
    const date = formValue(form, 'date');
    if (!isJournalTag(tag)) return;
    store.update((s) =>
      addJournalEntry(s, {
        title: formValue(form, 'title'),
        tag,
        content: formValue(form, 'content'),
        date: isIsoDate(date) ? date : todayIso(),
      }),
    );
    form.reset();
    dateInput.value = todayIso();
  });

  list.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-action="delete-entry"]',
    );
    const entry = store.getState().journal.find((j) => j.id === button?.dataset.id);
    if (entry && (await confirmAction(`Delete "${entry.title}"? This can't be undone.`))) {
      store.update((s) => deleteJournalEntry(s, entry.id));
    }
  });

  store.subscribe((state, previous) => {
    if (state.journal !== previous.journal) render(state);
  });
  render(store.getState());
}
