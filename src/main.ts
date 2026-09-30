import './styles/main.css';

import { initDialogs } from './components/dialog';
import { hydrateIcons } from './components/icons';
import { initTabs } from './components/tabs';
import { errorMessage, showToast } from './components/toast';
import { initBackupPanel } from './features/backup/backupPanel';
import { initHome } from './features/home/home';
import { initJournal } from './features/journal/journal';
import { initShowcase } from './features/showcase/showcase';
import { initTaskBoard } from './features/tasks/board';
import { initTimerBanner } from './features/timer/timerBanner';
import { createLocalStorageAdapter, loadOrCreate } from './store/storage';
import { createStore } from './store/store';
import { byId } from './utils/dom';
import { STORAGE_KEY } from './config/constants';

const adapter = createLocalStorageAdapter();
const store = createStore(loadOrCreate(adapter), adapter, (err) =>
  showToast(errorMessage(err), 'error', 10_000),
);

initDialogs();
const home = initHome();
let firstTab = true;
initTabs(byId('main-tabs'), (tab) => {
  home.onTabChange(tab);
  // Switching pages should start at the top, like following a link.
  if (!firstTab) window.scrollTo({ top: 0 });
  firstTab = false;
});
initShowcase(store);
initTaskBoard(store);
initTimerBanner(store);
initJournal(store);
initBackupPanel(store);
hydrateIcons();

// Keep tabs in sync if the app is open in two windows.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    const fresh = adapter.load();
    if (fresh) store.replace(fresh);
  }
});
