import { attempt } from '../../components/attempt';
import { confirmAction } from '../../components/confirm';
import { openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { getViewer } from '../../backend/viewer';
import type { DataService } from '../../services/dataService';
import type { Task, TaskComment } from '../../types';
import { byId, formValue } from '../../utils/dom';
import { html, setHtml } from '../../utils/html';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function commentItem(c: TaskComment) {
  const viewer = getViewer();
  const canDelete = c.authorId === viewer.userId || viewer.role === 'admin';
  const own = c.authorId === viewer.userId;
  return html`
    <li class="rounded-xl p-3 ${own ? 'bg-coastal-50' : 'bg-slate-50'}">
      <div class="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span><strong class="text-slate-700">${c.authorName}</strong> · ${when(c.createdAt)}</span>
        ${
          canDelete
            ? html`<button
                type="button"
                class="icon-btn size-6 hover:text-rose-600"
                data-action="delete-comment"
                data-id="${c.id}"
                aria-label="Delete comment"
              >
                <i data-lucide="trash-2" class="size-3"></i>
              </button>`
            : ''
        }
      </div>
      <p class="text-sm whitespace-pre-line text-slate-700">${c.body}</p>
    </li>
  `;
}

/** Feedback thread for a task (Supabase only). Returns the function that opens it. */
export function initFeedback(service: DataService): (task: Task) => void {
  const dialog = byId<HTMLDialogElement>('dialog-feedback');
  const list = byId('feedback-list');
  const form = byId<HTMLFormElement>('feedback-form');
  let taskId = '';

  async function load(): Promise<void> {
    setHtml(list, html`<li class="text-sm text-slate-500">Loading…</li>`);
    const ok = await attempt(async () => {
      const comments = await service.listComments(taskId);
      setHtml(
        list,
        comments.length
          ? html`${comments.map(commentItem)}`
          : html`<li class="text-sm text-slate-500">No feedback yet.</li>`,
      );
      hydrateIcons(list);
    });
    if (!ok) setHtml(list, html``);
  }

  list.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-action="delete-comment"]',
    );
    const id = button?.dataset.id;
    if (id && (await confirmAction('Delete this comment?'))) {
      if (await attempt(() => service.deleteComment(id), { button })) await load();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formValue(form, 'body');
    if (!body) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (await attempt(() => service.addComment(taskId, body), { button })) {
      form.reset();
      await load();
    }
  });

  return (task) => {
    taskId = task.id;
    byId('feedback-title').textContent = task.title;
    form.reset();
    openDialog(dialog);
    void load();
  };
}
