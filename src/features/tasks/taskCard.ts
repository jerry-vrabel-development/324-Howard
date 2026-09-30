import { TASK_STATUSES, priorityLabel, roomLabel } from '../../config/constants';
import type { Viewer } from '../../backend/viewer';
import type { Task } from '../../types';
import { formatHours } from '../../utils/format';
import { html } from '../../utils/html';

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  high: 'bg-rose-100 text-rose-700 border-rose-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export function priorityBadge(task: Task) {
  return html`<span class="badge border ${PRIORITY_STYLES[task.priority]}">
    ${priorityLabel(task.priority)} priority
  </span>`;
}

function feedbackButton(task: Task) {
  const count = task.commentCount ?? 0;
  return html`<button
    type="button"
    class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
    data-action="feedback"
    aria-label="Feedback on ${task.title} (${count})"
  >
    <i data-lucide="message-square" class="size-3.5"></i> ${count}
  </button>`;
}

export function taskCard(task: Task, timerRunning: boolean, viewer: Viewer) {
  const admin = viewer.role === 'admin';
  const remote = viewer.mode === 'remote';
  const overBudget = task.estimatedHours > 0 && task.loggedHours > task.estimatedHours;

  return html`
    <article class="card space-y-3 p-4" data-task-id="${task.id}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          ${priorityBadge(task)}
          ${task.sample ? html`<span class="badge badge-sample">Sample</span>` : ''}
          ${task.requestedBy ? html`<span class="badge badge-local">Requested</span>` : ''}
        </div>
        <span class="text-xs font-medium text-slate-500">${roomLabel(task.room)}</span>
      </div>

      <h4 class="text-sm leading-snug font-bold text-slate-800">${task.title}</h4>
      ${task.notes ? html`<p class="line-clamp-2 text-xs text-slate-500">${task.notes}</p>` : ''}

      <div
        class="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600"
      >
        <span class="flex items-center gap-1.5">
          <i data-lucide="clock" class="size-3.5 text-coastal-600"></i>
          <span>
            Logged
            <strong class="${overBudget ? 'text-rose-600' : ''}"
              >${formatHours(task.loggedHours)}</strong
            >
            of ${formatHours(task.estimatedHours)}
          </span>
        </span>
        ${
          admin && task.status !== 'completed'
            ? html`<button
                type="button"
                class="timer-btn ${timerRunning ? 'timer-btn-running' : ''}"
                data-action="toggle-timer"
                aria-pressed="${timerRunning}"
                aria-label="${timerRunning ? 'Stop timer for' : 'Start timer for'} ${task.title}"
              >
                <i data-lucide="${timerRunning ? 'pause' : 'play'}" class="size-3"></i>
                <span>${timerRunning ? 'Running' : 'Start timer'}</span>
              </button>`
            : timerRunning
              ? html`<span class="font-medium text-rose-600">Timer running</span>`
              : ''
        }
      </div>

      <div class="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
        ${
          admin
            ? html`<label class="sr-only" for="status-${task.id}">Status for ${task.title}</label>
                <select
                  id="status-${task.id}"
                  class="rounded border-0 bg-slate-100 p-1 text-xs font-medium text-slate-700"
                  data-action="set-status"
                >
                  ${TASK_STATUSES.map(
                    (s) =>
                      html`<option value="${s.id}" ${s.id === task.status ? 'selected' : ''}>
                        ${s.label}
                      </option>`,
                  )}
                </select>`
            : html`<span></span>`
        }
        <div class="flex items-center gap-1">
          ${remote ? feedbackButton(task) : ''}
          ${
            admin
              ? html`<button
                    type="button"
                    class="icon-btn"
                    data-action="edit-task"
                    aria-label="Edit ${task.title}"
                  >
                    <i data-lucide="pencil" class="size-3.5"></i>
                  </button>
                  <button
                    type="button"
                    class="icon-btn hover:text-rose-600"
                    data-action="delete-task"
                    aria-label="Delete ${task.title}"
                  >
                    <i data-lucide="trash-2" class="size-3.5"></i>
                  </button>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}
