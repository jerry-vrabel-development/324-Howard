import {
  isBoardStatus,
  type BoardStatus,
  type Priority,
  type RoomId,
} from '../../config/constants';
import type { Task } from '../../types';

export interface TaskFilters {
  query: string;
  room: RoomId | 'all';
  priority: Priority | 'all';
}

export const DEFAULT_FILTERS: TaskFilters = { query: '', room: 'all', priority: 'all' };

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  roomLabel: (id: string) => string,
): Task[] {
  const q = filters.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filters.room !== 'all' && t.room !== filters.room) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (!q) return true;
    return [t.title, t.notes, roomLabel(t.room)].some((field) => field.toLowerCase().includes(q));
  });
}

/** Board columns only; requested/declined tasks are shown separately. */
export function groupByStatus(tasks: Task[]): Record<BoardStatus, Task[]> {
  const groups: Record<BoardStatus, Task[]> = { todo: [], 'in-progress': [], completed: [] };
  for (const t of tasks) if (isBoardStatus(t.status)) groups[t.status].push(t);
  for (const list of Object.values(groups)) {
    list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }
  return groups;
}

export interface TaskStats {
  progressPct: number;
  loggedHours: number;
  estimatedHours: number;
  pending: number;
}

/** Stats always describe the whole project (board tasks only), not the current filter. */
export function computeStats(allTasks: Task[]): TaskStats {
  const tasks = allTasks.filter((t) => isBoardStatus(t.status));
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const sum = (pick: (t: Task) => number) =>
    Math.round(tasks.reduce((acc, t) => acc + pick(t), 0) * 100) / 100;
  return {
    progressPct: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    loggedHours: sum((t) => t.loggedHours),
    estimatedHours: sum((t) => t.estimatedHours),
    pending: tasks.length - completed,
  };
}
