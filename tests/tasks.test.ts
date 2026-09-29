import { describe, expect, it } from 'vitest';
import { roomLabel } from '../src/config/constants';
import {
  computeStats,
  filterTasks,
  groupByStatus,
  DEFAULT_FILTERS,
} from '../src/features/tasks/filters';
import type { Task } from '../src/types';

const tasks: Task[] = [
  {
    id: 'a',
    title: 'Tile shower',
    room: 'bathroom',
    status: 'todo',
    priority: 'low',
    estimatedHours: 16,
    loggedHours: 0,
    notes: 'subway tile',
  },
  {
    id: 'b',
    title: 'Sister joists',
    room: 'basement',
    status: 'in-progress',
    priority: 'high',
    estimatedHours: 12,
    loggedHours: 6.5,
    notes: '',
  },
  {
    id: 'c',
    title: 'Refinish doors',
    room: 'master-bedroom',
    status: 'completed',
    priority: 'medium',
    estimatedHours: 8,
    loggedHours: 8.5,
    notes: '',
  },
  {
    id: 'd',
    title: 'Fix vanity',
    room: 'bathroom',
    status: 'todo',
    priority: 'high',
    estimatedHours: 2,
    loggedHours: 0,
    notes: '',
  },
];

describe('filterTasks', () => {
  it('returns everything with default filters', () => {
    expect(filterTasks(tasks, DEFAULT_FILTERS, roomLabel)).toHaveLength(4);
  });

  it('searches title, notes and room label', () => {
    const q = (query: string) =>
      filterTasks(tasks, { ...DEFAULT_FILTERS, query }, roomLabel).map((t) => t.id);
    expect(q('SUBWAY')).toEqual(['a']);
    expect(q('master bed')).toEqual(['c']);
  });

  it('combines room and priority filters', () => {
    const result = filterTasks(tasks, { query: '', room: 'bathroom', priority: 'high' }, roomLabel);
    expect(result.map((t) => t.id)).toEqual(['d']);
  });
});

describe('groupByStatus', () => {
  it('groups by status and sorts by priority', () => {
    const groups = groupByStatus(tasks);
    expect(groups.todo.map((t) => t.id)).toEqual(['d', 'a']);
    expect(groups['in-progress'].map((t) => t.id)).toEqual(['b']);
    expect(groups.completed.map((t) => t.id)).toEqual(['c']);
  });
});

describe('computeStats', () => {
  it('summarizes the whole project', () => {
    expect(computeStats(tasks)).toEqual({
      progressPct: 25,
      loggedHours: 15,
      estimatedHours: 38,
      pending: 3,
    });
  });
  it('handles an empty project', () => {
    expect(computeStats([])).toEqual({
      progressPct: 0,
      loggedHours: 0,
      estimatedHours: 0,
      pending: 0,
    });
  });
});
