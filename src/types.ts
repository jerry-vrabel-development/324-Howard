import type { JournalTag, Priority, RoomId, TaskStatus } from './config/constants';

/** Calendar date in YYYY-MM-DD form (local time, no timezone). */
export type IsoDate = string;

export interface Photo {
  id: string;
  room: RoomId;
  title: string;
  description: string;
  beforeUrl: string;
  afterUrl: string;
  date: IsoDate;
  sample?: boolean;
  /** Committed to the repo (src/content/showcase.json) and shown to every visitor. Read-only in the app. */
  published?: boolean;
}

export interface Task {
  id: string;
  title: string;
  room: RoomId;
  status: TaskStatus;
  priority: Priority;
  estimatedHours: number;
  loggedHours: number;
  notes: string;
  sample?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  tag: JournalTag;
  content: string;
  date: IsoDate;
  sample?: boolean;
}

export interface ActiveTimer {
  taskId: string;
  /** Epoch milliseconds. Elapsed time is always derived from this, never counted. */
  startedAt: number;
}

export interface AppData {
  schemaVersion: 2;
  photos: Photo[];
  tasks: Task[];
  journal: JournalEntry[];
  activeTimer: ActiveTimer | null;
}

export type PhotoInput = Omit<Photo, 'id' | 'sample' | 'published'>;
export type TaskInput = Omit<Task, 'id' | 'sample' | 'loggedHours'>;
export type JournalInput = Omit<JournalEntry, 'id' | 'sample'>;
