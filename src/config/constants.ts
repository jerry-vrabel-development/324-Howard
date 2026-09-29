/**
 * Single source of truth for every enumerated value in the app.
 * Stored records use the stable `id`; the UI shows the `label`.
 * Add a room here and it appears in every filter and form automatically.
 */

export const ROOMS = [
  { id: 'exterior', label: 'Exterior / Yard' },
  { id: 'living-room', label: 'Living Room' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'master-bedroom', label: 'Master Bedroom' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'basement', label: 'Basement' },
  { id: 'general', label: 'General / Structure' },
] as const;

export const TASK_STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
] as const;

export const PRIORITIES = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
] as const;

export const JOURNAL_TAGS = [
  { id: 'historical-finding', label: 'Historical Finding' },
  { id: 'plumbing-electrical', label: 'Plumbing & Electrical' },
  { id: 'framing-drywall', label: 'Framing & Drywall' },
  { id: 'materials-costs', label: 'Materials & Costs' },
  { id: 'live-in-reflection', label: 'Live-In Reflection' },
] as const;

export type RoomId = (typeof ROOMS)[number]['id'];
export type TaskStatus = (typeof TASK_STATUSES)[number]['id'];
export type Priority = (typeof PRIORITIES)[number]['id'];
export type JournalTag = (typeof JOURNAL_TAGS)[number]['id'];

export interface Option {
  readonly id: string;
  readonly label: string;
}

function labelFor(list: readonly Option[], id: string): string {
  return list.find((o) => o.id === id)?.label ?? id;
}

export const roomLabel = (id: string) => labelFor(ROOMS, id);
export const statusLabel = (id: string) => labelFor(TASK_STATUSES, id);
export const priorityLabel = (id: string) => labelFor(PRIORITIES, id);
export const tagLabel = (id: string) => labelFor(JOURNAL_TAGS, id);

export const isRoomId = (v: unknown): v is RoomId => ROOMS.some((o) => o.id === v);
export const isTaskStatus = (v: unknown): v is TaskStatus => TASK_STATUSES.some((o) => o.id === v);
export const isPriority = (v: unknown): v is Priority => PRIORITIES.some((o) => o.id === v);
export const isJournalTag = (v: unknown): v is JournalTag => JOURNAL_TAGS.some((o) => o.id === v);

export const STORAGE_KEY = 'howard324:data';
export const SCHEMA_VERSION = 2;

/** localStorage keys used by the original single-file version (v1). */
export const LEGACY_KEYS = {
  photos: 'm324_photos_v1',
  tasks: 'm324_tasks_v1',
  journal: 'm324_journal_v1',
} as const;

/** Ids of the demo records the v1 app wrote into storage on first load. */
export const LEGACY_SAMPLE_IDS = new Set(['p1', 'p2', 'p3', 't1', 't2', 't3', 't4', 'j1', 'j2']);
