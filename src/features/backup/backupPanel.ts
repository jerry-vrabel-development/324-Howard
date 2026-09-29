import { confirmAction } from '../../components/confirm';
import { closeDialog, openDialog } from '../../components/dialog';
import { errorMessage, showToast } from '../../components/toast';
import { hasSampleData, loadSampleData, removeSampleData } from '../../store/actions';
import { downloadBackup, parseBackup } from '../../store/backup';
import type { Store } from '../../store/store';
import { byId } from '../../utils/dom';
import { pluralize } from '../../utils/format';

/**
 * Backup & data dialog: export/import a JSON backup and manage sample data.
 * Everything lives in this browser's storage, so exporting regularly is the
 * only protection against a cleared cache.
 */
export function initBackupPanel(store: Store): void {
  const dialog = byId<HTMLDialogElement>('dialog-data');
  const fileInput = byId<HTMLInputElement>('import-file');
  const removeSamples = byId<HTMLButtonElement>('remove-samples');

  function syncSampleButton(): void {
    removeSamples.disabled = !hasSampleData(store.getState());
  }

  byId('open-data').addEventListener('click', () => {
    syncSampleButton();
    openDialog(dialog);
  });

  byId('export-data').addEventListener('click', () => {
    downloadBackup(store.getState());
    showToast('Backup downloaded.');
  });

  byId('import-data').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const { data, skipped } = parseBackup(await file.text());
      const summary = `${pluralize(data.tasks.length, 'task')}, ${pluralize(data.photos.length, 'photo')}, ${pluralize(data.journal.length, 'journal entry', 'journal entries')}`;
      const ok = await confirmAction(
        `Replace everything in this browser with the backup (${summary})? Export a backup first if you want to keep the current data.`,
        'Replace data',
      );
      if (!ok) return;
      store.update(() => data);
      closeDialog(dialog);
      showToast(
        skipped
          ? `Backup restored. ${pluralize(skipped, 'invalid record')} skipped.`
          : 'Backup restored.',
      );
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  removeSamples.addEventListener('click', async () => {
    if (await confirmAction('Remove all records marked "Sample"?', 'Remove samples')) {
      store.update(removeSampleData);
      syncSampleButton();
      showToast('Sample data removed.');
    }
  });

  // "Load sample data" buttons can appear in any empty state.
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('[data-action="load-samples"]');
    if (!button) return;
    store.update(loadSampleData);
    syncSampleButton();
    closeDialog(dialog);
  });
}
