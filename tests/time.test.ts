import { describe, expect, it } from 'vitest';
import {
  formatMinutes,
  manualSession,
  parseDuration,
  sessionMinutes,
  validateManualEntry,
} from '../src/utils/time';

describe('hand-entered time', () => {
  it('reads hours and minutes, treating blanks as zero', () => {
    expect(parseDuration('2', '30')).toBe(150);
    expect(parseDuration('', '45')).toBe(45);
    expect(parseDuration('1.5', '')).toBe(90);
    expect(parseDuration('abc', '')).toBeNull();
    expect(parseDuration('-1', '')).toBeNull();
  });

  it('explains what is wrong with an entry', () => {
    const today = '2026-10-05';
    expect(validateManualEntry('2026-10-05', 90, today)).toBeNull();
    expect(validateManualEntry('', 90, today)).toMatch(/date/);
    expect(validateManualEntry('2026-10-06', 90, today)).toMatch(/future/);
    expect(validateManualEntry('2026-10-05', 0, today)).toMatch(/how long/);
    expect(validateManualEntry('2026-10-05', null, today)).toMatch(/numbers/);
    expect(validateManualEntry('2026-10-05', 25 * 60, today)).toMatch(/24 hours/);
  });

  it('stores an entry as a session of the right length on that day', () => {
    const { startedAt, endedAt } = manualSession('2026-10-05', 150);
    const start = new Date(startedAt);
    expect([start.getFullYear(), start.getMonth() + 1, start.getDate()]).toEqual([2026, 10, 5]);
    expect(Date.parse(endedAt) - Date.parse(startedAt)).toBe(150 * 60_000);
  });

  it('measures finished and running sessions', () => {
    const base = { id: 's', taskId: 't', note: '' };
    expect(
      sessionMinutes({
        ...base,
        startedAt: '2026-10-05T08:00:00Z',
        endedAt: '2026-10-05T10:30:00Z',
      }),
    ).toBe(150);
    expect(
      sessionMinutes(
        { ...base, startedAt: '2026-10-05T08:00:00Z', endedAt: null },
        Date.parse('2026-10-05T08:20:00Z'),
      ),
    ).toBe(20);
  });

  it('formats durations', () => {
    expect(formatMinutes(150)).toBe('2h 30m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
  });
});
