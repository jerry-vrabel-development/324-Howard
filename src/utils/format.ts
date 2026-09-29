/** 6.5 -> "6.5h", 8 -> "8h", 0.3333 -> "0.33h" */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded}h`;
}

/** Milliseconds -> "HH:MM:SS". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
