import { PHOTO_BUCKET } from '../config/supabase';
import { isJournalTag, isPriority, isRoomId, isTaskStatus } from '../config/constants';
import { check, photoUrl, supabase } from '../backend/supabase';
import { getViewer, isMember } from '../backend/viewer';
import type { Store } from '../store/store';
import type { ActiveTimer, AppData, JournalEntry, Photo, Task, TaskComment } from '../types';
import { isIsoDate, todayIso } from '../utils/dates';
import { prepareImage } from '../utils/image';
import type { DataService } from './dataService';

// ---------- Row types (what PostgREST returns) ----------

interface PhotoRow {
  id: string;
  room: string;
  title: string;
  description: string;
  before_path: string | null;
  after_path: string;
  taken_on: string;
}

interface TaskRow {
  id: string;
  title: string;
  room: string;
  status: string;
  priority: string;
  estimated_hours: number | string;
  notes: string;
  requested_by: string | null;
  task_comments: { count: number }[];
}

interface JournalRow {
  id: string;
  title: string;
  tag: string;
  content: string;
  entry_date: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { display_name: string } | null;
}

// ---------- Mapping rows to the app's types ----------

export function toPhoto(row: PhotoRow): Photo | null {
  if (!isRoomId(row.room)) return null;
  return {
    id: row.id,
    room: row.room,
    title: row.title,
    description: row.description,
    beforeUrl: photoUrl(row.before_path),
    afterUrl: photoUrl(row.after_path),
    date: isIsoDate(row.taken_on) ? row.taken_on : todayIso(),
  };
}

export function toTask(row: TaskRow, hours: Map<string, number>): Task | null {
  if (!isRoomId(row.room) || !isTaskStatus(row.status) || !isPriority(row.priority)) return null;
  return {
    id: row.id,
    title: row.title,
    room: row.room,
    status: row.status,
    priority: row.priority,
    estimatedHours: Number(row.estimated_hours) || 0,
    loggedHours: hours.get(row.id) ?? 0,
    notes: row.notes,
    ...(row.requested_by ? { requestedBy: row.requested_by } : {}),
    commentCount: row.task_comments[0]?.count ?? 0,
  };
}

export function toJournalEntry(row: JournalRow): JournalEntry | null {
  if (!isJournalTag(row.tag)) return null;
  return {
    id: row.id,
    title: row.title,
    tag: row.tag,
    content: row.content,
    date: isIsoDate(row.entry_date) ? row.entry_date : todayIso(),
  };
}

const notNull = <T>(v: T | null): v is T => v !== null;

// ---------- Loading ----------

