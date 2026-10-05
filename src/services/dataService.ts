import type { BoardStatus } from '../config/constants';
import type {
  AppData,
  JournalInput,
  ManualTimeInput,
  PhotoInput,
  TaskComment,
  TaskInput,
  WorkSession,
} from '../types';

export interface NewPhoto extends Omit<PhotoInput, 'beforeUrl' | 'afterUrl'> {
  /** Files picked in the form (phone camera or library). Uploaded after resizing. */
  beforeFile?: File | null;
  afterFile?: File | null;
  /** Or existing URLs (local mode). */
  beforeUrl?: string;
  afterUrl?: string;
}

export type RequestInput = Pick<TaskInput, 'title' | 'room' | 'priority' | 'notes'>;

/**
 * Everything the UI can change. Two implementations:
 *   LocalService   — this browser only (localStorage), used when Supabase is off
 *   RemoteService  — Supabase; the database decides what each role may do
 *
 * Both keep the shared Store up to date, so rendering code is identical.
 */
export interface DataService {
  readonly mode: 'local' | 'remote';
  refresh(): Promise<void>;

  addTask(input: TaskInput): Promise<void>;
  updateTask(id: string, input: TaskInput): Promise<void>;
  setTaskStatus(id: string, status: BoardStatus): Promise<void>;
  deleteTask(id: string): Promise<void>;
  toggleTimer(taskId: string): Promise<void>;
  stopTimer(): Promise<void>;
  /** Time entered by hand, for work done without the timer running. */
  logTime(taskId: string, input: ManualTimeInput): Promise<void>;
  listSessions(taskId: string): Promise<WorkSession[]>;
  deleteSession(id: string): Promise<void>;

  requestTask(input: RequestInput): Promise<void>;
  decideRequest(id: string, accept: boolean): Promise<void>;
  listComments(taskId: string): Promise<TaskComment[]>;
  addComment(taskId: string, body: string): Promise<void>;
  deleteComment(id: string): Promise<void>;

  addPhoto(input: NewPhoto): Promise<void>;
  deletePhoto(id: string): Promise<void>;

  addJournalEntry(input: JournalInput): Promise<void>;
  deleteJournalEntry(id: string): Promise<void>;

  /** Replace all data (local backup restore). Local mode only. */
  replaceAll?(data: AppData): Promise<void>;
}
