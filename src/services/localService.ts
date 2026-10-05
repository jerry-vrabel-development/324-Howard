import * as actions from '../store/actions';
import type { Store } from '../store/store';
import type { DataService } from './dataService';

const unsupported = (what: string) => () =>
  Promise.reject(new Error(`${what} needs the online (Supabase) version of the site.`));

/** Browser-only data, as before Supabase: pure actions applied to the store, saved to localStorage. */
export function createLocalService(store: Store): DataService {
  const run = (fn: Parameters<Store['update']>[0]) => {
    store.update(fn);
    return Promise.resolve();
  };

  return {
    mode: 'local',
    refresh: () => Promise.resolve(),

    addTask: (input) => run((s) => actions.addTask(s, input)),
    updateTask: (id, input) => run((s) => actions.updateTask(s, id, input, Date.now())),
    setTaskStatus: (id, status) => run((s) => actions.setTaskStatus(s, id, status, Date.now())),
    deleteTask: (id) => run((s) => actions.deleteTask(s, id)),
    toggleTimer: (id) => run((s) => actions.toggleTimer(s, id, Date.now())),
    stopTimer: () => run((s) => actions.stopTimer(s, Date.now())),
    logTime: (id, input) => run((s) => actions.addLoggedHours(s, id, input.minutes / 60)),
    listSessions: () => Promise.resolve([]),
    deleteSession: unsupported('Editing logged time'),

    requestTask: unsupported('Task requests'),
    decideRequest: unsupported('Task requests'),
    listComments: () => Promise.resolve([]),
    addComment: unsupported('Feedback'),
    deleteComment: unsupported('Feedback'),

    addPhoto: ({ beforeFile: _b, afterFile: _a, beforeUrl = '', afterUrl = '', ...rest }) =>
      run((s) => actions.addPhoto(s, { ...rest, beforeUrl, afterUrl })),
    deletePhoto: (id) => run((s) => actions.deletePhoto(s, id)),

    addJournalEntry: (input) => run((s) => actions.addJournalEntry(s, input)),
    deleteJournalEntry: (id) => run((s) => actions.deleteJournalEntry(s, id)),

    replaceAll: (data) => run(() => data),
  };
}
