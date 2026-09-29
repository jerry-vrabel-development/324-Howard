/**
 * Thin helpers over the native <dialog> element, which gives us Escape-to-close,
 * focus moving into the dialog, and an inert background for free.
 */

export function openDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) dialog.showModal();
}

export function closeDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) dialog.close();
}

/** Wire [data-close] buttons and backdrop clicks for every dialog on the page. */
export function initDialogs(root: Document = document): void {
  root.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      // A click whose target is the <dialog> itself landed on the backdrop.
      if (target === dialog || target.closest('[data-close]')) closeDialog(dialog);
    });
  });
}
