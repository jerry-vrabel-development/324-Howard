import { attempt } from '../../components/attempt';
import { confirmAction } from '../../components/confirm';
import { closeDialog, openDialog } from '../../components/dialog';
import { errorMessage, showToast } from '../../components/toast';
import { isAdmin } from '../../backend/viewer';
import { hasSampleData, loadSampleData, removeSampleData } from '../../store/actions';
import { downloadBackup, parseBackup } from '../../store/backup';
import type { StorageAdapter } from '../../store/storage';
import type { Store } from '../../store/store';
import { importLocalData } from '../../services/remoteService';
import type { DataService } from '../../services/dataService';
import type { AppData } from '../../types';
import { byId } from '../../utils/dom';
import { pluralize } from '../../utils/format';

const IMPORTED_KEY = 'howard324:imported-to-supabase';

/**
 * Backup & data dialog.
 *   Local mode:  export/import a JSON backup; manage sample data.
 *   Supabase:    (admin) copy this browser's old data into Supabase, once.
 */
export function initBackupPanel(store: Store, service: DataService, local: StorageAdapter): void {
  const dialog = byId<HTMLDialogElement>('dialog-data');
  const fileInput = byId<HTMLInputElement>('import-file');
  const removeSamples = byId<HTMLButtonElement>('remove-samples');
  const remote = service.mode === 'remote';

  // In Supabase mode the store holds Supabase data; the old browser data is read separately.
  const browserData = (): AppData | null => local.load();

  function syncButtons(): void {
    removeSamples.disabled = !hasSampleData(store.getState());
    if (!remote) return;
    const data = browserData();
    const count = data
      ? data.tasks.filter((t) => !t.sample).length +
        data.journal.filter((j) => !j.sample).length +
        data.photos.filter((p) => !p.sample && !p.published).length
      : 0;
    const done = localStorage.getItem(IMPORTED_KEY);
    byId('migrate-summary').textContent = done
      ? `Already copied on ${new Date(done).toLocaleDateString()}.`
      : count
        ? `${pluralize(count, 'record')} found in this browser.`
        : 'Nothing to copy from this browser.';
    byId<HTMLButtonElement>('migrate-data').disabled = !count || !isAdmin();
  }

  byId('open-data').addEventListener('click', () => {
    syncButtons();
    openDialog(dialog);
  });

  byId('export-data').addEventListener('click', () => {
    downloadBackup(remote ? (browserData() ?? store.getState()) : store.getState());
    showToast('Backup downloaded.');
  });

  byId('import-data').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file || !service.replaceAll) return;
    try {
      const { data, skipped } = parseBackup(await file.text());
      const summary = `${pluralize(data.tasks.length, 'task')}, ${pluralize(data.photos.length, 'photo')}, ${pluralize(data.journal.length, 'journal entry', 'journal entries')}`;
      const ok = await confirmAction(
        `Replace everything in this browser with the backup (${summary})? Export a backup first if you want to keep the current data.`,
        'Replace data',
      );
      if (!ok) return;
      await service.replaceAll(data);
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

  byId('migrate-data').addEventListener('click', async (event) => {
    const data = browserData();
    if (!data) return;
    const again = localStorage.getItem(IMPORTED_KEY)
      ? ' You already did this once; doing it again creates duplicates.'
      : '';
    if (
      !(await confirmAction(
        `Copy this browser's tasks, hours, journal and photo links into Supabase?${again}`,
        'Copy',
      ))
    ) {
      return;
    }
    await attempt(
      async () => {
        const result = await importLocalData(data);
        localStorage.setItem(IMPORTED_KEY, new Date().toISOString());
        await service.refresh();
        showToast(
          `Copied ${pluralize(result.tasks, 'task')} (${result.hours}h), ${pluralize(result.journal, 'journal entry', 'journal entries')} and ${pluralize(result.photos, 'photo')}.`,
        );
        syncButtons();
      },
      { button: event.currentTarget as HTMLButtonElement },
    );
  });

  removeSamples.addEventListener('click', async () => {
    if (await confirmAction('Remove all records marked "Sample"?', 'Remove samples')) {
      store.update(removeSampleData);
      syncButtons();
      showToast('Sample data removed.');
    }
  });

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('[data-action="load-samples"]');
    if (!button || remote) return;
    store.update(loadSampleData);
    syncButtons();
    closeDialog(dialog);
  });
}
