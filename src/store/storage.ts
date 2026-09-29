import { STORAGE_KEY } from '../config/constants';
import type { AppData } from '../types';
import { migrateLegacyData } from './migrate';
import { emptyData, parseAppData } from './validate';

/**
 * The rest of the app only knows about this interface. Swapping localStorage
 * for IndexedDB or a server API later means writing a new adapter, not
 * touching any UI code.
 */
export interface StorageAdapter {
  load(): AppData | null;
  save(data: AppData): void;
}

export class StorageError extends Error {}

export function createLocalStorageAdapter(
  storage: Storage = window.localStorage,
  key: string = STORAGE_KEY,
): StorageAdapter {
  return {
    load() {
      const stored = storage.getItem(key);
      if (stored !== null) {
        try {
          return parseAppData(JSON.parse(stored)).data;
        } catch (err) {
          console.error('Stored data could not be read; starting fresh.', err);
          // Keep the unreadable copy so it can be recovered by hand.
          storage.setItem(`${key}:corrupt:${Date.now()}`, stored);
          return null;
        }
      }
      return migrateLegacyData((k) => storage.getItem(k));
    },
    save(data) {
      try {
        storage.setItem(key, JSON.stringify(data));
      } catch (err) {
        const full = err instanceof DOMException && err.name === 'QuotaExceededError';
        throw new StorageError(
          full
            ? 'Browser storage is full. Export a backup, then remove some photos or entries.'
            : 'Your changes could not be saved in this browser.',
        );
      }
    },
  };
}

export function loadOrCreate(adapter: StorageAdapter): AppData {
  return adapter.load() ?? emptyData();
}
