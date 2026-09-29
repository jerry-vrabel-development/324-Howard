import type { IsoDate } from '../types';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toIsoDate(d) === value;
}

/**
 * Accepts the mixed formats found in v1 data ("2026-03-12",
 * "September 15, 2026", "Sep 29, 2026") and returns YYYY-MM-DD, or null.
 */
export function normalizeDate(value: unknown): IsoDate | null {
  if (isIsoDate(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : toIsoDate(parsed);
}

/** "2026-09-15" -> "Sep 15, 2026". Parsed as a local date to avoid the UTC off-by-one. */
export function formatDate(iso: IsoDate): string {
  const m = ISO_DATE.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Newest first; ties keep their existing order. */
export function byDateDesc<T extends { date: IsoDate }>(a: T, b: T): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}
