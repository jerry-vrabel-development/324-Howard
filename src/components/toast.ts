import { html, setHtml } from '../utils/html';
import { byId } from '../utils/dom';
import { hydrateIcons } from './icons';

type Tone = 'info' | 'error';

/** Short, non-blocking status message announced to screen readers. */
export function showToast(message: string, tone: Tone = 'info', timeoutMs = 5000): void {
  const region = byId('toast-region');
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
