import type { AppData } from '../types';
import { todayIso } from '../utils/dates';
import { DataError, parseAppData, type ParseResult } from './validate';

export function serializeBackup(state: AppData): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function backupFilename(): string {
  return `324-howard-backup-${todayIso()}.json`;
}

export function downloadBackup(state: AppData): void {
  const blob = new Blob([serializeBackup(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: backupFilename(),
  });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DataError('That file is not valid JSON.');
  }
  return parseAppData(parsed);
}
