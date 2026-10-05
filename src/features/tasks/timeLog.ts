import { attempt } from '../../components/attempt';
import { confirmAction } from '../../components/confirm';
import { openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { errorMessage, showToast } from '../../components/toast';
import type { DataService } from '../../services/dataService';
import type { Task, WorkSession } from '../../types';
import { formatDate, todayIso, toIsoDate } from '../../utils/dates';
import { byId, formValue } from '../../utils/dom';
import { html, setHtml } from '../../utils/html';
import {
  formatMinutes,
  parseDuration,
  sessionMinutes,
  validateManualEntry,
} from '../../utils/time';

function sessionItem(s: WorkSession, canDelete: boolean) {
  const running = s.endedAt === null;
  const date = formatDate(toIsoDate(new Date(s.startedAt)));
  return html`
    <li class="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <div class="min-w-0">
        <p class="text-slate-800">
          <strong>${running ? 'Running now' : formatMinutes(sessionMinutes(s))}</strong>
          <span class="text-slate-500"> · ${date}</span>
        </p>
        ${s.note ? html`<p class="truncate text-xs text-slate-500">${s.note}</p>` : ''}
      </div>
      ${
        canDelete && !running
          ? html`<button
              type="button"
              class="icon-btn size-7 shrink-0 hover:text-rose-600"
              data-action="delete-session"
              data-id="${s.id}"
              aria-label="Delete this entry"
            >
              <i data-lucide="trash-2" class="size-3.5"></i>
            </button>`
          : ''
      }
    </li>
  `;
}

/**
 * "Log time" dialog: enter work done without the timer, and see or correct
 * every entry for a task. Returns the function that opens it for a task.
 */
export function initTimeLog(service: DataService): (task: Task) => void {
  const dialog = byId<HTMLDialogElement>('dialog-time');
  const form = byId<HTMLFormElement>('time-form');
  const list = byId('time-list');
  const dateInput = byId<HTMLInputElement>('time-date');
  let task: Task | null = null;

  async function renderList(): Promise<void> {
    if (!task) return;
    if (service.mode === 'local') {
      setHtml(
        list,
        html`<li class="text-sm text-slate-500">Entry history needs the online version.</li>`,
      );
      return;
    }
    try {
      const sessions = await service.listSessions(task.id);
      const total = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
      byId('time-total').textContent = sessions.length ? `Total ${formatMinutes(total)}` : '';
      setHtml(
        list,
        sessions.length
          ? html`${sessions.map((s) => sessionItem(s, true))}`
          : html`<li class="text-sm text-slate-500">No time logged yet.</li>`,
      );
      hydrateIcons(list);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!task) return;
    const date = formValue(form, 'date');
    const minutes = parseDuration(formValue(form, 'hours'), formValue(form, 'minutes'));
    const problem = validateManualEntry(date, minutes);
    if (problem || minutes === null) {
      showToast(problem ?? 'Check the time entered.', 'error');
      return;
    }
    const id = task.id;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const ok = await attempt(
      () => service.logTime(id, { date, minutes, note: formValue(form, 'note') }),
      { button: submit, success: `Logged ${formatMinutes(minutes)}.` },
    );
    if (ok) {
      form.reset();
      dateInput.value = todayIso();
      await renderList();
    }
  });

  list.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-action="delete-session"]',
    );
    const id = button?.dataset.id;
    if (!button || !id) return;
    if (
      await confirmAction("Delete this time entry? The task's logged hours go down by that amount.")
    ) {
      if (await attempt(() => service.deleteSession(id), { button })) await renderList();
    }
  });

  return (next) => {
    task = next;
    form.reset();
    dateInput.value = todayIso();
    dateInput.max = todayIso();
    byId('time-task').textContent = next.title;
    byId('time-total').textContent = '';
    setHtml(list, html`<li class="text-sm text-slate-500">Loading…</li>`);
    openDialog(dialog);
    void renderList();
  };
}
