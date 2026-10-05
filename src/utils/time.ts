import type { IsoDate, WorkSession } from '../types';
import { isIsoDate, todayIso } from './dates';

/** Longest single entry accepted by hand. Longer stretches can be split across days. */
export const MAX_ENTRY_MINUTES = 24 * 60;

/** Hand-entered time has a date and a length, not clock times; it's stored as starting at 8:00. */
const MANUAL_START_HOUR = 8;

/** "2" + "30" -> 150. Blank fields count as zero. Returns null for anything unreadable. */
export function parseDuration(hours: string, minutes: string): number | null {
  const h = hours.trim() === '' ? 0 : Number(hours);
  const m = minutes.trim() === '' ? 0 : Number(minutes);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return null;
  return Math.round(h * 60 + m);
}

/** A problem with a hand entry, in plain words, or null if it's fine. */
export function validateManualEntry(
  date: string,
  minutes: number | null,
  today: IsoDate = todayIso(),
): string | null {
  if (!isIsoDate(date)) return 'Pick the date the work was done.';
  if (date > today) return "That date is in the future. Log time once it's done.";
  if (minutes === null) return 'Enter hours and minutes as numbers.';
  if (minutes <= 0) return 'Enter how long you worked.';
  if (minutes > MAX_ENTRY_MINUTES)
    return 'One entry can be at most 24 hours. Split longer work across days.';
  return null;
}

export function manualSession(
  date: IsoDate,
  minutes: number,
): { startedAt: string; endedAt: string } {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const start = new Date(y, m - 1, d, MANUAL_START_HOUR, 0, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return { startedAt: start.toISOString(), endedAt: end.toISOString() };
}

/** Length of a session in whole minutes; a running one counts up to `now`. */
export function sessionMinutes(session: WorkSession, now: number = Date.now()): number {
  const end = session.endedAt ? Date.parse(session.endedAt) : now;
  return Math.max(0, Math.round((end - Date.parse(session.startedAt)) / 60_000));
}

/** 150 -> "2h 30m", 45 -> "45m", 120 -> "2h". */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
