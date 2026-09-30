import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/backend/supabase', () => ({
  photoUrl: (p: string | null) => (p ? `https://cdn.test/${p}` : ''),
  supabase: () => ({}),
  check: <T>(r: { data: T }) => r.data,
}));

const { toPhoto, toTask, toJournalEntry } = await import('../src/services/remoteService');
const { fitWithin } = await import('../src/utils/image');
const { computeStats, groupByStatus } = await import('../src/features/tasks/filters');

describe('Supabase row mapping', () => {
  it('maps tasks, hours and comment counts', () => {
    const task = toTask(
      {
        id: 't1',
        title: 'Joists',
        room: 'basement',
        status: 'requested',
        priority: 'high',
        estimated_hours: '12.50',
        notes: '',
        requested_by: 'u2',
        task_comments: [{ count: 3 }],
      },
      new Map([['t1', 6.5]]),
    );
    expect(task).toMatchObject({
      estimatedHours: 12.5,
      loggedHours: 6.5,
      status: 'requested',
      requestedBy: 'u2',
      commentCount: 3,
    });
  });

  it('drops rows with unknown values instead of crashing', () => {
    const row = {
      id: 'x',
      title: 'x',
      room: 'attic',
      status: 'todo',
      priority: 'low',
      estimated_hours: 0,
      notes: '',
      requested_by: null,
      task_comments: [],
    };
    expect(toTask(row, new Map())).toBeNull();
    expect(
      toJournalEntry({ id: 'j', title: 'j', tag: 'nope', content: '', entry_date: '2026-01-01' }),
    ).toBeNull();
  });

  it('turns storage paths into URLs and keeps single photos single', () => {
    const photo = toPhoto({
      id: 'p',
      room: 'kitchen',
      title: 'Sink',
      description: '',
      before_path: null,
      after_path: 'abc.webp',
      taken_on: '2026-09-29',
    });
    expect(photo).toMatchObject({ beforeUrl: '', afterUrl: 'https://cdn.test/abc.webp' });
  });
});

describe('requests stay off the board', () => {
  const base = {
    room: 'kitchen',
    priority: 'low',
    estimatedHours: 1,
    loggedHours: 0,
    notes: '',
  } as const;
  const tasks = [
    { ...base, id: 'a', title: 'a', status: 'todo' },
    { ...base, id: 'b', title: 'b', status: 'requested' },
    { ...base, id: 'c', title: 'c', status: 'declined' },
    { ...base, id: 'd', title: 'd', status: 'completed' },
  ] as const;

  it('groups only board statuses', () => {
    const groups = groupByStatus([...tasks]);
    expect(
      Object.values(groups)
        .flat()
        .map((t) => t.id),
    ).toEqual(['a', 'd']);
  });

  it('excludes requests from progress', () => {
    expect(computeStats([...tasks]).progressPct).toBe(50);
  });
});

describe('fitWithin', () => {
  it('scales the long side down and never up', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
