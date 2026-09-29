import { byId } from '../utils/dom';
import { openDialog } from './dialog';

/** Promise-based replacement for window.confirm(), styled to match the app. */
export function confirmAction(message: string, confirmLabel = 'Delete'): Promise<boolean> {
  const dialog = byId<HTMLDialogElement>('dialog-confirm');
  byId('confirm-message').textContent = message;
  byId('confirm-accept').textContent = confirmLabel;
  dialog.returnValue = '';
  openDialog(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {
      once: true,
    });
  });
}