async function loadAll(): Promise<AppData> {
  const db = supabase();
  const [photos, journal] = await Promise.all([
    db.from('photos').select('*').order('taken_on', { ascending: false }),
    db.from('journal_entries').select('*').order('entry_date', { ascending: false }),
  ]);

  let tasks: Task[] = [];
  let activeTimer: ActiveTimer | null = null;

  // Tasks are private: visitors don't even query them.
  if (isMember()) {
    const [taskRows, hourRows, running] = await Promise.all([
      db.from('tasks').select('*, task_comments(count)').order('created_at', { ascending: false }),
      db.from('task_hours').select('task_id, logged_hours'),
      getViewer().role === 'admin'
        ? db
            .from('work_sessions')
            .select('task_id, started_at')
            .is('ended_at', null)
            .eq('user_id', getViewer().userId ?? '')
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const hours = new Map(
      ((check(hourRows) ?? []) as { task_id: string; logged_hours: number | string }[]).map((h) => [
        h.task_id,
        Number(h.logged_hours) || 0,
      ]),
    );
    tasks = (check(taskRows) as TaskRow[]).map((r) => toTask(r, hours)).filter(notNull);
    const session = check(running) as { task_id: string; started_at: string } | null;
    if (session)
      activeTimer = { taskId: session.task_id, startedAt: Date.parse(session.started_at) };
  }

  return {
    schemaVersion: 2,
    photos: (check(photos) as PhotoRow[]).map(toPhoto).filter(notNull),
    journal: (check(journal) as JournalRow[]).map(toJournalEntry).filter(notNull),
    tasks,
    activeTimer,
  };
}

async function uploadPhoto(file: File): Promise<string> {
  const image = await prepareImage(file);
  const path = `${crypto.randomUUID()}.${image.extension}`;
  check(
    await supabase()
      .storage.from(PHOTO_BUCKET)
      .upload(path, image.blob, { contentType: image.blob.type, cacheControl: '31536000' }),
  );
  return path;
}

// ---------- The service ----------

export function createRemoteService(store: Store): DataService {
  const db = () => supabase();

  async function refresh(): Promise<void> {
    store.replace(await loadAll());
  }

  /** Run a write, then reload so every view reflects what the database accepted. */
  async function write(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } finally {
      await refresh();
    }
  }

  async function stopRunning(): Promise<void> {
    check(
      await db()
        .from('work_sessions')
        .update({ ended_at: new Date().toISOString() })
        .is('ended_at', null)
        .eq('user_id', getViewer().userId ?? ''),
    );
  }

  const taskFields = (input: {
    title: string;
    room: string;
    priority: string;
    notes: string;
    estimatedHours?: number;
  }) => ({
    title: input.title,
    room: input.room,
    priority: input.priority,
    notes: input.notes,
    ...(input.estimatedHours === undefined ? {} : { estimated_hours: input.estimatedHours }),
  });

  return {
    mode: 'remote',
    refresh,

    addTask: (input) =>
      write(async () =>
        check(
          await db()
            .from('tasks')
            .insert({ ...taskFields(input), status: input.status }),
        ),
      ),

    updateTask: (id, input) =>
      write(async () => {
        if (input.status === 'completed' && store.getState().activeTimer?.taskId === id) {
          await stopRunning();
        }
        check(
          await db()
            .from('tasks')
            .update({ ...taskFields(input), status: input.status })
            .eq('id', id),
        );
      }),

    setTaskStatus: (id, status) =>
      write(async () => {
        if (status === 'completed' && store.getState().activeTimer?.taskId === id) {
          await stopRunning();
        }
        check(await db().from('tasks').update({ status }).eq('id', id));
      }),

    deleteTask: (id) => write(async () => check(await db().from('tasks').delete().eq('id', id))),

    toggleTimer: (taskId) =>
      write(async () => {
        const running = store.getState().activeTimer;
        await stopRunning();
        if (running?.taskId === taskId) return; // that was a "stop"
        check(await db().from('work_sessions').insert({ task_id: taskId }));
        const task = store.getState().tasks.find((t) => t.id === taskId);
        if (task?.status === 'todo') {
          check(await db().from('tasks').update({ status: 'in-progress' }).eq('id', taskId));
        }
      }),

    stopTimer: () => write(stopRunning),

    requestTask: (input) =>
      write(async () =>
        check(
          await db()
            .from('tasks')
            .insert({
              ...taskFields(input),
              status: 'requested',
              requested_by: getViewer().userId,
            }),
        ),
      ),

    decideRequest: (id, accept) =>
      write(async () =>
        check(
          await db()
            .from('tasks')
            .update({ status: accept ? 'todo' : 'declined' })
            .eq('id', id),
        ),
      ),

    async listComments(taskId) {
      const rows = check(
        await db()
          .from('task_comments')
          .select('id, task_id, author_id, body, created_at, author:profiles(display_name)')
          .eq('task_id', taskId)
          .order('created_at'),
      ) as unknown as CommentRow[];
      return rows.map((r): TaskComment => ({
        id: r.id,
        taskId: r.task_id,
        authorId: r.author_id,
        authorName: r.author?.display_name || 'Member',
        body: r.body,
        createdAt: r.created_at,
      }));
    },

    addComment: (taskId, body) =>
      write(async () => check(await db().from('task_comments').insert({ task_id: taskId, body }))),

    deleteComment: (id) =>
      write(async () => check(await db().from('task_comments').delete().eq('id', id))),

    addPhoto: (input) =>
      write(async () => {
        if (!input.afterFile)
          throw new Error('Choose an "after" photo (or the single progress photo).');
        const [afterPath, beforePath] = await Promise.all([
          uploadPhoto(input.afterFile),
          input.beforeFile ? uploadPhoto(input.beforeFile) : Promise.resolve(null),
        ]);
        check(
          await db().from('photos').insert({
            room: input.room,
            title: input.title,
            description: input.description,
            before_path: beforePath,
            after_path: afterPath,
            taken_on: input.date,
          }),
        );
      }),

    deletePhoto: (id) =>
      write(async () => {
        const row = check(
          await db().from('photos').select('before_path, after_path').eq('id', id).single(),
        ) as Pick<PhotoRow, 'before_path' | 'after_path'>;
        check(await db().from('photos').delete().eq('id', id));
        const files = [row.before_path, row.after_path].filter(
          (p): p is string => Boolean(p) && !/^https?:/i.test(p as string),
        );
        if (files.length) check(await db().storage.from(PHOTO_BUCKET).remove(files));
      }),

    addJournalEntry: (input) =>
      write(async () =>
        check(
          await db().from('journal_entries').insert({
            title: input.title,
            tag: input.tag,
            content: input.content,
            entry_date: input.date,
          }),
        ),
      ),

    deleteJournalEntry: (id) =>
      write(async () => check(await db().from('journal_entries').delete().eq('id', id))),
  };
}

// ---------- One-time import of the browser's data ----------

export interface ImportSummary {
  tasks: number;
  journal: number;
  photos: number;
  hours: number;
}

/** Copies non-sample browser data into Supabase. Logged hours become one past work session per task. */
export async function importLocalData(data: AppData): Promise<ImportSummary> {
  const db = supabase();
  const summary: ImportSummary = { tasks: 0, journal: 0, photos: 0, hours: 0 };
  const now = Date.now();

  for (const task of data.tasks.filter((t) => !t.sample)) {
    const inserted = check(
      await db
        .from('tasks')
        .insert({
          title: task.title,
          room: task.room,
          status: task.status,
          priority: task.priority,
          estimated_hours: task.estimatedHours,
          notes: task.notes,
        })
        .select('id')
        .single(),
    ) as { id: string };
    summary.tasks++;
    if (task.loggedHours > 0) {
      check(
        await db.from('work_sessions').insert({
          task_id: inserted.id,
          started_at: new Date(now - task.loggedHours * 3_600_000).toISOString(),
          ended_at: new Date(now).toISOString(),
          note: 'Imported from the browser version',
        }),
      );
      summary.hours += task.loggedHours;
    }
  }

  const entries = data.journal.filter((j) => !j.sample);
  if (entries.length) {
    check(
      await db.from('journal_entries').insert(
        entries.map((j) => ({
          title: j.title,
          tag: j.tag,
          content: j.content,
          entry_date: j.date,
        })),
      ),
    );
    summary.journal = entries.length;
  }

  // Photos added in the browser were URLs; keep them as URLs.
  const photos = data.photos.filter((p) => !p.sample && !p.published && p.afterUrl);
  if (photos.length) {
    check(
      await db.from('photos').insert(
        photos.map((p) => ({
          room: p.room,
          title: p.title,
          description: p.description,
          before_path: p.beforeUrl || null,
          after_path: p.afterUrl,
          taken_on: p.date,
        })),
      ),
    );
    summary.photos = photos.length;
  }

  summary.hours = Math.round(summary.hours * 100) / 100;
  return summary;
}
