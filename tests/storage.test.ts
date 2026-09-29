import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_KEYS, STORAGE_KEY } from '../src/config/constants';
import { addTask, loadSampleData, removeSampleData } from '../src/store/actions';
import { parseBackup, serializeBackup } from '../src/store/backup';
import { createLocalStorageAdapter } from '../src/store/storage';
import { DataError, emptyData } from '../src/store/validate';
import { normalizeDate } from '../src/utils/dates';

beforeEach(() => localStorage.clear());

describe('v1 migration', () => {
  it('converts the original single-file format and flags its demo records', () => {
    localStorage.setItem(
      LEGACY_KEYS.tasks,
      JSON.stringify([
        {
          id: 't1',
          title: 'Demo',
          room: 'Basement',
          status: 'In Progress',
          priority: 'High',
          estHours: 12,
          actHours: 6.5,
          notes: '',
        },
        {
          id: 't_1700000000000',
          title: 'Mine',
          room: 'Living Room',
          status: 'To Do',
          priority: 'Low',
          estHours: '3',
          actHours: 0,
          notes: 'x',
        },
      ]),
    );
    localStorage.setItem(
      LEGACY_KEYS.journal,
      JSON.stringify([
        { id: 'j_1', title: 'Note', tag: 'Materials & Costs', content: 'c', date: 'Sep 29, 2026' },
      ]),
    );

    const data = createLocalStorageAdapter().load();
    expect(data?.tasks).toEqual([
      {
        id: 't1',
        title: 'Demo',
        room: 'basement',
        status: 'in-progress',
        priority: 'high',
        estimatedHours: 12,
        loggedHours: 6.5,
        notes: '',
        sample: true,
      },
      {
        id: 't_1700000000000',
        title: 'Mine',
        room: 'living-room',
        status: 'todo',
        priority: 'low',
        estimatedHours: 3,
        loggedHours: 0,
        notes: 'x',
      },
    ]);
    expect(data?.journal[0]).toMatchObject({ tag: 'materials-costs', date: '2026-09-29' });
    expect(data?.photos).toEqual([]);
  });

  it('returns null when there is nothing to migrate', () => {
    expect(createLocalStorageAdapter().load()).toBeNull();
  });

  it('prefers v2 data over legacy keys', () => {
    const adapter = createLocalStorageAdapter();
    adapter.save(
      addTask(emptyData(), {
        title: 'New',
        room: 'kitchen',
        status: 'todo',
        priority: 'low',
        estimatedHours: 1,
        notes: '',
      }),
    );
    localStorage.setItem(LEGACY_KEYS.tasks, '[]');
    expect(adapter.load()?.tasks[0]?.title).toBe('New');
  });

  it('keeps a copy of unreadable data instead of crashing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(createLocalStorageAdapter().load()).toBeNull();
    const kept = Object.keys(localStorage).filter((k) => k.startsWith(`${STORAGE_KEY}:corrupt:`));
    expect(kept).toHaveLength(1);
  });
});

describe('backup', () => {
  it('round-trips through export and import', () => {
    const data = loadSampleData(emptyData());
    const { data: restored, skipped } = parseBackup(serializeBackup(data));
    expect(restored).toEqual(data);
    expect(skipped).toBe(0);
  });

  it('skips invalid records and reports how many', () => {
    const text = JSON.stringify({
      ...emptyData(),
      tasks: [{ id: 'x', title: 'Bad', room: 'attic' }],
    });
    expect(parseBackup(text)).toMatchObject({ skipped: 1, data: { tasks: [] } });
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow(DataError);
    expect(() => parseBackup('{"schemaVersion": 1}')).toThrow(/Unsupported backup version/);
  });
});

describe('sample data', () => {
  it('can be loaded twice without duplicates and removed cleanly', () => {
    const once = loadSampleData(emptyData());
    const twice = loadSampleData(once);
    expect(twice.tasks).toHaveLength(once.tasks.length);

    const mine = addTask(twice, {
      title: 'Real task',
      room: 'kitchen',
      status: 'todo',
      priority: 'low',
      estimatedHours: 1,
      notes: '',
    });
    const cleaned = removeSampleData(mine);
    expect(cleaned.tasks.map((t) => t.title)).toEqual(['Real task']);
    expect(cleaned.photos).toEqual([]);
    expect(cleaned.journal).toEqual([]);
  });
});

describe('normalizeDate', () => {
  it('handles every date format v1 produced', () => {
    expect(normalizeDate('2026-03-12')).toBe('2026-03-12');
    expect(normalizeDate('September 15, 2026')).toBe('2026-09-15');
    expect(normalizeDate('Sep 29, 2026')).toBe('2026-09-29');
    expect(normalizeDate('garbage')).toBeNull();
  });
});
