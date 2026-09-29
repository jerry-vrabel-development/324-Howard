import {
  JOURNAL_TAGS,
  LEGACY_KEYS,
  LEGACY_SAMPLE_IDS,
  PRIORITIES,
  SCHEMA_VERSION,
  TASK_STATUSES,
  type RoomId,
} from '../config/constants';
import type { AppData } from '../types';
import { normalizeDate, todayIso } from '../utils/dates';
import { toJournalEntry, toPhoto, toTask } from './validate';

/**
 * Converts data saved by the original single-file app (three separate
 * localStorage keys, display labels stored as values, mixed date formats)
 * into the v2 schema. The legacy keys are left untouched so nothing is lost
 * if you ever need to roll back.
 */

const LEGACY_ROOMS: Record<string, RoomId> = {
  exterior: 'exterior',
  'living room': 'living-room',
  kitchen: 'kitchen',
  'master bedroom': 'master-bedroom',
  bathroom: 'bathroom',
  basement: 'basement',
  general: 'general',
};

function byLabel<T extends { id: string; label: string }>(list: readonly T[], label: unknown) {
  return list.find((o) => o.label.toLowerCase() === String(label).toLowerCase())?.id;
}

function readJsonArray(read: (key: string) => string | null, key: string): unknown[] | null {
  const rawValue = read(key);
  if (rawValue === null) return null;
  try {
    const parsed: unknown = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type Legacy = Record<string, unknown>;
const asLegacy = (v: unknown): Legacy => (typeof v === 'object' && v !== null ? (v as Legacy) : {});
const isSample = (id: unknown) => LEGACY_SAMPLE_IDS.has(String(id));

export function migrateLegacyData(read: (key: string) => string | null): AppData | null {
  const photos = readJsonArray(read, LEGACY_KEYS.photos);
  const tasks = readJsonArray(read, LEGACY_KEYS.tasks);
  const journal = readJsonArray(read, LEGACY_KEYS.journal);
  if (photos === null && tasks === null && journal === null) return null;

  const today = todayIso();

  return {
    schemaVersion: SCHEMA_VERSION,
    photos: (photos ?? [])
      .map(asLegacy)
      .map((p) =>
        toPhoto({
          id: p.id,
          room: LEGACY_ROOMS[String(p.room).toLowerCase()],
          title: p.title,
          description: p.desc,
          beforeUrl: p.before,
          afterUrl: p.after,
          date: normalizeDate(p.date) ?? today,
          sample: isSample(p.id),
        }),
      )
      .filter((p) => p !== null),
    tasks: (tasks ?? [])
      .map(asLegacy)
      .map((t) =>
        toTask({
          id: t.id,
          title: t.title,
          room: LEGACY_ROOMS[String(t.room).toLowerCase()],
          status: byLabel(TASK_STATUSES, t.status),
          priority: byLabel(PRIORITIES, t.priority),
          estimatedHours: t.estHours,
          loggedHours: t.actHours,
          notes: t.notes,
          sample: isSample(t.id),
        }),
      )
      .filter((t) => t !== null),
    journal: (journal ?? [])
      .map(asLegacy)
      .map((j) =>
        toJournalEntry({
          id: j.id,
          title: j.title,
          tag: byLabel(JOURNAL_TAGS, j.tag),
          content: j.content,
          date: normalizeDate(j.date) ?? today,
          sample: isSample(j.id),
        }),
      )
      .filter((j) => j !== null),
    activeTimer: null,
  };
}
