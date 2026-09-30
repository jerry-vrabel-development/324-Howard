import {
  PRIORITIES,
  ROOMS,
  TASK_STATUSES,
  isBoardStatus,
  isPriority,
  isRoomId,
  roomLabel,
  type BoardStatus,
} from '../../config/constants';
import { attempt } from '../../components/attempt';
import { confirmAction } from '../../components/confirm';
import { closeDialog, openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { getViewer, onViewerChange } from '../../backend/viewer';
import type { DataService } from '../../services/dataService';
import type { Store } from '../../store/store';
import type { AppData, Task } from '../../types';
import { byId, fillSelect, formValue } from '../../utils/dom';
import { formatHours } from '../../utils/format';
import { html, setHtml } from '../../utils/html';
import { initFeedback } from './feedback';
import {
  DEFAULT_FILTERS,
  computeStats,
  filterTasks,
  groupByStatus,
  type TaskFilters,
} from './filters';
import { priorityBadge, taskCard } from './taskCard';

const COLUMN_EMPTY: Record<BoardStatus, string> = {
  todo: 'Nothing queued.',
  'in-progress': 'Nothing in progress.',
  completed: 'Nothing finished yet.',
};

function requestCard(task: Task) {
  const viewer = getViewer();
  const admin = viewer.role === 'admin';
  const mine = task.requestedBy === viewer.userId;
  const declined = task.status === 'declined';
  return html`
    <article class="card space-y-2 p-4 ${declined ? 'opacity-70' : ''}" data-task-id="${task.id}">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          ${priorityBadge(task)}
          ${declined ? html`<span class="badge bg-slate-200 text-slate-700">Declined</span>` : ''}
        </div>
        <span class="text-xs font-medium text-slate-500">${roomLabel(task.room)}</span>
      </div>
      <h4 class="text-sm font-bold text-slate-800">${task.title}</h4>
      ${task.notes ? html`<p class="text-xs text-slate-600">${task.notes}</p>` : ''}
      <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          data-action="feedback"
        >
          <i data-lucide="message-square" class="size-3.5"></i> ${task.commentCount ?? 0}
        </button>
        ${
          admin && !declined
            ? html`<button type="button" class="btn btn-ghost btn-sm" data-action="decline">
                  Decline
                </button>
                <button type="button" class="btn btn-primary btn-sm" data-action="accept">
                  <i data-lucide="check" class="size-3.5"></i> Add to board
                </button>`
            : ''
        }
        ${
          !admin && mine && !declined
            ? html`<button type="button" class="btn btn-ghost btn-sm" data-action="withdraw">
                Withdraw
              </button>`
            : ''
        }
      </div>
    </article>
  `;
}

export function initTaskBoard(store: Store, service: DataService): void {
  const search = byId<HTMLInputElement>('task-search');
  const roomFilter = byId<HTMLSelectElement>('task-room-filter');
  const priorityFilter = byId<HTMLSelectElement>('task-priority-filter');
  const board = byId('task-board');
  const requests = byId('task-requests');
  const dialog = byId<HTMLDialogElement>('dialog-task');
  const form = byId<HTMLFormElement>('task-form');
  const openFeedback = initFeedback(service);

  fillSelect(roomFilter, ROOMS, 'All rooms');
  fillSelect(priorityFilter, PRIORITIES, 'All priorities');
  fillSelect(byId<HTMLSelectElement>('task-room'), ROOMS);
  fillSelect(byId<HTMLSelectElement>('task-priority'), PRIORITIES);
  fillSelect(byId<HTMLSelectElement>('task-status'), TASK_STATUSES);

  let filters: TaskFilters = { ...DEFAULT_FILTERS };

  function readFilters(): void {
    const room = roomFilter.value;
    const priority = priorityFilter.value;
    filters = {
      query: search.value,
      room: isRoomId(room) ? room : 'all',
      priority: isPriority(priority) ? priority : 'all',
    };
    render(store.getState());
  }

  function renderStats(state: AppData): void {
    const stats = computeStats(state.tasks);
    byId('stat-progress').textContent = `${stats.progressPct}%`;
    byId('stat-hours').textContent = formatHours(stats.loggedHours);
    byId('stat-pending').textContent = String(stats.pending);
    byId('stat-estimate').textContent =
      `${formatHours(stats.estimatedHours)} / ${formatHours(stats.loggedHours)}`;
  }

  function renderRequests(state: AppData): void {
    const viewer = getViewer();
    // Admin sees pending requests; the landowner also sees their declined ones.
    const list = state.tasks.filter(
      (t) =>
        t.status === 'requested' ||
        (t.status === 'declined' && viewer.role === 'landowner' && t.requestedBy === viewer.userId),
    );
    byId('requests-section').hidden = list.length === 0;
    byId('requests-count').textContent = String(
      list.filter((t) => t.status === 'requested').length,
    );
    setHtml(requests, html`${list.map(requestCard)}`);
    hydrateIcons(requests);
  }

  function render(state: AppData): void {
    const viewer = getViewer();
    renderStats(state);
    renderRequests(state);
    const groups = groupByStatus(filterTasks(state.tasks, filters, roomLabel));
    const activeId = state.activeTimer?.taskId;

    for (const { id } of TASK_STATUSES) {
      const tasks = groups[id];
      byId(`count-${id}`).textContent = String(tasks.length);
      const column = byId(`col-${id}`);
      setHtml(
        column,
        tasks.length
          ? html`${tasks.map((t) => taskCard(t, t.id === activeId, viewer))}`
          : html`<p class="px-1 py-6 text-center text-xs text-slate-500">${COLUMN_EMPTY[id]}</p>`,
      );
      hydrateIcons(column);
    }

    byId('tasks-empty').hidden =
      state.tasks.some((t) => isBoardStatus(t.status)) || viewer.role !== 'admin';
  }

  function openForm(task?: Task): void {
    const requesting = getViewer().role === 'landowner';
    form.reset();
    form.dataset.request = String(requesting);
    byId('task-dialog-title').textContent = task
      ? 'Edit task'
      : requesting
        ? 'Request a task'
        : 'New task';
    byId('task-submit').textContent = task
      ? 'Save changes'
      : requesting
        ? 'Send request'
        : 'Create task';
    const set = (id: string, value: string) => (byId<HTMLInputElement>(id).value = value);
    set('task-id', task?.id ?? '');
    set('task-title', task?.title ?? '');
    set('task-room', task?.room ?? ROOMS[0].id);
    set('task-priority', task?.priority ?? 'medium');
    set('task-status', task && isBoardStatus(task.status) ? task.status : 'todo');
    set('task-estimate', String(task?.estimatedHours ?? 4));
    set('task-notes', task?.notes ?? '');
    openDialog(dialog);
  }

  // ---- Events ----

  search.addEventListener('input', readFilters);
  roomFilter.addEventListener('change', readFilters);
  priorityFilter.addEventListener('change', readFilters);
  byId('add-task').addEventListener('click', () => openForm());
  byId('request-task').addEventListener('click', () => openForm());

  async function handleAction(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    const id = button?.closest<HTMLElement>('[data-task-id]')?.dataset.taskId;
    if (!button || !id) return;
    const task = store.getState().tasks.find((t) => t.id === id);
    if (!task) return;

    switch (button.dataset.action) {
      case 'toggle-timer':
        await attempt(() => service.toggleTimer(id), { button });
        break;
      case 'edit-task':
        openForm(task);
        break;
      case 'feedback':
        openFeedback(task);
        break;
      case 'accept':
        await attempt(() => service.decideRequest(id, true), {
          button,
          success: 'Added to the board.',
        });
        break;
      case 'decline':
        if (await confirmAction(`Decline "${task.title}"?`, 'Decline')) {
          await attempt(() => service.decideRequest(id, false), { button });
        }
        break;
      case 'withdraw':
      case 'delete-task':
        if (
          await confirmAction(
            button.dataset.action === 'withdraw'
              ? `Withdraw your request "${task.title}"?`
              : `Delete "${task.title}"? Logged time for it will be lost.`,
            button.dataset.action === 'withdraw' ? 'Withdraw' : 'Delete',
          )
        ) {
          await attempt(() => service.deleteTask(id), { button });
        }
        break;
    }
  }

  board.addEventListener('click', (e) => void handleAction(e));
  requests.addEventListener('click', (e) => void handleAction(e));

  board.addEventListener('change', (event) => {
    const select = event.target as HTMLSelectElement;
    const id = select.closest<HTMLElement>('[data-task-id]')?.dataset.taskId;
    if (select.dataset.action === 'set-status' && id && isBoardStatus(select.value)) {
      const status = select.value;
      void attempt(() => service.setTaskStatus(id, status));
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const room = formValue(form, 'room');
    const priority = formValue(form, 'priority');
    const status = formValue(form, 'status');
    if (!isRoomId(room) || !isPriority(priority) || !isBoardStatus(status)) return;

    const base = {
      title: formValue(form, 'title'),
      room,
      priority,
      notes: formValue(form, 'notes'),
    };
    const id = formValue(form, 'id');
    const submit = byId<HTMLButtonElement>('task-submit');

    const run =
      form.dataset.request === 'true'
        ? () => service.requestTask(base)
        : () => {
            const input = {
              ...base,
              status,
              estimatedHours: Math.max(0, Number(formValue(form, 'estimatedHours')) || 0),
            };
            return id ? service.updateTask(id, input) : service.addTask(input);
          };

    void attempt(run, {
      button: submit,
      success: form.dataset.request === 'true' ? 'Request sent.' : undefined,
    }).then((ok) => ok && closeDialog(dialog));
  });

  store.subscribe((state, previous) => {
    if (state.tasks !== previous.tasks || state.activeTimer !== previous.activeTimer) {
      render(state);
    }
  });
  onViewerChange(() => render(store.getState()));
  render(store.getState());
}
