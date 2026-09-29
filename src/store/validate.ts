import {
  SCHEMA_VERSION,
  isJournalTag,
  isPriority,
  isRoomId,
  isTaskStatus,
} from '../config/constants';
import type { ActiveTimer, AppData, JournalEntry, Photo, Task } from '../types';
import { isIsoDate } from '../utils/dates';

/**
 * Everything that enters the app from outside (localStorage, an imported
 * backup file) goes through here. Bad records are dropped and counted rather
 * than crashing the app — the original called JSON.parse with no guard.
 */

export class DataError extends Error {}

export interface ParseResult {
  data: AppData;
  skipped: number;
}

type Rec = Record<string, unknown>;

const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nonNegative = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const sampleFlag = (v: Rec): { sample?: true } => (v.sample === true ? { sample: true } : {});

export function toPhoto(v: unknown): Photo | null {
  if (!isRecord(v)) return null;
  const id = str(v.id);
  const title = str(v.title).trim();
  if (!id || !title || !isRoomId(v.room) || !isIsoDate(v.date)) return null;
  return {
    id,
    room: v.room,
    title,
    description: str(v.description),
    beforeUrl: str(v.beforeUrl),
    afterUrl: str(v.afterUrl),
    date: v.date,
    ...sampleFlag(v),
  };
}

export function toTask(v: unknown): Task | null {
  if (!isRecord(v)) return null;
  const id = str(v.id);
  const title = str(v.title).trim();
  if (!id || !title || !isRoomId(v.room) || !isTaskStatus(v.status) || !isPriority(v.priority)) {
    return null;
  }
  return {
    id,
    title,
    room: v.room,
    status: v.status,
    priority: v.priority,
    estimatedHours: nonNegative(v.estimatedHours),
    loggedHours: nonNegative(v.loggedHours),
    notes: str(v.notes),
    ...sampleFlag(v),
  };
}

export function toJournalEntry(v: unknown): JournalEntry | null {
  if (!isRecord(v)) return null;
  const id = str(v.id);
  const title = str(v.title).trim();
  if (!id || !title || !isJournalTag(v.tag) || !isIsoDate(v.date)) return null;
  return { id, title, tag: v.tag, content: str(v.content), date: v.date, ...sampleFlag(v) };
}

function toActiveTimer(v: unknown, tasks: Task[]): ActiveTimer | null {
  if (!isRecord(v)) return null;
  const taskId = str(v.taskId);
  const startedAt = Number(v.startedAt);
  if (!tasks.some((t) => t.id === taskId) || !Number.isFinite(startedAt)) return null;
  return { taskId, startedAt };
}

function collect<T>(list: unknown, convert: (v: unknown) => T | null): [T[], number] {
  if (!Array.isArray(list)) return [[], 0];
  const out: T[] = [];
  for (const item of list) {
    const converted = convert(item);
    if (converted) out.push(converted);
  }
  return [out, list.length - out.length];
}

export function parseAppData(input: unknown): ParseResult {
  if (!isRecord(input)) throw new DataError('That file is not a 324 S Howard St backup.');
  if (input.schemaVersion !== SCHEMA_VERSION) {
    throw new DataError(
      `Unsupported backup version (${String(input.schemaVersion)}). Expected version ${SCHEMA_VERSION}.`,
    );
  }
  const [photos, badPhotos] = collect(input.photos, toPhoto);
  const [tasks, badTasks] = collect(input.tasks, toTask);
  const [journal, badJournal] = collect(input.journal, toJournalEntry);
  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      photos,
      tasks,
      journal,
      activeTimer: toActiveTimer(input.activeTimer, tasks),
    },
    skipped: badPhotos + badTasks + badJournal,
  };
}

export function emptyData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, photos: [], tasks: [], journal: [], activeTimer: null };
}
