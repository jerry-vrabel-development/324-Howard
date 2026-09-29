import {
  PRIORITIES,
  ROOMS,
  TASK_STATUSES,
  isPriority,
  isRoomId,
  isTaskStatus,
  roomLabel,
  type TaskStatus,
} from '../../config/constants';
import { confirmAction } from '../../components/confirm';
import { closeDialog, openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { addTask, deleteTask, setTaskStatus, toggleTimer, updateTask } from '../../store/actions';
import type { Store } from '../../store/store';
import type { AppData, Task } from '../../types';
import { byId, fillSelect, formValue } from '../../utils/dom';
import { formatHours } from '../../utils/format';
import { html, setHtml } from '../../utils/html';
import {
  DEFAULT_FILTERS,
  computeStats,
  filterTasks,
  groupByStatus,
  type TaskFilters,
} from './filters';
import { taskCard } from './taskCard';

const COLUMN_EMPTY: Record<TaskStatus, string> = {
  todo: 'Nothing queued.',
  'in-progress': 'Nothing in progress.',
  completed: 'Nothing finished yet.',
};

export function initTaskBoard(store: Store): void {
  const search = byId<HTMLInputElement>('task-search');
  const roomFilter = byId<HTMLSelectElement>('task-room-filter');
  const priorityFilter = byId<HTMLSelectElement>('task-priority-filter');
  const board = byId('task-board');
  const dialog = byId<HTMLDialogElement>('dialog-task');
  const form = byId<HTMLFormElement>('task-form');

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

  function render(state: AppData): void {
    renderStats(state);
    const groups = groupByStatus(filterTasks(state.tasks, filters, roomLabel));
    const activeId = state.activeTimer?.taskId;

    for (const { id } of TASK_STATUSES) {
      const tasks = groups[id];
      byId(`count-${id}`).textContent = String(tasks.length);
      const column = byId(`col-${id}`);
      setHtml(
        column,
        tasks.length
          ? html`${tasks.map((t) => taskCard(t, t.id === activeId))}`
          : html`<p class="px-1 py-6 text-center text-xs text-slate-500">${COLUMN_EMPTY[id]}</p>`,
      );
      hydrateIcons(column);
    }

    byId('tasks-empty').hidden = state.tasks.length > 0;
  }

  function openForm(task?: Task): void {
    form.reset();
    byId('task-dialog-title').textContent = task ? 'Edit task' : 'New task';
    byId('task-submit').textContent = task ? 'Save changes' : 'Create task';
    const set = (id: string, value: string) => (byId<HTMLInputElement>(id).value = value);
    set('task-id', task?.id ?? '');
    set('task-title', task?.title ?? '');
    set('task-room', task?.room ?? ROOMS[0].id);
    set('task-priority', task?.priority ?? 'medium');
    set('task-status', task?.status ?? 'todo');
    set('task-estimate', String(task?.estimatedHours ?? 4));
    set('task-notes', task?.notes ?? '');
    openDialog(dialog);
  }

  // ---- Events (one delegated listener per concern) ----

  search.addEventListener('input', readFilters);
  roomFilter.addEventListener('change', readFilters);
  priorityFilter.addEventListener('change', readFilters);
  byId('add-task').addEventListener('click', () => openForm());

  board.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    const id = button?.closest<HTMLElement>('[data-task-id]')?.dataset.taskId;
    if (!button || !id) return;
    const task = store.getState().tasks.find((t) => t.id === id);
    if (!task) return;

    switch (button.dataset.action) {
      case 'toggle-timer':
        store.update((s) => toggleTimer(s, id, Date.now()));
        break;
      case 'edit-task':
        openForm(task);
        break;
      case 'delete-task':
        if (await confirmAction(`Delete "${task.title}"? Logged time for it will be lost.`)) {
          store.update((s) => deleteTask(s, id));
        }
        break;
    }
  });

  board.addEventListener('change', (event) => {
    const select = event.target as HTMLSelectElement;
    const id = select.closest<HTMLElement>('[data-task-id]')?.dataset.taskId;
    if (select.dataset.action === 'set-status' && id && isTaskStatus(select.value)) {
      const status = select.value;
      store.update((s) => setTaskStatus(s, id, status, Date.now()));
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const room = formValue(form, 'room');
    const priority = formValue(form, 'priority');
    const status = formValue(form, 'status');
    if (!isRoomId(room) || !isPriority(priority) || !isTaskStatus(status)) return;

    const input = {
      title: formValue(form, 'title'),
      room,
      priority,
      status,
      estimatedHours: Math.max(0, Number(formValue(form, 'estimatedHours')) || 0),
      notes: formValue(form, 'notes'),
    };
    const id = formValue(form, 'id');
    store.update((s) => (id ? updateTask(s, id, input, Date.now()) : addTask(s, input)));
    closeDialog(dialog);
  });

  store.subscribe((state, previous) => {
    if (state.tasks !== previous.tasks || state.activeTimer !== previous.activeTimer) {
      render(state);
    }
  });
  render(store.getState());
}
