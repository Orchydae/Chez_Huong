import { describe, it, expect } from 'vitest';
import { formatDate, formatTotalTime } from './format';

const labels = { hours: 'h', minutes: 'min' };

describe('formatTotalTime', () => {
  it('shows minutes only when the total is under an hour', () => {
    expect(formatTotalTime(0, 'MINUTES', 45, 'MINUTES', labels)).toBe('45 min');
  });

  it('shows "0 min" when both times are zero', () => {
    expect(formatTotalTime(0, 'MINUTES', 0, 'MINUTES', labels)).toBe('0 min');
  });

  it('splits into hours and minutes at/over 60 minutes', () => {
    expect(formatTotalTime(20, 'MINUTES', 90, 'MINUTES', labels)).toBe('1h 50min');
  });

  it('drops the minutes segment on a whole number of hours', () => {
    expect(formatTotalTime(2, 'HOURS', 0, 'MINUTES', labels)).toBe('2h');
    expect(formatTotalTime(1, 'HOURS', 0, 'HOURS', labels)).toBe('1h');
  });

  it('converts HOURS to minutes before summing prep + cook', () => {
    expect(formatTotalTime(1, 'HOURS', 30, 'MINUTES', labels)).toBe('1h 30min');
    // 90 min prep + 1 h cook = 90 + 60 = 150 min = 2h 30min
    expect(formatTotalTime(90, 'MINUTES', 1, 'HOURS', labels)).toBe('2h 30min');
  });
});

describe('formatDate', () => {
  // Midday UTC so the rendered calendar date is stable regardless of the
  // runner's local timezone.
  const iso = '2026-06-10T12:00:00.000Z';

  it('formats a medium date in French (Québécois month name)', () => {
    const out = formatDate(iso, 'fr');
    expect(out).toMatch(/juin/);
    expect(out).toContain('10');
    expect(out).toContain('2026');
  });

  it('formats a medium date in English', () => {
    const out = formatDate(iso, 'en');
    expect(out).toMatch(/Jun/);
    expect(out).toContain('10');
    expect(out).toContain('2026');
  });

  it('produces a different string per locale', () => {
    expect(formatDate(iso, 'fr')).not.toBe(formatDate(iso, 'en'));
  });
});
