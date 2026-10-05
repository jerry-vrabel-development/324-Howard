import type { TaskStatus } from '../config/constants';
import { sampleData } from '../data/seed';
import type { AppData, JournalInput, PhotoInput, TaskInput } from '../types';
import { createId } from '../utils/id';

/**
 * Every change to app data is a pure function: (state, ...args) => new state.
 * No DOM, no storage, no clock unless passed in — which is what makes these
 * straightforward to unit test.
 */

const MS_PER_HOUR = 3_600_000;

// ---------- Photos ----------

export function addPhoto(state: AppData, input: PhotoInput): AppData {
  return { ...state, photos: [{ ...input, id: createId('photo') }, ...state.photos] };
}

export function deletePhoto(state: AppData, id: string): AppData {
  return { ...state, photos: state.photos.filter((p) => p.id !== id) };
}

// ---------- Tasks ----------

export function addTask(state: AppData, input: TaskInput): AppData {
  return {
    ...state,
    tasks: [{ ...input, id: createId('task'), loggedHours: 0 }, ...state.tasks],
  };
}

export function updateTask(state: AppData, id: string, input: TaskInput, now: number): AppData {
  // Completing a task with a running timer logs the time first.
  const next =
    input.status === 'completed' && state.activeTimer?.taskId === id
      ? stopTimer(state, now)
      : state;
  // Editing a sample task makes it yours, so "Remove sample data" won't delete it.
  return {
    ...next,
    tasks: next.tasks.map((t) => (t.id === id ? { ...t, ...input, sample: false } : t)),
  };
}

export function setTaskStatus(
  state: AppData,
  id: string,
  status: TaskStatus,
  now: number,
): AppData {
  const next =
    status === 'completed' && state.activeTimer?.taskId === id ? stopTimer(state, now) : state;
  return { ...next, tasks: next.tasks.map((t) => (t.id === id ? { ...t, status } : t)) };
}

export function deleteTask(state: AppData, id: string): AppData {
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== id),
    activeTimer: state.activeTimer?.taskId === id ? null : state.activeTimer,
  };
}

// ---------- Work timer ----------

export function elapsedMs(state: AppData, now: number): number {
  return state.activeTimer ? Math.max(0, now - state.activeTimer.startedAt) : 0;
}

export function startTimer(state: AppData, taskId: string, now: number): AppData {
  if (!state.tasks.some((t) => t.id === taskId)) return state;
  const base = state.activeTimer ? stopTimer(state, now) : state;
  return {
    ...base,
    activeTimer: { taskId, startedAt: now },
    tasks: base.tasks.map((t) =>
      t.id === taskId && t.status === 'todo' ? { ...t, status: 'in-progress' } : t,
    ),
  };
}

/**
 * Logs wall-clock time since the timer started, so throttled background tabs can't undercount.
 * Stored to 4 decimals (~0.4 s) so short sessions aren't rounded away.
 */
export function stopTimer(state: AppData, now: number): AppData {
  const timer = state.activeTimer;
  if (!timer) return state;
  const hours = elapsedMs(state, now) / MS_PER_HOUR;
  return {
    ...state,
    activeTimer: null,
    tasks: state.tasks.map((t) =>
      t.id === timer.taskId
        ? { ...t, loggedHours: Math.round((t.loggedHours + hours) * 10_000) / 10_000 }
        : t,
    ),
  };
}

/** Adds hand-entered time to a task (browser-only mode, which has no session history). */
export function addLoggedHours(state: AppData, taskId: string, hours: number): AppData {
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, loggedHours: Math.round((t.loggedHours + hours) * 10_000) / 10_000 }
        : t,
    ),
  };
}

export function toggleTimer(state: AppData, taskId: string, now: number): AppData {
  return state.activeTimer?.taskId === taskId
    ? stopTimer(state, now)
    : startTimer(state, taskId, now);
}

// ---------- Journal ----------

export function addJournalEntry(state: AppData, input: JournalInput): AppData {
  return { ...state, journal: [{ ...input, id: createId('entry') }, ...state.journal] };
}

export function deleteJournalEntry(state: AppData, id: string): AppData {
  return { ...state, journal: state.journal.filter((j) => j.id !== id) };
}

// ---------- Sample data ----------

export function hasSampleData(state: AppData): boolean {
  return [...state.photos, ...state.tasks, ...state.journal].some((r) => r.sample);
}

export function loadSampleData(state: AppData): AppData {
  const seed = sampleData();
  const has = (list: { id: string }[], id: string) => list.some((r) => r.id === id);
  return {
    ...state,
    photos: [...state.photos, ...seed.photos.filter((p) => !has(state.photos, p.id))],
    tasks: [...state.tasks, ...seed.tasks.filter((t) => !has(state.tasks, t.id))],
    journal: [...state.journal, ...seed.journal.filter((j) => !has(state.journal, j.id))],
  };
}

export function removeSampleData(state: AppData): AppData {
  const tasks = state.tasks.filter((t) => !t.sample);
  return {
    ...state,
    photos: state.photos.filter((p) => !p.sample),
    tasks,
    journal: state.journal.filter((j) => !j.sample),
    activeTimer: tasks.some((t) => t.id === state.activeTimer?.taskId) ? state.activeTimer : null,
  };
}
