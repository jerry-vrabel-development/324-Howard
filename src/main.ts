import './styles/main.css';

import { initAuth, takeSignInErrorFromUrl } from './backend/auth';
import { setViewer } from './backend/viewer';
import { initDialogs } from './components/dialog';
import { hydrateIcons } from './components/icons';
import { initTabs } from './components/tabs';
import { errorMessage, showToast } from './components/toast';
import { DATA_MODE } from './config/supabase';
import { STORAGE_KEY } from './config/constants';
import { initAccount } from './features/account/account';
import { initBackupPanel } from './features/backup/backupPanel';
import { initHome } from './features/home/home';
import { initJournal } from './features/journal/journal';
import { initShowcase } from './features/showcase/showcase';
import { initTaskBoard } from './features/tasks/board';
import { initTimerBanner } from './features/timer/timerBanner';
import { createLocalService } from './services/localService';
import { createRemoteService } from './services/remoteService';
import type { DataService } from './services/dataService';
import { createLocalStorageAdapter, loadOrCreate, type StorageAdapter } from './store/storage';
import { createStore, type Store } from './store/store';
import { emptyData } from './store/validate';
import { byId } from './utils/dom';

const reportError = (err: unknown) => showToast(errorMessage(err), 'error', 10_000);

/** Supabase data lives in the database, not the browser, so the store doesn't persist it. */
const memoryOnly: StorageAdapter = { load: () => null, save: () => {} };

async function setUpData(local: StorageAdapter): Promise<{ store: Store; service: DataService }> {
  if (DATA_MODE === 'local') {
    setViewer({ mode: 'local', role: 'admin', userId: null, email: null, name: '' });
    const store = createStore(loadOrCreate(local), local, reportError);
    // Keep two open windows in sync.
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      const fresh = local.load();
      if (fresh) store.replace(fresh);
    });
    return { store, service: createLocalService(store) };
  }

  const store = createStore(emptyData(), memoryOnly, reportError);
  const service = createRemoteService(store);
  const refresh = () => service.refresh().catch(reportError);

  // Must finish before the tabs read the URL: a sign-in link puts the session there.
  await initAuth(refresh);
  const signInError = takeSignInErrorFromUrl();
  if (signInError) showToast(signInError, 'error', 12_000);
  // Load in the background so the page appears immediately.
  void refresh();

  // Pick up changes made on another device when coming back to this tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
  });
  return { store, service };
}

async function main(): Promise<void> {
  const local = createLocalStorageAdapter();
  const { store, service } = await setUpData(local);

  initDialogs();
  initAccount();
  const home = initHome();
  initShowcase(store, service);
  initTaskBoard(store, service);
  initTimerBanner(store, service);
  initJournal(store, service);
  initBackupPanel(store, service, local);

  let firstTab = true;
  initTabs(byId('main-tabs'), (tab) => {
    home.onTabChange(tab);
    // Switching pages should start at the top, like following a link.
    if (!firstTab) window.scrollTo({ top: 0 });
    firstTab = false;
  });
  hydrateIcons();
  document.body.classList.remove('is-loading');
}

main().catch(reportError);
