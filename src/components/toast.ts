import { html, setHtml } from '../utils/html';
import { byId } from '../utils/dom';
import { hydrateIcons } from './icons';

type Tone = 'info' | 'error';

/**
 * A modal <dialog> sits above everything else on the page, so a toast shown
 * while one is open would be hidden behind it. In that case the toast goes
 * inside the open dialog instead.
 */
function toastRegion(): HTMLElement {
  const open = document.querySelector<HTMLDialogElement>('dialog[open]');
  if (!open) return byId('toast-region');
  let region = open.querySelector<HTMLElement>('.dialog-toasts');
  if (!region) {
    region = document.createElement('div');
    region.className = 'dialog-toasts fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2';
    region.setAttribute('aria-live', 'polite');
    open.append(region);
  }
  return region;
}

/** Short, non-blocking status message announced to screen readers. */
export function showToast(message: string, tone: Tone = 'info', timeoutMs = 5000): void {
  const region = toastRegion();
  const toast = document.createElement('div');
  toast.className = tone === 'error' ? 'toast toast-error' : 'toast';
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  setHtml(
    toast,
    html`${tone === 'error' ? html`<i data-lucide="triangle-alert" class="size-4 shrink-0"></i>` : ''}
      <span>${message}</span>`,
  );
  region.append(toast);
  hydrateIcons(toast);
  window.setTimeout(() => toast.remove(), timeoutMs);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}
