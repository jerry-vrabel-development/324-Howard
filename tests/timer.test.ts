import { describe, expect, it } from 'vitest';
import {
  deleteTask,
  elapsedMs,
  setTaskStatus,
  startTimer,
  stopTimer,
  toggleTimer,
} from '../src/store/actions';
import { emptyData } from '../src/store/validate';
import type { AppData, Task } from '../src/types';
import { formatDuration } from '../src/utils/format';

const HOUR = 3_600_000;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Sister joists',
    room: 'basement',
    status: 'todo',
    priority: 'high',
    estimatedHours: 10,
    loggedHours: 1,
    notes: '',
    ...overrides,
  };
}

const withTasks = (...tasks: Task[]): AppData => ({ ...emptyData(), tasks });

describe('work timer', () => {
  it('logs wall-clock time, not ticks', () => {
    let s = startTimer(withTasks(task()), 't1', 0);
    s = stopTimer(s, 1.5 * HOUR);
    expect(s.tasks[0]?.loggedHours).toBe(2.5);
    expect(s.activeTimer).toBeNull();
  });

  it('moves a to-do task to in progress when started', () => {
    const s = startTimer(withTasks(task()), 't1', 0);
    expect(s.tasks[0]?.status).toBe('in-progress');
    expect(s.activeTimer).toEqual({ taskId: 't1', startedAt: 0 });
  });

  it('stops and logs the previous task when starting another', () => {
    let s = withTasks(task(), task({ id: 't2', loggedHours: 0 }));
    s = startTimer(s, 't1', 0);
    s = startTimer(s, 't2', HOUR);
    expect(s.tasks.find((t) => t.id === 't1')?.loggedHours).toBe(2);
    expect(s.activeTimer?.taskId).toBe('t2');
  });

  it('toggles off when toggled on the same task', () => {
    let s = toggleTimer(withTasks(task()), 't1', 0);
    s = toggleTimer(s, 't1', HOUR / 2);
    expect(s.activeTimer).toBeNull();
    expect(s.tasks[0]?.loggedHours).toBe(1.5);
  });

  it('logs time when a running task is marked completed', () => {
    let s = startTimer(withTasks(task()), 't1', 0);
    s = setTaskStatus(s, 't1', 'completed', HOUR);
    expect(s.activeTimer).toBeNull();
    expect(s.tasks[0]).toMatchObject({ status: 'completed', loggedHours: 2 });
  });

  it('clears the timer when its task is deleted', () => {
    const s = deleteTask(startTimer(withTasks(task()), 't1', 0), 't1');
    expect(s.activeTimer).toBeNull();
  });

  it('never reports negative elapsed time', () => {
    const s = startTimer(withTasks(task()), 't1', 5000);
    expect(elapsedMs(s, 1000)).toBe(0);
  });

  it('formats durations as HH:MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(3_723_000)).toBe('01:02:03');
  });
});
