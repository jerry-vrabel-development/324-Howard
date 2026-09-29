import type { AppData } from '../types';
import type { StorageAdapter } from './storage';

export type Listener = (state: AppData, previous: AppData) => void;
export type ErrorHandler = (error: unknown) => void;

export interface Store {
  getState(): AppData;
  /** Apply a pure transition, persist it, then notify subscribers. */
  update(transition: (state: AppData) => AppData): void;
  /** Swap in state that is already persisted (e.g. changed in another tab). Does not save. */
  replace(next: AppData): void;
  subscribe(listener: Listener): () => void;
}

export function createStore(
  initial: AppData,
  adapter: StorageAdapter,
  onError: ErrorHandler = (e) => console.error(e),
): Store {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    update(transition) {
      const previous = state;
      const next = transition(state);
      if (next === previous) return;
      state = next;
      try {
        adapter.save(state);
      } catch (err) {
        // Keep the in-memory change (the user can still export a backup) but say so.
        onError(err);
      }
      listeners.forEach((listener) => listener(state, previous));
    },
    replace(next) {
      const previous = state;
      state = next;
      listeners.forEach((listener) => listener(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
